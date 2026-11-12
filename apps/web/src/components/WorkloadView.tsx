'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Compass,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { AuthGuard } from './AuthGuard'
import { Badge, Button, Card } from './ui'

interface TeachingAssignmentDto {
  id?: string
  courseCode: string
  courseName: string
  classCode: string
  semester: number
  workloadType: string
  rawHours: number
  multiplier: number
  convertedHours: number
  studentCount: number
  studioLocation?: string
}

interface AcademicYearQuotaDto {
  academicYear: string
  employeeId: string
  employeeName: string
  employeeCode: string
  positionTitle: string
  baseTeachingQuota: number
  baseResearchQuota: number
  reductionPercentage: number
  reductionReason?: string | null
  effectiveTeachingQuota: number
  actualTeachingHours: number
  actualResearchHours: number
  overtimeHours: number
  status: string
  assignments?: TeachingAssignmentDto[]
}

interface WorkloadSettlementResponse {
  academicYear: string
  employeeId: string
  employeeName: string
  baseQuota: number
  reducedPercentage: number
  reducedHours: number
  effectiveQuota: number
  totalActualConvertedHours: number
  overtimeHours: number
  hourlyRate: number
  totalOvertimePay: number
  deficitHours: number
  settlementDate: string
  isSettled: boolean
}

function getAuthHeaders(includeJson = false): Record<string, string> {
  const headers: Record<string, string> = {}
  if (includeJson) headers['Content-Type'] = 'application/json'
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('bahau_session_id')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function WorkloadView() {
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [quotaData, setQuotaData] = useState<AcademicYearQuotaDto | null>(null)
  const [settlement, setSettlement] = useState<WorkloadSettlementResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [calcType, setCalcType] = useState('STUDIO_PROJECT')
  const [calcRaw, setCalcRaw] = useState(60)
  const [calcStudents, setCalcStudents] = useState(25)
  const [calcResult, setCalcResult] = useState<number | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)

  const fetchWorkload = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const headers = getAuthHeaders()
      const [quotaRes, settlementRes] = await Promise.all([
        fetch(`/api/v1/workload/my-quota?academicYear=${encodeURIComponent(academicYear)}`, {
          credentials: 'include',
          headers,
        }),
        fetch(`/api/v1/workload/settlement?academicYear=${encodeURIComponent(academicYear)}`, {
          credentials: 'include',
          headers,
        }),
      ])

      const quotaJson = await quotaRes.json().catch(() => null)
      const settlementJson = await settlementRes.json().catch(() => null)

      if (!quotaRes.ok || quotaJson?.success === false) {
        setQuotaData(null)
        setSettlement(null)
        setErrorMsg(
          quotaJson?.error?.message || `Không thể tải định mức giờ chuẩn (HTTP ${quotaRes.status}).`,
        )
        return
      }

      setQuotaData(quotaJson.data)
      if (settlementRes.ok && settlementJson?.success) {
        setSettlement(settlementJson.data)
      } else {
        setSettlement(null)
      }
    } catch (err) {
      setQuotaData(null)
      setSettlement(null)
      setErrorMsg(err instanceof Error ? err.message : 'Không thể kết nối máy chủ.')
    } finally {
      setLoading(false)
    }
  }, [academicYear])

  useEffect(() => {
    fetchWorkload()
  }, [fetchWorkload])

  const handleCalculate = async () => {
    setCalcLoading(true)
    setCalcError(null)
    try {
      const res = await fetch('/api/v1/workload/convert', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          workloadType: calcType,
          rawHours: calcRaw,
          studentCount: calcStudents,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.success === false || json?.data?.convertedHours === undefined) {
        setCalcResult(null)
        setCalcError(json?.error?.message || `Không thể tính giờ quy đổi (HTTP ${res.status}).`)
        return
      }
      setCalcResult(Number(json.data.convertedHours))
    } catch (err) {
      setCalcResult(null)
      setCalcError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ khi quy đổi giờ chuẩn.')
    } finally {
      setCalcLoading(false)
    }
  }

  const overtimeHours = settlement?.overtimeHours ?? quotaData?.overtimeHours ?? 0
  const totalOvertimePay = settlement?.totalOvertimePay ?? 0
  const hourlyRate = settlement?.hourlyRate ?? 0

  return (
    <AuthGuard moduleName="Định mức Giờ chuẩn & Đồ án Studio">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700 mb-2">
              <Compass size={13} /> Đặc thù Đào tạo Kiến trúc &amp; Xây dựng DAU
            </div>
            <h1 className="text-[26px] font-bold leading-tight text-ink">
              Định mức Giờ chuẩn Giảng dạy &amp; Đồ án Studio
            </h1>
            <p className="mt-1 text-[14px] text-muted">
              Quản lý hạn mức năm học, quy đổi xưởng thiết kế kiến trúc và quyết toán vượt giờ theo TT 20/2020/TT-BGDĐT.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted">Năm học:</span>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-brand-500"
            >
              <option value="2025-2026">2025–2026 (Hiện tại)</option>
              <option value="2024-2025">2024–2025</option>
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted">
            <Loader2 size={18} className="animate-spin text-brand-600" /> Đang tải định mức giờ chuẩn...
          </Card>
        ) : quotaData ? (
          <>
            {quotaData.reductionPercentage > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <div className="text-[13px] leading-relaxed">
                  <strong className="font-semibold">Miễn giảm kiêm nhiệm chức vụ: </strong>
                  {quotaData.reductionReason || 'Giảm trừ định mức'} ({quotaData.reductionPercentage}% định mức gốc{' '}
                  {quotaData.baseTeachingQuota}h &rarr; còn lại{' '}
                  <strong>{quotaData.effectiveTeachingQuota} giờ chuẩn/năm</strong>).
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-5">
                <div className="text-[13px] font-medium text-muted mb-2">Định mức gốc pháp định</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] font-bold leading-none text-ink">{quotaData.baseTeachingQuota}</span>
                  <span className="text-[13px] text-muted">giờ chuẩn/năm</span>
                </div>
                <p className="mt-2 text-[12px] text-slate-500">{quotaData.positionTitle}</p>
              </Card>

              <Card className="p-5">
                <div className="text-[13px] font-medium text-muted mb-2">Định mức sau miễn giảm</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] font-bold leading-none text-brand-600">
                    {quotaData.effectiveTeachingQuota}
                  </span>
                  <span className="text-[13px] text-muted">giờ chuẩn</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-600">
                  <span>Giảm trừ {quotaData.reductionPercentage}%</span>
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-[13px] font-medium text-muted mb-2">Giờ quy đổi tích lũy</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] font-bold leading-none text-emerald-600">
                    {quotaData.actualTeachingHours}
                  </span>
                  <span className="text-[13px] text-muted">/ {quotaData.effectiveTeachingQuota}h</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[12px] text-emerald-700 font-medium">
                  <CheckCircle2 size={13} />
                  <span>
                    {quotaData.actualTeachingHours >= quotaData.effectiveTeachingQuota
                      ? 'Đã đạt định mức năm'
                      : `Còn thiếu ${(quotaData.effectiveTeachingQuota - quotaData.actualTeachingHours).toFixed(1)}h`}
                  </span>
                </div>
              </Card>

              <Card className="p-5 bg-gradient-to-br from-brand-50/50 to-emerald-50/50 border-brand-200">
                <div className="text-[13px] font-medium text-brand-800 mb-2">Vượt định mức &amp; Thù lao</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] font-bold leading-none text-brand-600">+{overtimeHours}</span>
                  <span className="text-[13px] text-brand-700">giờ</span>
                </div>
                <div className="mt-2 text-[12px] font-semibold text-emerald-700">
                  ≈ {totalOvertimePay.toLocaleString('vi-VN')} VNĐ
                  {hourlyRate > 0 && ` (${hourlyRate.toLocaleString('vi-VN')}đ/h)`}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">Bảng phân công học phần &amp; Đồ án Studio</h3>
                  <p className="text-[13px] text-muted">Quy đổi hệ số theo xưởng thiết kế và đồ án tốt nghiệp KTS</p>
                </div>
                <Badge tone="success">Năm học {academicYear}</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="px-4 py-3">Mã HP</th>
                      <th className="px-4 py-3">Tên học phần / Đồ án</th>
                      <th className="px-4 py-3">Lớp &amp; Xưởng</th>
                      <th className="px-4 py-3">Loại hình</th>
                      <th className="px-4 py-3 text-right">Khối lượng</th>
                      <th className="px-4 py-3 text-right">Hệ số</th>
                      <th className="px-4 py-3 text-right font-bold text-brand-700">Giờ quy đổi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!quotaData.assignments || quotaData.assignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-muted">
                          Chưa có phân công giảng dạy nào được ghi nhận trong năm học {academicYear}.
                        </td>
                      </tr>
                    ) : (
                      quotaData.assignments.map((a, idx) => (
                        <tr key={a.id || idx} className="border-b border-line hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-600">{a.courseCode}</td>
                          <td className="px-4 py-3 font-medium text-ink">
                            {a.courseName}
                            {a.studioLocation && (
                              <span className="block text-[11px] text-muted">{a.studioLocation}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-slate-700">{a.classCode}</span>
                            <span className="block text-[11px] text-muted">{a.studentCount} sinh viên</span>
                          </td>
                          <td className="px-4 py-3">
                            {a.workloadType === 'STUDIO_PROJECT' ? (
                              <Badge tone="ochre">Studio xưởng vẽ</Badge>
                            ) : a.workloadType === 'GRADUATION_THESIS' ? (
                              <Badge tone="info">Đồ án TN KTS</Badge>
                            ) : a.workloadType === 'REVIEW_THESIS' ? (
                              <Badge tone="warning">Phản biện ĐATN</Badge>
                            ) : (
                              <Badge tone="neutral">Lý thuyết</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {a.workloadType === 'GRADUATION_THESIS' || a.workloadType === 'REVIEW_THESIS'
                              ? `${a.studentCount} SV`
                              : `${a.rawHours} tiết`}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            {a.workloadType === 'GRADUATION_THESIS' ? '18.0h/SV' : `x${a.multiplier}`}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-brand-600">
                            {Number(a.convertedHours).toFixed(1)}h
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : null}

        {/* Interactive Studio Hours Converter Tool */}
        <Card className="p-6 bg-slate-50 border-brand-200">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={18} className="text-brand-600" />
            <h3 className="text-[16px] font-semibold text-ink">
              Công cụ Quy đổi Nhanh Giờ chuẩn Kiến trúc (Quick Workload Calculator)
            </h3>
          </div>

          {calcError && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {calcError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-4 items-end">
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">Loại hình giảng dạy</label>
              <select
                value={calcType}
                onChange={(e) => setCalcType(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand-500"
              >
                <option value="STUDIO_PROJECT">Đồ án Kiến trúc / Nội thất (Xưởng x1.25)</option>
                <option value="GRADUATION_THESIS">Hướng dẫn ĐATN KTS (18h/SV)</option>
                <option value="REVIEW_THESIS">Chấm phản biện ĐATN KTS (1.5h/đồ án)</option>
                <option value="COUNCIL_MEMBER">Hội đồng chấm ĐATN (1.0h/đồ án)</option>
                <option value="THEORY">Lý thuyết tiêu chuẩn (x1.0)</option>
              </select>
            </div>

            {calcType === 'GRADUATION_THESIS' || calcType === 'REVIEW_THESIS' || calcType === 'COUNCIL_MEMBER' ? (
              <div>
                <label className="block text-[12px] font-medium text-slate-600 mb-1">Số lượng sinh viên / đồ án</label>
                <input
                  type="number"
                  value={calcStudents}
                  onChange={(e) => setCalcStudents(Number(e.target.value))}
                  min={1}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[12px] font-medium text-slate-600 mb-1">Số tiết giảng dạy</label>
                <input
                  type="number"
                  value={calcRaw}
                  onChange={(e) => setCalcRaw(Number(e.target.value))}
                  min={1}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div>
              <Button onClick={handleCalculate} className="w-full" disabled={calcLoading}>
                <Calculator size={15} /> {calcLoading ? 'Đang tính...' : 'Tính giờ quy đổi'}
              </Button>
            </div>

            <div className="rounded-lg bg-white border border-brand-200 p-2.5 text-center">
              <span className="block text-[11px] text-muted">Kết quả quy đổi:</span>
              <span className="text-[20px] font-bold text-brand-600">
                {calcResult !== null ? `${calcResult.toFixed(1)} giờ chuẩn` : '—'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </AuthGuard>
  )
}
