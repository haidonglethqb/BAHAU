'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  Loader2,
  QrCode,
  ScrollText,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { Badge, Button } from './ui'
import { useAuth } from '../context/AuthContext'

function getAuthHeaders(withJson = true): HeadersInit {
  const headers: Record<string, string> = {}
  if (withJson) headers['Content-Type'] = 'application/json'
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bahau_session_id')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function ExecutiveResolutionsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const role = user?.role || 'LECTURER'
  const isRector = role === 'RECTOR'

  const [candidates, setCandidates] = useState<any[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [candidatesError, setCandidatesError] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [resolution, setResolution] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoadingCandidates(true)
      setCandidatesError(null)
      try {
        const res = await fetch('/api/v1/executive/salary-increments', {
          method: 'GET',
          credentials: 'include',
          headers: getAuthHeaders(false),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || json?.success === false) {
          throw new Error(
            json?.error?.message ||
              `Không thể tải danh sách xét nâng bậc lương (HTTP ${res.status}).`
          )
        }
        setCandidates(Array.isArray(json?.data) ? json.data : [])
      } catch (e: any) {
        setCandidates([])
        setCandidatesError(e?.message || 'Lỗi kết nối khi tải danh sách đề xuất.')
      } finally {
        setLoadingCandidates(false)
      }
    }
    fetchCandidates()
  }, [])

  const handleGenerateResolution = async (candidate: any) => {
    setSelectedCandidate(candidate)
    setLoading(true)
    setExportError(null)
    try {
      const res = await fetch('/api/v1/executive/generate-resolution', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          type: 'SALARY_PROMOTION',
          recipientName: candidate.employeeName,
          recipientCode: candidate.employeeCode,
          unitName: candidate.unitName,
          contentTitle: `Nâng bậc lương từ bậc ${candidate.currentRank} (hệ số ${candidate.currentCoefficient}) lên bậc ${candidate.nextRank} (hệ số ${candidate.nextCoefficient})`,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.success === false || !json?.data) {
        throw new Error(
          json?.error?.message || `Không thể soạn thảo quyết định (HTTP ${res.status}).`
        )
      }
      setResolution(json.data)
    } catch (e: any) {
      setResolution(null)
      setExportError(e?.message || 'Có lỗi khi tạo dự thảo quyết định.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignResolution = async () => {
    if (!resolution) return
    if (!isRector) {
      setExportError('Chỉ Hiệu trưởng mới có thẩm quyền ký số PKI ban hành Quyết định.')
      return
    }
    setIsSigning(true)
    setExportError(null)
    try {
      const res = await fetch('/api/v1/executive/sign-resolution', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify(resolution),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.success === false || !json?.data) {
        throw new Error(
          json?.error?.message || `Ký số thất bại (HTTP ${res.status}).`
        )
      }
      setResolution(json.data)
    } catch (err: any) {
      setExportError(err?.message || 'Có lỗi xảy ra khi ký số PKI')
    } finally {
      setIsSigning(false)
    }
  }

  const handleExportPdf = async () => {
    if (!resolution) return
    setIsExporting(true)
    setExportError(null)
    try {
      let currentRes = resolution
      if (!currentRes.signature && isRector) {
        const signRes = await fetch('/api/v1/executive/sign-resolution', {
          method: 'POST',
          credentials: 'include',
          headers: getAuthHeaders(true),
          body: JSON.stringify(currentRes),
        })
        const signJson = await signRes.json().catch(() => null)
        if (!signRes.ok || signJson?.success === false || !signJson?.data) {
          throw new Error(
            signJson?.error?.message || `Không thể ký số trước khi xuất PDF (HTTP ${signRes.status}).`
          )
        }
        currentRes = signJson.data
        setResolution(currentRes)
      }

      const res = await fetch('/api/v1/executive/export-pdf', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify(currentRes),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.error?.message || `Không thể tạo file PDF (HTTP ${res.status}).`
        )
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cleanNum = (currentRes.resolutionNumber || 'QD').replace(/[\/\\]/g, '-')
      a.download = `Quyet-Dinh-${cleanNum}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setExportError(err?.message || 'Lỗi khi kết xuất file PDF')
    } finally {
      setIsExporting(false)
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

            {candidatesError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{candidatesError}</span>
              </div>
            ) : loadingCandidates ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted">
                <Loader2 size={16} className="animate-spin text-brand-600" />
                Đang tải danh sách cán bộ đủ điều kiện...
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-xl border border-line bg-slate-50 p-6 text-center text-xs text-muted">
                Chưa có cán bộ nào đến hạn hoặc đủ điều kiện xét nâng bậc lương trong kỳ này.
              </div>
            ) : (
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
            )}
          </div>

          {/* Generated Resolution Preview */}
          {resolution && (
            <div className="rounded-xl border border-brand-200 bg-slate-50/50 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-brand-600" />
                  <h4 className="text-[15px] font-bold text-ink">
                    Văn bản Quyết định Hành chính chuẩn Nghị định 30/2020/NĐ-CP
                  </h4>
                  {resolution.signature ? (
                    <Badge tone="success" className="ml-1">Đã ký số PKI</Badge>
                  ) : (
                    <Badge tone="ochre" className="ml-1">Dự thảo chưa ký</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copied ? 'Đã sao chép' : 'Sao chép'}
                  </Button>

                  {!resolution.signature ? (
                    isRector ? (
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-sm"
                        onClick={handleSignResolution}
                        disabled={isSigning}
                      >
                        {isSigning ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        {isSigning ? 'Đang ký số...' : 'Ký số Hiệu trưởng'}
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                        Chờ Hiệu trưởng ký số PKI
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                      <CheckCircle2 size={14} /> Chữ ký hợp lệ
                    </span>
                  )}

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleExportPdf}
                    disabled={isExporting}
                  >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {isExporting ? 'Đang kết xuất...' : 'Tải PDF Quyết định (NĐ 30)'}
                  </Button>
                </div>
              </div>

              {exportError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                  {exportError}
                </div>
              )}

              {/* Digital Seal Stamp & QR Verification Card */}
              {resolution.signature && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-red-200 bg-red-50/50 p-4">
                  {/* Institutional Seal Graphic */}
                  <div className="md:col-span-2 flex items-center gap-4">
                    <div className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-2 border-dashed border-red-600 bg-white p-2 text-center text-red-700 shadow-sm">
                      <div className="absolute inset-1 rounded-full border border-red-300 opacity-60 pointer-events-none"></div>
                      <span className="text-[7.5px] font-extrabold uppercase tracking-tighter">BỘ GIÁO DỤC & ĐÀO TẠO</span>
                      <span className="text-[8px] font-black uppercase text-red-600">ĐH KIẾN TRÚC ĐÀ NẴNG</span>
                      <span className="mt-0.5 rounded bg-red-600 px-1 py-0.5 text-[7px] font-bold text-white uppercase">ĐÃ KÝ SỐ</span>
                    </div>
                    <div className="space-y-1 text-[12px]">
                      <div className="flex items-center gap-1.5 font-bold text-red-700">
                        <ShieldCheck size={16} className="text-red-600" />
                        <span>Văn bản đã được ký số điện tử hợp lệ</span>
                      </div>
                      <div className="text-slate-600 space-y-0.5">
                        <p><span className="font-semibold text-slate-700">Người ký:</span> {resolution.signature.signerName} ({resolution.signature.signerPosition})</p>
                        <p><span className="font-semibold text-slate-700">Cơ quan:</span> {resolution.signature.organization}</p>
                        <p><span className="font-semibold text-slate-700">Thời gian:</span> {resolution.signature.signedAt}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          <span className="font-semibold">Serial:</span> {resolution.signature.certificateSerial} &bull; <span className="font-semibold">Thuật toán:</span> {resolution.signature.signatureAlgorithm}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Verification Preview */}
                  <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-red-200 pl-0 md:pl-4 pt-3 md:pt-0">
                    {resolution.qrCodeDataUrl ? (
                      <img
                        src={resolution.qrCodeDataUrl}
                        alt="QR Code Xác thực Quyết định"
                        className="h-20 w-20 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-300 bg-white">
                        <QrCode size={36} className="text-slate-400" />
                      </div>
                    )}
                    <a
                      href={`/verify/${encodeURIComponent(resolution.resolutionNumber)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800 hover:underline"
                    >
                      Tra cứu xác thực <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}

              {/* Resolution Box Styled Like Official Document */}
              <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-inner font-mono text-[12px] leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[360px] overflow-y-auto">
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
