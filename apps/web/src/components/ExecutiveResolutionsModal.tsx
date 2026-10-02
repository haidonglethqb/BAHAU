'use client'

import { useEffect, useState } from 'react'
import {
  Award,
  CheckCircle2,
  Copy,
  FileSignature,
  FileText,
  Loader2,
  ScrollText,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { Badge, Button, Card } from './ui'
import apiClient from '../services/api-client'

interface ExecutiveResolutionsModalProps {
  onClose: () => void
}

export function ExecutiveResolutionsModal({ onClose }: { onClose: () => void }) {
  const [candidates, setCandidates] = useState<any[]>([
    {
      employeeName: 'ThS. Nguyễn Văn An',
      employeeCode: 'DAU260003',
      unitName: 'Khoa Kiến trúc',
      currentRank: 5,
      currentCoefficient: 4.98,
      nextRank: 6,
      nextCoefficient: 5.31,
      monthsInCurrentRank: 36,
      recommendationType: 'REGULAR',
      recommendationReason: 'Đã đủ 36 tháng giữ bậc (yêu cầu ≥ 36 tháng) và hoàn thành tốt nhiệm vụ.',
      isEligible: true,
      recentKpiScores: [94.5, 92.0],
    },
    {
      employeeName: 'PGS.TS. Trần Thị Bình',
      employeeCode: 'DAU260001',
      unitName: 'Khoa Kiến trúc',
      currentRank: 6,
      currentCoefficient: 6.78,
      nextRank: 7,
      nextCoefficient: 7.2,
      monthsInCurrentRank: 24,
      recommendationType: 'EARLY',
      recommendationReason: 'Thành tích xuất sắc: 2 năm liên tục xếp loại KPI loại A, đề xuất nâng bậc trước thời hạn 12 tháng.',
      isEligible: true,
      recentKpiScores: [96.0, 95.5],
    },
  ])

  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [resolution, setResolution] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await apiClient.executive.getSalaryIncrementCandidates()
        if (res.ok && res.data && res.data.length > 0) {
          setCandidates(res.data)
        }
      } catch (e) {
        console.warn('[ExecutiveResolutions] Fallback to mock candidates', e)
      }
    }
    fetchCandidates()
  }, [])

  const handleGenerateResolution = async (candidate: any) => {
    setSelectedCandidate(candidate)
    setLoading(true)
    try {
      const res = await apiClient.executive.generateResolution({
        type: 'SALARY_PROMOTION',
        recipientName: candidate.employeeName,
        recipientCode: candidate.employeeCode,
        unitName: candidate.unitName,
        contentTitle: `Nâng bậc lương từ bậc ${candidate.currentRank} (hệ số ${candidate.currentCoefficient}) lên bậc ${candidate.nextRank} (hệ số ${candidate.nextCoefficient})`,
      })
      if (res.ok && res.data) {
        setResolution(res.data)
      } else {
        // Fallback Decree 30 resolution
        setResolution({
          resolutionNumber: '312/QĐ-ĐHKTĐN',
          signDate: `Đà Nẵng, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`,
          signAuthority: 'HIỆU TRƯỞNG',
          title: 'QUYẾT ĐỊNH\nVề việc nâng bậc lương đối với viên chức, người lao động',
          fullFormattedDocument: `BỘ GIÁO DỤC VÀ ĐÀO TẠO                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nTRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG              Độc lập - Tự do - Hạnh phúc\nSố: 312/QĐ-ĐHKTĐN                             Đà Nẵng, ngày 02 tháng 10 năm 2026\n\nQUYẾT ĐỊNH\nVề việc nâng bậc lương đối với viên chức, người lao động\n\nHIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG\n\nCăn cứ Luật Giáo dục đại học ngày 20 tháng 11 năm 2012 và Luật sửa đổi, bổ sung một số điều của Luật Giáo dục đại học ngày 19 tháng 11 năm 2018;\nCăn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;\nCăn cứ Quy chế Tổ chức và Hoạt động của Trường Đại học Kiến trúc Đà Nẵng;\nXét đề nghị của Trưởng phòng Tổ chức - Hành chính,\n\nQUYẾT ĐỊNH:\n\nĐiều 1. Nâng bậc lương đối với Ông/Bà ${candidate.employeeName} (Mã CBGV: ${candidate.employeeCode}), đơn vị ${candidate.unitName}: Từ bậc ${candidate.currentRank} (hệ số ${candidate.currentCoefficient}) lên bậc ${candidate.nextRank} (hệ số ${candidate.nextCoefficient}).\n\nĐiều 2. Thời gian được tính hưởng bậc lương mới kể từ ngày 01 tháng 09 năm 2026. Mốc thời gian tính nâng bậc lương lần sau được tính kể từ ngày hưởng bậc lương mới này.\n\nĐiều 3. Trưởng phòng Tổ chức - Hành chính, Trưởng phòng Kế hoạch - Tài chính và Ông/Bà ${candidate.employeeName} chịu trách nhiệm thi hành Quyết định này.\n\nNơi nhận:                                         HIỆU TRƯỞNG\n- Ban Giám hiệu (để báo cáo);\n- Phòng TCHC, Phòng KHTC;\n- ${candidate.unitName};\n- Đ/c ${candidate.employeeName};\n- Lưu: VT, TCHC.                                   GS.TS. Nguyễn Hiệu Trưởng`,
        })
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (resolution?.fullFormattedDocument) {
      navigator.clipboard.writeText(resolution.fullFormattedDocument)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200">
              <ScrollText size={20} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-ink">
                Tự động hóa Hành chính & AI Soạn thảo Quyết định (NĐ 30/2020/NĐ-CP)
              </h3>
              <p className="text-[12px] text-muted">
                Thẩm định nâng bậc lương tự động và kết xuất văn bản hành chính quy chuẩn nhà trường
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Candidates table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-bold text-ink flex items-center gap-2">
                <Users size={16} className="text-brand-600" />
                Danh sách Đề xuất Nâng bậc lương Tự động (Đợt 2/2026)
              </h4>
              <Badge tone="info">{candidates.length} cán bộ đủ điều kiện</Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 border-b border-line text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Đơn vị</th>
                    <th className="px-4 py-3">Bậc hiện tại</th>
                    <th className="px-4 py-3">Đề xuất nâng</th>
                    <th className="px-4 py-3">Hình thức</th>
                    <th className="px-4 py-3">Lý do & Tiêu chuẩn</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {candidates.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-ink">
                        {c.employeeName}
                        <span className="block font-mono text-[11px] text-muted">{c.employeeCode}</span>
                      </td>
                      <td className="px-4 py-3 text-muted">{c.unitName}</td>
                      <td className="px-4 py-3 font-mono">
                        Bậc {c.currentRank} ({c.currentCoefficient})
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                        &rarr; Bậc {c.nextRank} ({c.nextCoefficient})
                      </td>
                      <td className="px-4 py-3">
                        {c.recommendationType === 'EARLY' ? (
                          <Badge tone="ochre">Trước hạn (12T)</Badge>
                        ) : (
                          <Badge tone="success">Thường xuyên (36T)</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-600 max-w-xs">{c.recommendationReason}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateResolution(c)}
                          disabled={loading && selectedCandidate?.employeeCode === c.employeeCode}
                        >
                          <FileSignature size={14} /> Soạn Quyết định
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Generated Resolution Preview */}
          {resolution && (
            <div className="rounded-xl border border-brand-200 bg-slate-50/50 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-brand-600" />
                  <h4 className="text-[15px] font-bold text-ink">
                    Văn bản Quyết định Hành chính chuẩn Nghị định 30/2020/NĐ-CP
                  </h4>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copied ? 'Đã sao chép' : 'Sao chép văn bản'}
                  </Button>
                </div>
              </div>

              {/* Resolution Box Styled Like Official Document */}
              <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-inner font-mono text-[12px] leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[380px] overflow-y-auto">
                {resolution.fullFormattedDocument}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-line px-6 py-4 bg-slate-50">
          <Button onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </div>
  )
}
