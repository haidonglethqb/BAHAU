import { getMockPayrollData } from './payroll-mock'
/**
 * BAHAU Hybrid Data Adapter & API Client
 * Kết nối giữa Next.js UI và Backend API (Port 4000 hoặc same-origin rewrite /api/v1/*)
 */

import { EMPLOYEES, MY_REQUESTS, PENDING, type Employee, type LeaveRequest } from '../data'

const DEFAULT_SERVER_API_URL = 'http://127.0.0.1:4000'
const SESSION_KEY = 'bahau_session_id'

export const AUTH_UNAUTHORIZED_EVENT = 'bahau:unauthorized'

export interface ApiPagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  pagination?: ApiPagination
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId: string
    pagination?: ApiPagination
  }
}

export interface ApiRequestOptions extends RequestInit {
  _retried?: boolean
}

export interface ApiClientResult<T = any> {
  ok: boolean
  status: number
  data?: T
  error?: string
  pagination?: ApiPagination
  meta?: ApiResponse['meta']
}

function resolveBaseUrl(): string {
  const configured =
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL?.trim() : undefined
  if (configured) {
    return configured.replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined') {
    // Use same-origin relative /api/v1/* in browser so Next.js rewrites forward cookies cleanly
    return ''
  }
  return DEFAULT_SERVER_API_URL
}

class ApiClient {
  private baseUrl: string
  private isServerHealthy: boolean | null = null
  private lastHealthCheckTime = 0

  constructor() {
    this.baseUrl = resolveBaseUrl()
  }

  private getBaseUrl(): string {
    return resolveBaseUrl() || this.baseUrl
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

  private clearSessionOnUnauthorized(): void {
    this.setSessionId(null)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('bahau_auth_user')
      } catch {
        // ignore storage cleanup errors
      }
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT))
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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/health`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        cache: 'no-store',
      })

      this.isServerHealthy = res.ok
      this.lastHealthCheckTime = now
      return this.isServerHealthy
    } catch {
      this.isServerHealthy = false
      this.lastHealthCheckTime = now
      return false
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Thực hiện HTTP request có kèm session Bearer token và cookie credentials
   */
  public async request<T = any>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiClientResult<T>> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${this.getBaseUrl()}${normalizedPath}`
    const { _retried, ...fetchOptions } = options
    const headers = new Headers(fetchOptions.headers || {})

    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    const sessionId = this.getSessionId()
    if (sessionId && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${sessionId}`)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        signal: controller.signal,
      })

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
          pagination: json?.pagination ?? json?.meta?.pagination,
          meta: json?.meta,
        }
      }

      // Clear persisted session only on a real 401 (never on transient 5xx, and never recurse on /auth/login)
      if (
        response.status === 401 &&
        !_retried &&
        !normalizedPath.startsWith('/api/v1/auth/login')
      ) {
        this.clearSessionOnUnauthorized()
      }

      const errorMessage = json?.error?.message || json?.message || `HTTP ${response.status}`
      return {
        ok: false,
        status: response.status,
        error: errorMessage,
        pagination: json?.pagination ?? json?.meta?.pagination,
        meta: json?.meta,
      }
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        error: err?.message || 'Network request failed',
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // ===========================================================================
  // AUTH SERVICE
  // ===========================================================================
  public auth = {
    login: async (email: string, password: string) => {
      const res = await this.request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        _retried: true,
      })
      if (res.ok && res.data?.sessionId) {
        this.setSessionId(res.data.sessionId)
      }
      return res
    },

    logout: async () => {
      await this.request('/api/v1/auth/logout', { method: 'POST', _retried: true }).catch(() => {})
      this.setSessionId(null)
    },

    getMe: async () => {
      return await this.request('/api/v1/auth/me', { method: 'GET' })
    },
  }

  // ===========================================================================
  // ORGANIZATIONAL UNITS SERVICE
  // ===========================================================================
  public units = {
    getTree: async () => {
      return await this.request('/api/v1/units/tree', { method: 'GET' })
    },

    getAll: async () => {
      return await this.request('/api/v1/units', { method: 'GET' })
    },
  }

  // ===========================================================================
  // NOTIFICATIONS SERVICE
  // ===========================================================================
  public notifications = {
    getMy: async (limit = 30) => {
      return await this.request(`/api/v1/notifications/my?limit=${encodeURIComponent(String(limit))}`, {
        method: 'GET',
      })
    },

    markAsRead: async (id: string) => {
      return await this.request(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
      })
    },

    markAllAsRead: async () => {
      return await this.request('/api/v1/notifications/read-all', {
        method: 'POST',
      })
    },
  }

  // ===========================================================================
  // CONTRACTS SERVICE
  // ===========================================================================
  public contracts = {
    list: async (params?: {
      page?: number
      pageSize?: number
      search?: string
      status?: string
      contractType?: string
      unitId?: string
      expiringWithinDays?: number
    }) => {
      const q = new URLSearchParams()
      if (params?.page) q.set('page', String(params.page))
      if (params?.pageSize) q.set('pageSize', String(params.pageSize))
      if (params?.search) q.set('search', params.search)
      if (params?.status) q.set('status', params.status)
      if (params?.contractType) q.set('contractType', params.contractType)
      if (params?.unitId) q.set('unitId', params.unitId)
      if (params?.expiringWithinDays !== undefined) {
        q.set('expiringWithinDays', String(params.expiringWithinDays))
      }
      const queryStr = q.toString()
      const res = await this.request(`/api/v1/contracts${queryStr ? `?${queryStr}` : ''}`, {
        method: 'GET',
      })
      const items = Array.isArray(res.data) ? res.data : res.data?.items || []
      const pagination = res.pagination ?? res.meta?.pagination ?? null
      return {
        ...res,
        items,
        pagination,
      }
    },

    getContracts: async (params?: {
      page?: number
      pageSize?: number
      search?: string
      status?: string
      contractType?: string
      unitId?: string
      expiringWithinDays?: number
    }) => {
      return await this.contracts.list(params)
    },

    getAlertSummary: async () => {
      return await this.request('/api/v1/contracts/summary/alerts', { method: 'GET' })
    },

    getById: async (id: string) => {
      return await this.request(`/api/v1/contracts/${encodeURIComponent(id)}`, { method: 'GET' })
    },

    create: async (data: Record<string, any>) => {
      return await this.request('/api/v1/contracts', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    renew: async (id: string, data: Record<string, any>) => {
      return await this.request(`/api/v1/contracts/${encodeURIComponent(id)}/renew`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
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
      return await this.request(`/api/v1/leave/requests/${encodeURIComponent(id)}/cancel`, {
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
          substitute: 'Chưa chỉ định',
          substituteOk: true,
          status: 'submitted',
        }))
      }
      return PENDING
    },

    approveStep: async (stepId: string, comment = 'Đồng ý phê duyệt') => {
      return await this.request(`/api/v1/workflow/steps/${encodeURIComponent(stepId)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      })
    },

    rejectStep: async (stepId: string, reason: string) => {
      return await this.request(`/api/v1/workflow/steps/${encodeURIComponent(stepId)}/reject`, {
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
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.items) ? res.data.items : null
      if (res.ok && list) {
        return list.map((emp: any) => ({
          code: emp.employeeCode,
          name: emp.fullName,
          degree: emp.academicDegree || 'ThS',
          unit: emp.primaryUnitName || emp.assignments?.[0]?.unit?.name || 'Chưa phân đơn vị',
          position: emp.primaryPositionName || emp.assignments?.[0]?.position?.name || 'Cán bộ / Giảng viên',
          concurrent: emp.assignments?.find((a: any) => a.isHeadOfUnit)?.unit?.name
            ? `Kiêm Lãnh đạo ${emp.assignments?.find((a: any) => a.isHeadOfUnit)?.unit?.name}`
            : undefined,
          email: emp.workEmail || emp.user?.email || `${String(emp.employeeCode || '').toLowerCase()}@dau.edu.vn`,
          phone: emp.phoneNumber || '—',
          status:
            emp.employmentStatus === 'ACTIVE'
              ? 'active'
              : emp.employmentStatus === 'RESIGNED' || emp.employmentStatus === 'RETIRED'
              ? 'terminated'
              : 'leave',
        }))
      }
      return EMPLOYEES
    },

    getById: async (id: string) => {
      return await this.request(`/api/v1/employees/${encodeURIComponent(id)}`, { method: 'GET' })
    },

    getMyProfile: async () => {
      return await this.request('/api/v1/employees/me', { method: 'GET' })
    },

    updateMyContact: async (data: {
      phoneNumber?: string | null
      personalEmail?: string | null
      currentAddress?: string | null
    }) => {
      return await this.request('/api/v1/employees/me/contact', {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },

    getEvents: async (employeeId: string) => {
      return await this.request(`/api/v1/employees/${encodeURIComponent(employeeId)}/events`, {
        method: 'GET',
      })
    },
  }

  // ===========================================================================
  // TRỤC 1: ACADEMIC WORKLOAD & STUDIO SERVICE
  // ===========================================================================
  public workload = {
    getMyQuota: async (academicYear = '2025-2026') => {
      return await this.request(
        `/api/v1/workload/my-quota?academicYear=${encodeURIComponent(academicYear)}`,
        {
          method: 'GET',
        }
      )
    },

    getSettlement: async (academicYear = '2025-2026') => {
      return await this.request(
        `/api/v1/workload/settlement?academicYear=${encodeURIComponent(academicYear)}`,
        {
          method: 'GET',
        }
      )
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
      try {
        const res = await this.request(`/api/v1/payroll/my-payslip?month=${month}&year=${year}`, {
          method: 'GET',
        })
        if (res.ok && res.data) return res
      } catch {
        // fallback
      }
      const allMock = getMockPayrollData(month, year)
      const myItem = allMock.items.find((i) => i.employeeCode === 'DAU260003') || allMock.items[0]
      return { ok: true, status: 200, data: myItem }
    },

    getPeriodSummary: async (month = 9, year = 2026) => {
      try {
        const res = await this.request(`/api/v1/payroll/period-summary?month=${month}&year=${year}`, {
          method: 'GET',
        })
        if (res.ok && res.data) return res
      } catch {
        // fallback
      }
      const allMock = getMockPayrollData(month, year)
      return { ok: true, status: 200, data: allMock.period }
    },

    getPayrollTable: async (params?: { month?: number; year?: number; unitName?: string; search?: string }) => {
      const month = params?.month || 9
      const year = params?.year || 2026
      let query = `month=${month}&year=${year}`
      if (params?.unitName) query += `&unitName=${encodeURIComponent(params.unitName)}`
      if (params?.search) query += `&search=${encodeURIComponent(params.search)}`
      try {
        const res = await this.request(`/api/v1/payroll/table?${query}`, {
          method: 'GET',
        })
        if (res.ok && res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
          return res
        }
      } catch {
        // fallback
      }
      const fallback = getMockPayrollData(month, year, params?.unitName, params?.search)
      return {
        ok: true,
        status: 200,
        data: fallback,
      }
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
        const url = `${this.getBaseUrl()}/api/v1/payroll/payslip/${encodeURIComponent(employeeId)}/pdf?month=${month}&year=${year}`
        const headers = new Headers()
        const sessionId = this.getSessionId()
        if (sessionId) {
          headers.set('Authorization', `Bearer ${sessionId}`)
        }
        const res = await fetch(url, {
          method: 'GET',
          headers,
          credentials: 'include',
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
        const url = `${this.getBaseUrl()}/api/v1/executive/export-pdf`
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
          credentials: 'include',
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

  // ===========================================================================
  // PHASE 5: SYSTEM ADMINISTRATION, OBSERVABILITY & BACKGROUND WORKER QUEUE
  // ===========================================================================
  public system = {
    getHealth: async () => {
      return await this.request('/api/v1/health', { method: 'GET' })
    },

    getLiveness: async () => {
      return await this.request('/api/v1/health/liveness', { method: 'GET' })
    },

    getReadiness: async () => {
      return await this.request('/api/v1/health/readiness', { method: 'GET' })
    },

    getMetricsJson: async () => {
      return await this.request('/api/v1/metrics/json', { method: 'GET' })
    },

    getMetricsText: async (): Promise<string | null> => {
      try {
        const headers = new Headers()
        const sessionId = this.getSessionId()
        if (sessionId) {
          headers.set('Authorization', `Bearer ${sessionId}`)
        }
        const res = await fetch(`${this.getBaseUrl()}/api/v1/metrics`, {
          method: 'GET',
          headers,
          credentials: 'include',
        })
        if (!res.ok) return null
        return await res.text()
      } catch {
        return null
      }
    },

    getOutboxEvents: async (params?: {
      status?: string
      eventType?: string
      page?: number
      limit?: number
    }) => {
      const q = new URLSearchParams()
      if (params?.status && params.status !== 'ALL') q.set('status', params.status)
      if (params?.eventType) q.set('eventType', params.eventType)
      if (params?.page) q.set('page', String(params.page))
      if (params?.limit) q.set('limit', String(params.limit))
      const queryStr = q.toString()
      return await this.request(`/api/v1/outbox/events${queryStr ? `?${queryStr}` : ''}`, { method: 'GET' })
    },

    getOutboxEventById: async (id: string) => {
      return await this.request(`/api/v1/outbox/events/${encodeURIComponent(id)}`, { method: 'GET' })
    },

    retryOutboxEvent: async (id: string) => {
      return await this.request(`/api/v1/outbox/events/${encodeURIComponent(id)}/retry`, {
        method: 'POST',
      })
    },

    processOutboxBatch: async (limit = 10) => {
      return await this.request('/api/v1/outbox/process-batch', {
        method: 'POST',
        body: JSON.stringify({ limit }),
      })
    },

    getJobs: async (params?: {
      status?: string
      jobType?: string
      page?: number
      limit?: number
    }) => {
      const q = new URLSearchParams()
      if (params?.status && params.status !== 'ALL') q.set('status', params.status)
      if (params?.jobType) q.set('jobType', params.jobType)
      if (params?.page) q.set('page', String(params.page))
      if (params?.limit) q.set('limit', String(params.limit))
      const queryStr = q.toString()
      return await this.request(`/api/v1/jobs${queryStr ? `?${queryStr}` : ''}`, { method: 'GET' })
    },

    getJobById: async (id: string) => {
      return await this.request(`/api/v1/jobs/${encodeURIComponent(id)}`, { method: 'GET' })
    },

    enqueueJob: async (jobType: string, payload: Record<string, any> = {}, priority?: number) => {
      return await this.request('/api/v1/jobs/enqueue', {
        method: 'POST',
        body: JSON.stringify({ jobType, payload, priority }),
      })
    },

    cancelJob: async (id: string, reason?: string) => {
      return await this.request(`/api/v1/jobs/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    },

    retryJob: async (id: string) => {
      return await this.request(`/api/v1/jobs/${encodeURIComponent(id)}/retry`, {
        method: 'POST',
      })
    },

    getJobSummary: async () => {
      return await this.request('/api/v1/jobs/stats/summary', { method: 'GET' })
    },

    triggerOutboxPoll: async () => {
      return await this.request('/api/v1/jobs/trigger-outbox-poll', { method: 'POST' })
    },
  }
}

export const apiClient = new ApiClient()
export default apiClient
