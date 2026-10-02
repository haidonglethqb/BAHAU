'use client'

import { useEffect, useState } from 'react'
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Compass,
  FileCheck,
  GraduationCap,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Badge, Button, Card } from './ui'
import apiClient from '../services/api-client'

export function WorkloadView() {
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [quotaData, setQuotaData] = useState<any>({
    baseTeachingQuota: 270,
    reductionPercentage: 30,
    reductionReason: 'Miễn giảm 30% định mức do kiêm nhiệm Trưởng khoa',
    effectiveTeachingQuota: 189,
    actualTeachingHours: 264,
    actualResearchHours: 620,
    overtimeHours: 75,
    assignments: [
      {
        courseCode: 'KT201',
        courseName: 'Đồ án Kiến trúc Công trình 1 (Studio Xưởng)',
        classCode: '22KT1',
        semester: 1,
        workloadType: 'STUDIO_PROJECT',
        rawHours: 60,
        multiplier: 1.25,
        convertedHours: 75.0,
        studentCount: 28,
        studioLocation: 'Xưởng Thiết kế Tầng 4 - Khu A',
      },
      {
        courseCode: 'KT105',
        courseName: 'Nguyên lý Thiết kế Kiến trúc Nhà ở',
        classCode: '23KT2',
        semester: 1,
        workloadType: 'THEORY',
        rawHours: 45,
        multiplier: 1.0,
        convertedHours: 45.0,
        studentCount: 65,
        studioLocation: 'Phòng học A302',
      },
      {
        courseCode: 'KT500',
        courseName: 'Hướng dẫn Đồ án Tốt nghiệp KTS',
        classCode: '20KT_TN',
        semester: 2,
        workloadType: 'GRADUATION_THESIS',
        rawHours: 18,
        multiplier: 18.0,
        convertedHours: 90.0,
        studentCount: 5,
        studioLocation: 'Xưởng ĐATN Tầng 5',
      },
      {
        courseCode: 'KT501',
        courseName: 'Chấm Phản biện ĐATN KTS',
        classCode: '20KT_PB',
        semester: 2,
        workloadType: 'REVIEW_THESIS',
        rawHours: 1.5,
        multiplier: 1.5,
        convertedHours: 9.0,
        studentCount: 6,
      },
    ],
  })

  // Quick Calculator state
  const [calcType, setCalcType] = useState('STUDIO_PROJECT')
  const [calcRaw, setCalcRaw] = useState(60)
  const [calcStudents, setCalcStudents] = useState(25)
  const [calcResult, setCalcResult] = useState<number | null>(75.0)

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const res = await apiClient.workload.getMyQuota(academicYear)
        if (res.ok && res.data) {
          setQuotaData(res.data)
        }
      } catch (e) {
        console.warn('[WorkloadView] Fallback to mock', e)
      }
    }
    fetchQuota()
  }, [academicYear])

  const handleCalculate = async () => {
    try {
      const res = await apiClient.workload.convert({
        workloadType: calcType,
        rawHours: calcRaw,
        studentCount: calcStudents,
      })
      if (res.ok && res.data?.convertedHours !== undefined) {
        setCalcResult(res.data.convertedHours)
      } else {
        // Fallback calculation
        if (calcType === 'STUDIO_PROJECT') setCalcResult(Math.round(calcRaw * 1.25 * 10) / 10)
        else if (calcType === 'GRADUATION_THESIS') setCalcResult(calcStudents * 18.0)
        else if (calcType === 'REVIEW_THESIS') setCalcResult(calcStudents * 1.5)
        else setCalcResult(calcRaw * 1.0)
      }
    } catch {
      if (calcType === 'STUDIO_PROJECT') setCalcResult(calcRaw * 1.25)
      else if (calcType === 'GRADUATION_THESIS') setCalcResult(calcStudents * 18.0)
      else setCalcResult(calcRaw)
    }
  }

  const overtimeHourlyRate = 160000 // 160.000đ / giờ chuẩn
  const estimatedOvertimePay = (quotaData.overtimeHours || 0) * overtimeHourlyRate

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700 mb-2">
            <Compass size={13} /> Đặc thù Đào tạo Kiến trúc & Xây dựng DAU
          </div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">
            Định mức Giờ chuẩn Giảng dạy & Đồ án Studio
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

      {/* Leadership deduction banner */}
      {quotaData.reductionPercentage > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-[13px] leading-relaxed">
            <strong className="font-semibold">Miễn giảm kiêm nhiệm chức vụ: </strong>
            {quotaData.reductionReason} ({quotaData.reductionPercentage}% định mức gốc {quotaData.baseTeachingQuota}h &rarr;{' '}
            còn lại <strong>{quotaData.effectiveTeachingQuota} giờ chuẩn/năm</strong>).
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="text-[13px] font-medium text-muted mb-2">Định mức gốc pháp định</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] font-bold leading-none text-ink">{quotaData.baseTeachingQuota}</span>
            <span className="text-[13px] text-muted">giờ chuẩn/năm</span>
          </div>
          <p className="mt-2 text-[12px] text-slate-500">Giảng viên chuyên nghiệp</p>
        </Card>

        <Card className="p-5">
          <div className="text-[13px] font-medium text-muted mb-2">Định mức sau miễn giảm</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] font-bold leading-none text-brand-600">{quotaData.effectiveTeachingQuota}</span>
            <span className="text-[13px] text-muted">giờ chuẩn</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-600">
            <span>Giảm trừ {quotaData.reductionPercentage}% kiêm nhiệm</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[13px] font-medium text-muted mb-2">Giờ quy đổi tích lũy</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] font-bold leading-none text-emerald-600">{quotaData.actualTeachingHours}</span>
            <span className="text-[13px] text-muted">/ {quotaData.effectiveTeachingQuota}h</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[12px] text-emerald-700 font-medium">
            <CheckCircle2 size={13} /> Đã đạt 100% định mức năm
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-brand-50/50 to-emerald-50/50 border-brand-200">
          <div className="text-[13px] font-medium text-brand-800 mb-2">Vượt định mức & Thù lao</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] font-bold leading-none text-brand-600">+{quotaData.overtimeHours}</span>
            <span className="text-[13px] text-brand-700">giờ</span>
          </div>
          <div className="mt-2 text-[12px] font-semibold text-emerald-700">
            ≈ {estimatedOvertimePay.toLocaleString('vi-VN')} VNĐ
          </div>
        </Card>
      </div>

      {/* Assignments Table */}
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-ink">Bảng phân công học phần & Đồ án Studio</h3>
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
                <th className="px-4 py-3">Lớp & Xưởng</th>
                <th className="px-4 py-3">Loại hình</th>
                <th className="px-4 py-3 text-right">Khối lượng</th>
                <th className="px-4 py-3 text-right">Hệ số</th>
                <th className="px-4 py-3 text-right font-bold text-brand-700">Giờ quy đổi</th>
              </tr>
            </thead>
            <tbody>
              {quotaData.assignments?.map((a: any, idx: number) => (
                <tr key={idx} className="border-b border-line hover:bg-slate-50/70 transition-colors">
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Interactive Studio Hours Converter Tool */}
      <Card className="p-6 bg-slate-50 border-brand-200">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={18} className="text-brand-600" />
          <h3 className="text-[16px] font-semibold text-ink">
            Công cụ Quy đổi Nhanh Giờ chuẩn Kiến trúc (Quick Workload Calculator)
          </h3>
        </div>

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
            <Button onClick={handleCalculate} className="w-full">
              <Calculator size={15} /> Tính giờ quy đổi
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
  )
}
