'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  KeyRound,
  QrCode,
  ScanFace,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import {
  analyzeFrameLivenessAndDescriptor,
  averageDescriptors,
  captureVideoSnapshot,
  getDefaultEmployeePin,
  getKioskAuthHeaders,
  playKioskChime,
} from './kiosk-biometrics'

export interface KioskEnrollEmployee {
  id: string
  employeeCode: string
  fullName: string
  unitName: string
  positionName: string
  hasFaceEnrolled?: boolean
}

interface KioskEnrollModalProps {
  open: boolean
  employee: KioskEnrollEmployee | null
  existingStream?: MediaStream | null
  onClose: () => void
  onEnrolled: (employeeId: string, descriptor: number[]) => void
}

function buildQrMatrix(seed: string): boolean[][] {
  const size = 15
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const border = r === 0 || r === 4 || c === 0 || c === 4
        const center = r === 2 && c === 2
        grid[r0 + r][c0 + c] = border || center
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 5)
  drawFinder(size - 5, 0)

  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 6 && c < 6) || (r < 6 && c >= size - 6) || (r >= size - 6 && c < 6)
      if (inFinder) continue
      hash ^= r * 31 + c * 17
      hash = Math.imul(hash, 16777619)
      grid[r][c] = ((hash >>> 0) % 10) < 5
    }
  }

  return grid
}

export default function KioskEnrollModal({
  open,
  employee,
  existingStream,
  onClose,
  onEnrolled,
}: KioskEnrollModalProps) {
  const [activeTab, setActiveTab] = useState<'face' | 'qr'>('face')
  const [cameraReady, setCameraReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [captureStep, setCaptureStep] = useState(0)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [livenessOk, setLivenessOk] = useState(false)
  const [livenessHint, setLivenessHint] = useState('Đang kiểm tra khung hình camera...')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const ownStreamRef = useRef<MediaStream | null>(null)
  const prevSampleRef = useRef<Float32Array | null>(null)
  const isOpenRef = useRef<boolean>(open)
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    isOpenRef.current = open
    if (!open) {
      if (captureTimerRef.current) {
        clearTimeout(captureTimerRef.current)
        captureTimerRef.current = null
      }
      setActiveTab('face')
      setCapturing(false)
      setCaptureStep(0)
      setStatusMsg(null)
      setErrorMsg(null)
      setLivenessOk(false)
      setLivenessHint('Đang kiểm tra khung hình camera...')
      return
    }
  }, [open])

  useEffect(() => {
    return () => {
      isOpenRef.current = false
      if (captureTimerRef.current) {
        clearTimeout(captureTimerRef.current)
        captureTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!open || activeTab !== 'face') {
      if (ownStreamRef.current) {
        ownStreamRef.current.getTracks().forEach((t) => t.stop())
        ownStreamRef.current = null
      }
      setCameraReady(false)
      return
    }

    let cancelled = false

    async function attachCamera() {
      if (existingStream && existingStream.active) {
        if (videoRef.current) {
          videoRef.current.srcObject = existingStream
          await videoRef.current.play().catch(() => {})
        }
        if (!cancelled) setCameraReady(true)
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraReady(false)
          setLivenessHint('Trình duyệt không hỗ trợ truy cập camera.')
        }
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        ownStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setCameraReady(true)
      } catch {
        if (!cancelled) {
          setCameraReady(false)
          setLivenessHint('Không thể mở webcam. Vui lòng cấp quyền camera.')
        }
      }
    }

    attachCamera()

    return () => {
      cancelled = true
      if (ownStreamRef.current) {
        ownStreamRef.current.getTracks().forEach((t) => t.stop())
        ownStreamRef.current = null
      }
    }
  }, [open, activeTab, existingStream])

  useEffect(() => {
    if (!open || activeTab !== 'face' || !cameraReady) return
    const timer = setInterval(() => {
      const res = analyzeFrameLivenessAndDescriptor(videoRef.current, prevSampleRef.current)
      prevSampleRef.current = res.rawSample
      setLivenessOk(res.ok)
      setLivenessHint(
        res.ok
          ? '✓ Khuôn mặt rõ nét trong khung — sẵn sàng đăng ký'
          : res.reason || 'Vui lòng giữ mặt trong khung hình'
      )
    }, 350)
    return () => clearInterval(timer)
  }, [open, activeTab, cameraReady])

  if (!open || !employee) return null

  const defaultPin = getDefaultEmployeePin(employee.employeeCode)
  const qrMatrix = buildQrMatrix(`BAHAU:${employee.employeeCode}`)

  const handleEnrollFace = async () => {
    if (capturing || !videoRef.current) return
    setErrorMsg(null)
    setStatusMsg(null)
    setCapturing(true)
    setCaptureStep(0)

    try {
      const descriptors: number[][] = []
      let sampleImage: string | null = null

      for (let i = 1; i <= 3; i++) {
        if (!isOpenRef.current || !videoRef.current) return
        setCaptureStep(i)
        const analysis = analyzeFrameLivenessAndDescriptor(
          videoRef.current,
          prevSampleRef.current
        )
        prevSampleRef.current = analysis.rawSample

        if (!analysis.ok || analysis.descriptor.length !== 256) {
          throw new Error(
            analysis.reason || 'Không thể trích xuất đặc trưng khuôn mặt rõ nét.'
          )
        }
        descriptors.push(analysis.descriptor)
        if (i === 2) {
          sampleImage = captureVideoSnapshot(videoRef.current, 320, 0.72)
        }
        if (i < 3) {
          await new Promise<void>((resolve) => {
            captureTimerRef.current = setTimeout(() => {
              captureTimerRef.current = null
              resolve()
            }, 350)
          })
          if (!isOpenRef.current) return
        }
      }

      if (!isOpenRef.current) return
      if (!sampleImage && videoRef.current) {
        sampleImage = captureVideoSnapshot(videoRef.current, 320, 0.72)
      }

      const avgDescriptor = averageDescriptors(descriptors)
      if (avgDescriptor.length !== 256) {
        throw new Error('Không tổng hợp được vector khuôn mặt 256 chiều.')
      }

      const res = await fetch('/api/v1/attendance/kiosk-enroll', {
        method: 'POST',
        credentials: 'include',
        headers: getKioskAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          descriptor: avgDescriptor,
          sampleImage: sampleImage || undefined,
        }),
      })
      if (!isOpenRef.current) return
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error?.message || `Đăng ký khuôn mặt thất bại (HTTP ${res.status}).`
        )
      }

      playKioskChime('success')
      setStatusMsg(
        `Đã lưu mẫu khuôn mặt AI cho ${employee.fullName} (${employee.employeeCode}).`
      )
      onEnrolled(employee.id, avgDescriptor)
    } catch (err: unknown) {
      if (!isOpenRef.current) return
      playKioskChime('error')
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi đăng ký khuôn mặt.')
    } finally {
      if (isOpenRef.current) {
        setCapturing(false)
        setCaptureStep(0)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40">
              <ScanFace size={19} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Đăng Ký Sinh Trắc Học Kiosk
              </h3>
              <p className="text-[11px] text-slate-400">
                {employee.fullName} ·{' '}
                <span className="font-mono text-sky-300">{employee.employeeCode}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 border-b border-slate-800 bg-slate-950/60 p-2">
          <button
            type="button"
            onClick={() => setActiveTab('face')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'face'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera size={14} />
            <span>Đăng ký Khuôn mặt</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode size={14} />
            <span>Thẻ QR nhân sự</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 space-y-4">
          {activeTab === 'face' ? (
            <>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${
                    cameraReady ? 'opacity-95' : 'hidden'
                  }`}
                />
                {!cameraReady && (
                  <div className="text-center px-4 space-y-2">
                    <Camera size={36} className="mx-auto text-slate-500" />
                    <p className="text-xs text-slate-400">{livenessHint}</p>
                  </div>
                )}

                {/* Oval guide */}
                <div
                  className={`relative z-10 w-36 h-44 rounded-[45%] border-2 transition-colors ${
                    livenessOk
                      ? 'border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.4)]'
                      : 'border-amber-400/70'
                  }`}
                />

                {/* Liveness status badge */}
                <div
                  className={`absolute bottom-3 left-3 right-3 z-10 rounded-lg px-3 py-1.5 text-[11px] font-medium backdrop-blur flex items-center justify-center gap-1.5 ${
                    livenessOk
                      ? 'bg-emerald-950/85 border border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950/85 border border-slate-700 text-amber-300'
                  }`}
                >
                  {livenessOk ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
                  <span>
                    {capturing
                      ? `Đang chụp mẫu ${captureStep}/3 — giữ yên khuôn mặt...`
                      : livenessHint}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                  {errorMsg}
                </div>
              )}

              {statusMsg && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={!cameraReady || !livenessOk || capturing}
                  onClick={handleEnrollFace}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                    !cameraReady || !livenessOk || capturing
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>
                    {capturing
                      ? `Đang lấy mẫu (${captureStep}/3)...`
                      : 'Chụp 3 frame & Lưu Face ID'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="rounded-xl bg-white p-2.5 shrink-0">
                  <svg
                    viewBox="0 0 15 15"
                    className="w-28 h-28 text-slate-950"
                    shapeRendering="crispEdges"
                  >
                    {qrMatrix.map((row, r) =>
                      row.map((filled, c) =>
                        filled ? (
                          <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" />
                        ) : null
                      )
                    )}
                  </svg>
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    THẺ NHÂN SỰ KIOSK DAU
                  </span>
                  <h4 className="text-base font-extrabold text-white">{employee.fullName}</h4>
                  <p className="text-xs text-slate-400">
                    {employee.positionName} · {employee.unitName}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-mono text-sky-300">
                      Mã NV: {employee.employeeCode}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-mono text-amber-300">
                      <KeyRound size={12} /> PIN mặc định: {defaultPin}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
