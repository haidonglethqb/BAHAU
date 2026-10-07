/**
 * BAHAU Hybrid Data Adapter & API Client
 * Kết nối 2 chiều giữa Swiss UI và Backend API (Port 4000)
 * Tích hợp Zero-Crash Fallback: Nếu API Server tạm ngắt hoặc chưa kết nối DB, tự động fallback sang Mock Data an toàn.
 */

import { EMPLOYEES, MY_REQUESTS, PENDING, type Employee, type LeaveRequest } from '../data'

const DEFAULT_API_URL = 'http://127.0.0.1:4000'
const SESSION_KEY = 'bahau_session_id'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId: string
  }
}

class ApiClient {
  private baseUrl: string
  private isServerHealthy: boolean | null = null
  private lastHealthCheckTime = 0

  constructor() {
    this.baseUrl = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || DEFAULT_API_URL
  }

  public getSessionId(): string | null {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(SESSION_KEY)
    } catch {
      return null
    }
  }

  public setSessionId(sessionId: string | null): void {
    if (typeof window === 'undefined') return
    try {
      if (sessionId) {
        localStorage.setItem(SESSION_KEY, sessionId)
      } else {
        localStorage.removeItem(SESSION_KEY)
      }
    } catch (e) {
      console.warn('[ApiClient] Failed to access localStorage', e)
    }
  }

  /**
   * Kiểm tra nhanh trạng thái kết nối tới Backend API (cache 5s)
   */
  public async checkHealth(): Promise<boolean> {
    const now = Date.now()
    if (this.isServerHealthy !== null && now - this.lastHealthCheckTime < 5000) {
      return this.isServerHealthy
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)

      const res = await fetch(`${this.baseUrl}/api/v1/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timeoutId)

      this.isServerHealthy = res.ok
      this.lastHealthCheckTime = now
      return this.isServerHealthy
    } catch {
      this.isServerHealthy = false
      this.lastHealthCheckTime = now
      return false
    }
  }

  /**
   * Thực hiện HTTP request có kèm session Bearer token và cookie credentials
   */
  public async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    const headers = new Headers(options.headers || {})

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    const sessionId = this.getSessionId()
    if (sessionId && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${sessionId}`)
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      let json: any = null
      try {
        json = await response.json()
      } catch {
        json = null
      }

      if (response.ok && json?.success !== false) {
        return {
          ok: true,
          status: response.status,
          data: json?.data !== undefined ? json.data : json,
        }
      }

      const errorMessage = json?.error?.message || json?.message || `HTTP ${response.status}`
      return {
        ok: false,
        status: response.status,
        error: errorMessage,
      }
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        error: err?.message || 'Network request failed',
      }
    }
  }

  // ===========================================================================
  // AUTH SERVICE
  // ===========================================================================
  public auth = {
    login: async (email: string, password = 'Admin@123456') => {
      const res = await this.request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (res.ok && res.data?.sessionId) {
        this.setSessionId(res.data.sessionId)
      }
      return res
    },

    logout: async () => {
      await this.request('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
      this.setSessionId(null)
    },

    getMe: async () => {
      return await this.request('/api/v1/auth/me', { method: 'GET' })
    },
  }

  // ===========================================================================
  // LEAVE & TIME OFF SERVICE
  // ===========================================================================
  public leave = {
    getMyBalance: async () => {
      const res = await this.request('/api/v1/leave/balance/my', { method: 'GET' })
      if (res.ok && res.data) {
        return res.data
      }
      return {
        year: 2026,
        totalGranted: 12,
        carriedForward: 2.0,
        used: 1.5,
        pendingHold: 1.0,
        remaining: 10.5,
      }
    },

    getMyRequests: async (): Promise<LeaveRequest[]> => {
      const res = await this.request('/api/v1/leave/requests/my', { method: 'GET' })
      if (res.ok && Array.isArray(res.data)) {
        return res.data.map((r: any) => ({
          id: r.id,
          requester: r.employeeName || 'Cán bộ giảng viên',
          position: 'Giảng viên',
          unit: 'Khoa Kiến trúc',
          type: r.leaveType === 'ANNUAL' ? 'Nghỉ phép năm' : r.leaveType === 'SICK' ? 'Nghỉ ốm' : 'Nghỉ việc riêng',
          from: r.startDate,
          to: r.endDate,
          days: Number(r.totalDays),
          reason: r.reason || '',
          substitute: r.substituteEmployeeName || 'Chưa chỉ định',
          substituteOk: true,
          status:
            r.status === 'APPROVED'
              ? 'done'
              : r.status === 'REJECTED'
              ? 'rejected'
              : r.status === 'PENDING'
              ? 'approving'
              : 'submitted',
        }))
      }
      return MY_REQUESTS
    },

    createRequest: async (data: {
      leaveType: string
      startDate: string
      endDate: string
      totalDays: number
      reason: string
      substituteEmployeeId?: string | null
    }) => {
      return await this.request('/api/v1/leave/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    cancelRequest: async (id: string) => {
      return await this.request(`/api/v1/leave/requests/${id}/cancel`, {
        method: 'POST',
      })
    },
  }

  // ===========================================================================
  // WORKFLOW & APPROVALS SERVICE
  // ===========================================================================
  public workflow = {
    getPending: async (): Promise<LeaveRequest[]> => {
      const res = await this.request('/api/v1/workflow/pending', { method: 'GET' })
      if (res.ok && Array.isArray(res.data)) {
        return res.data.map((task: any) => ({
          id: task.stepId,
          requester: task.requesterName || 'CBGV Trường ĐH Kiến trúc',
          position: 'Giảng viên',
          unit: 'Khoa Kiến trúc',
          type: task.module === 'LEAVE' ? 'Nghỉ phép năm' : 'Đi công tác',
          from: new Date().toLocaleDateString('vi-VN'),
          to: new Date(Date.now() + 86400000 * 2).toLocaleDateString('vi-VN'),
          days: 2,
          reason: task.summary || 'Đơn trình phê duyệt công tác',
          substitute: 'ThS. Võ Hoàng Long',
          substituteOk: true,
          status: 'submitted',
        }))
      }
      return PENDING
    },

    approveStep: async (stepId: string, comment = 'Đồng ý phê duyệt') => {
      return await this.request(`/api/v1/workflow/steps/${stepId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      })
    },

    rejectStep: async (stepId: string, reason: string) => {
      return await this.request(`/api/v1/workflow/steps/${stepId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    },
  }

  // ===========================================================================
  // EMPLOYEES & DIRECTORY SERVICE
  // ===========================================================================
  public employees = {
    getAll: async (): Promise<Employee[]> => {
      const res = await this.request('/api/v1/employees', { method: 'GET' })
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.items) ? res.data.items : null)
      if (res.ok && list) {
        return list.map((emp: any) => ({
          code: emp.employeeCode,
          name: emp.fullName,
          degree: emp.academicDegree || 'ThS',
          unit: emp.assignments?.[0]?.unit?.name || 'Khoa Kiến trúc',
          position: emp.assignments?.[0]?.position?.name || 'Giảng viên',
          concurrent: emp.assignments?.find((a: any) => a.isHeadOfUnit)?.unit?.name
            ? `Kiêm Lãnh đạo ${emp.assignments?.find((a: any) => a.isHeadOfUnit)?.unit?.name}`
            : undefined,
          email: emp.workEmail || emp.user?.email || `${emp.employeeCode.toLowerCase()}@dau.edu.vn`,
          phone: emp.phoneNumber || '0905 000 000',
          status: emp.employmentStatus === 'ACTIVE' ? 'active' : 'leave',
        }))
      }
      return EMPLOYEES
    },

    getById: async (id: string) => {
      return await this.request(`/api/v1/employees/${id}`, { method: 'GET' })
    },
  }

  // ===========================================================================
  // TRỤC 1: ACADEMIC WORKLOAD & STUDIO SERVICE
  // ===========================================================================
  public workload = {
    getMyQuota: async (academicYear = '2025-2026') => {
      return await this.request(`/api/v1/workload/my-quota?academicYear=${academicYear}`, {
        method: 'GET',
      })
    },

    getSettlement: async (academicYear = '2025-2026') => {
      return await this.request(`/api/v1/workload/settlement?academicYear=${academicYear}`, {
        method: 'GET',
      })
    },

    convert: async (data: { workloadType: string; rawHours: number; studentCount?: number }) => {
      return await this.request('/api/v1/workload/convert', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
  }

  // ===========================================================================
  // TRỤC 3: PAYROLL & COMPENSATION SERVICE
  // ===========================================================================
  public payroll = {
    getMyPayslip: async (month = 9, year = 2026) => {
      return await this.request(`/api/v1/payroll/my-payslip?month=${month}&year=${year}`, {
        method: 'GET',
      })
    },

    getPeriodSummary: async (month = 9, year = 2026) => {
      return await this.request(`/api/v1/payroll/period-summary?month=${month}&year=${year}`, {
        method: 'GET',
      })
    },

    getPayrollTable: async (params?: { month?: number; year?: number; unitName?: string; search?: string }) => {
      const month = params?.month || 9
      const year = params?.year || 2026
      let query = `month=${month}&year=${year}`
      if (params?.unitName) query += `&unitName=${encodeURIComponent(params.unitName)}`
      if (params?.search) query += `&search=${encodeURIComponent(params.search)}`
      return await this.request(`/api/v1/payroll/table?${query}`, {
        method: 'GET',
      })
    },

    calculatePeriod: async (month = 9, year = 2026, recalculate = false) => {
      return await this.request('/api/v1/payroll/calculate', {
        method: 'POST',
        body: JSON.stringify({ month, year, recalculate }),
      })
    },

    submitPeriod: async (month = 9, year = 2026) => {
      return await this.request('/api/v1/payroll/submit', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      })
    },

    approvePeriod: async (month = 9, year = 2026, pkiSignature?: string) => {
      return await this.request('/api/v1/payroll/approve', {
        method: 'POST',
        body: JSON.stringify({ month, year, pkiSignature }),
      })
    },

    exportPayslipPdf: async (employeeId = 'my', month = 9, year = 2026): Promise<Blob | null> => {
      try {
        const url = `${this.baseUrl}/api/v1/payroll/payslip/${encodeURIComponent(employeeId)}/pdf?month=${month}&year=${year}`
        const headers = new Headers()
        const sessionId = this.getSessionId()
        if (sessionId) {
          headers.set('Authorization', `Bearer ${sessionId}`)
        }
        const res = await fetch(url, {
          method: 'GET',
          headers,
        })
        if (!res.ok) return null
        return await res.blob()
      } catch (e) {
        console.error('[ApiClient] Failed to export payslip PDF:', e)
        return null
      }
    },
  }

  // ===========================================================================
  // TRỤC 4: EXECUTIVE AUTOMATION & OFFICIAL RESOLUTIONS
  // ===========================================================================
  public executive = {
    getSalaryIncrementCandidates: async () => {
      return await this.request('/api/v1/executive/salary-increments', {
        method: 'GET',
      })
    },

    generateResolution: async (data: {
      type: 'BUSINESS_TRIP' | 'APPOINTMENT' | 'AWARD' | 'SALARY_PROMOTION'
      recipientName: string
      recipientCode: string
      unitName: string
      contentTitle: string
      details?: Record<string, any>
    }) => {
      return await this.request('/api/v1/executive/generate-resolution', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    signResolution: async (resolution: any) => {
      return await this.request('/api/v1/executive/sign-resolution', {
        method: 'POST',
        body: JSON.stringify(resolution),
      })
    },

    exportPdf: async (resolution: any): Promise<Blob | null> => {
      try {
        const url = `${this.baseUrl}/api/v1/executive/export-pdf`
        const headers = new Headers({
          'Content-Type': 'application/json',
        })
        const sessionId = this.getSessionId()
        if (sessionId) {
          headers.set('Authorization', `Bearer ${sessionId}`)
        }
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(resolution),
        })
        if (!res.ok) return null
        return await res.blob()
      } catch (e) {
        console.error('[ApiClient] Failed to export PDF:', e)
        return null
      }
    },

    verifyResolution: async (resolutionNumber: string) => {
      return await this.request(`/api/v1/executive/verify/${encodeURIComponent(resolutionNumber)}`, {
        method: 'GET',
      })
    },
  }
}

export const apiClient = new ApiClient()
export default apiClient
