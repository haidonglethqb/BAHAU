'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  Lock,
  Printer,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Stamp,
} from 'lucide-react'
import apiClient from '../../../services/api-client'

export default function DocumentVerificationPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.['id'] as string
  const resolutionNumber = rawId ? decodeURIComponent(rawId) : ''

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState(false)

  useEffect(() => {
    if (!resolutionNumber) {
      setLoading(false)
      setError('Thiếu mã định danh hoặc số hiệu văn bản cần tra cứu.')
      return
    }

    const verify = async () => {
      setLoading(true)
      try {
        const res = await apiClient.executive.verifyResolution(resolutionNumber)
        if (res.ok && res.data) {
          setData(res.data)
        } else {
          setError(res.error || 'Không tìm thấy thông tin văn bản hoặc văn bản chưa được phát hành.')
        }
      } catch (err: any) {
        setError(err?.message || 'Không thể kết nối đến máy chủ tra cứu văn thư điện tử.')
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [resolutionNumber])

  const handleCopyHash = () => {
    if (data?.documentHash) {
      navigator.clipboard.writeText(data.documentHash)
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2500)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white font-black tracking-wider text-sm shadow-sm">
              DAU
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Trường Đại học Kiến trúc Đà Nẵng
              </h1>
              <p className="text-xs text-slate-500">
                Hệ thống Quản trị & Xác thực Văn bản Điện tử (PKI Verification)
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} /> Trang chủ
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Loader2 size={36} className="animate-spin text-brand-600" />
            <p className="mt-4 text-sm font-medium text-slate-600">
              Đang xác thực tính toàn vẹn và chữ ký số văn bản...
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Đang đối soát giá trị băm mật mã học (SHA-256) và khóa công khai RSA
            </p>
          </div>
        ) : error || !data?.isValid ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <ShieldAlert size={28} />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-red-700">
                  Không thể xác thực văn bản điện tử
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {error || data?.message || 'Văn bản không tồn tại trên hệ thống hoặc đã bị chỉnh sửa, làm mất hiệu lực chữ ký số.'}
                </p>
                <div className="pt-2">
                  <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">
                    Số hiệu tra cứu: {resolutionNumber || 'Không xác định'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Integrity Status Card */}
            <div className="rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/60 to-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full mb-1">
                      <CheckCircle2 size={12} /> Hợp lệ 100% &bull; Toàn vẹn
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Văn bản điện tử được ký số chính thức
                    </h2>
                    <p className="text-xs text-slate-600">
                      Chứng thực điện tử tuân thủ Luật Giao dịch điện tử, NĐ 130/2018/NĐ-CP và NĐ 30/2020/NĐ-CP
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Printer size={14} /> In kết quả
                  </button>
                </div>
              </div>
            </div>

            {/* Document Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Document Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileCheck size={18} className="text-brand-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Thông tin văn bản ban hành
                  </h3>
                </div>

                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-slate-400 font-medium">Số hiệu Quyết định:</dt>
                    <dd className="mt-0.5 font-mono font-bold text-sm text-brand-700">
                      {data.resolutionNumber}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 font-medium">Trích yếu nội dung:</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800 leading-snug">
                      {data.title}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 font-medium">Cơ quan ban hành:</dt>
                    <dd className="mt-0.5 font-medium text-slate-700">
                      {data.organizationName}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 font-medium">Ngày ký ban hành:</dt>
                    <dd className="mt-0.5 text-slate-700 font-medium">
                      {data.signDate}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Box 2: PKI Cryptographic Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Lock size={18} className="text-red-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Chữ ký số & Dấu điện tử
                  </h3>
                </div>

                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-slate-400 font-medium">Chủ thể ký số:</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800">
                      {data.signerName} ({data.signerPosition})
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 font-medium">Số Serial Chứng thư số CA:</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-slate-700 bg-slate-50 rounded p-1 border border-slate-100">
                      {data.certificateSerial}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 font-medium">Thời gian ký (Timestamp):</dt>
                    <dd className="mt-0.5 font-mono text-slate-700">
                      {data.signedAt}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-400 font-medium">Mã băm toàn vẹn tài liệu (SHA-256 Digest):</dt>
                    <dd className="mt-1 flex items-center justify-between rounded bg-slate-50 p-1.5 font-mono text-[10px] text-slate-600 border border-slate-100">
                      <span className="truncate pr-2">{data.documentHash}</span>
                      <button
                        onClick={handleCopyHash}
                        title="Sao chép mã băm"
                        className="text-slate-400 hover:text-slate-700 shrink-0"
                      >
                        {copiedHash ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Legal Notice Footer */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500 shadow-sm">
              <p>
                Dữ liệu tra cứu được đối chiếu trực tiếp thời gian thực từ cơ sở dữ liệu văn thư điện tử của Trường Đại học Kiến trúc Đà Nẵng.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Địa chỉ: 566 Núi Thành, Phường Hòa Cường Nam, Quận Hải Châu, TP. Đà Nẵng &bull; Hotline: (0236) 3740 666
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
