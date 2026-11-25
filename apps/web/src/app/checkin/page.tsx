'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock,
  Fingerprint,
  LogIn,
  LogOut,
  RefreshCw,
  RotateCcw,
  Scan,
  ShieldCheck,
  UserCheck,
  Users,
  AlertCircle,
} from 'lucide-react'

interface KioskEmployee {
  id: string
  employeeCode: string
  fullName: string
  unitName: string
  positionName: string
  today: {
    workDate: string
    checkInTime: string | null
    checkOutTime: string | null
    rawWorkingHours: number
    status: string
    deviceSource: string | null
  } | null
  monthlyWorkingDays: number
  standardDays: number
}

interface PunchLogItem {
  id: string
  time: string
  employeeName: string
  employeeCode: string
  mode: 'checkin' | 'checkout'
  method: 'FACE_ID' | 'FINGERPRINT'
  statusText: string
}

const FALLBACK_KIOSK_EMPLOYEES: KioskEmployee[] = [
  {
    id: 'emp-1',
    employeeCode: 'DAU240001',
    fullName: 'ThS. Nguyễn Văn An',
    unitName: 'Khoa Kiến trúc',
    positionName: 'Giảng viên / Nhân sự',
    today: null,
    monthlyWorkingDays: 21,
    standardDays: 22,
  },
  {
    id: 'emp-2',
    employeeCode: 'DAU200001',
    fullName: 'PGS.TS. Trần Thị Bình',
    unitName: 'Khoa Kiến trúc',
    positionName: 'Trưởng khoa Kiến trúc',
    today: null,
    monthlyWorkingDays: 22,
    standardDays: 22,
  },
  {
    id: 'emp-3',
    employeeCode: 'DAU230001',
    fullName: 'Lê Thị Nhân Sự',
    unitName: 'Phòng Tổ chức - Hành chính',
    positionName: 'Quản lý Nhân sự - Tiền lương',
    today: null,
    monthlyWorkingDays: 22,
    standardDays: 22,
  },
  {
    id: 'emp-4',
    employeeCode: 'DAU150001',
    fullName: 'GS.TS. Hoàng Đức Dũng',
    unitName: 'Ban Giám hiệu',
    positionName: 'Hiệu trưởng',
    today: null,
    monthlyWorkingDays: 22,
    standardDays: 22,
  },
]

function formatVnTime(iso?: string | null): string {
  if (!iso) return '—:—'
  return new Date(iso).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const isDevMode = process.env.NODE_ENV !== 'production'

export default function StandaloneCheckInKioskPage() {
  const [employees, setEmployees] = useState<KioskEmployee[]>(FALLBACK_KIOSK_EMPLOYEES)
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  const [biometricMethod, setBiometricMethod] = useState<'FACE_ID' | 'FINGERPRINT'>('FACE_ID')
  const [clockStr, setClockStr] = useState<string>('')
  const [dateStr, setDateStr] = useState<string>('')
  const [scanning, setScanning] = useState<'checkin' | 'checkout' | null>(null)
  const [scanProgress, setScanProgress] = useState<number>(0)
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [logs, setLogs] = useState<PunchLogItem[]>([])
  const [bannerResult, setBannerResult] = useState<{
    type: 'success' | 'error'
    title: string
    subtitle: string
    timestamp: string
    methodLabel: string
  } | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Live Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClockStr(
        now.toLocaleTimeString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
      setDateStr(
        now.toLocaleDateString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch employees & today's attendance status from Backend API
  const fetchKioskStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/attendance/kiosk-status', { cache: 'no-store' })
      const json = await res.json().catch(() => null)
      if (res.ok && Array.isArray(json?.data?.employees) && json.data.employees.length > 0) {
        setEmployees(json.data.employees)
        setSelectedEmpId((prev) => prev || json.data.employees[0].id)
      } else {
        setSelectedEmpId((prev) => prev || FALLBACK_KIOSK_EMPLOYEES[0].id)
      }
    } catch {
      setSelectedEmpId((prev) => prev || FALLBACK_KIOSK_EMPLOYEES[0].id)
    }
  }, [])

  useEffect(() => {
    fetchKioskStatus()
  }, [fetchKioskStatus])

  // Start / Stop Webcam when Face ID mode is selected
  useEffect(() => {
    let active = true
    async function startWebcam() {
      if (biometricMethod !== 'FACE_ID') {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
        setCameraActive(false)
        return
      }
      try {
        if (!navigator.mediaDevices?.getUserMedia) return
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        })
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setCameraActive(true)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      } catch {
        setCameraActive(false)
      }
    }
    startWebcam()
    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [biometricMethod])

  const selectedEmployee =
    employees.find((e) => e.id === selectedEmpId) || employees[0] || FALLBACK_KIOSK_EMPLOYEES[0]

  const hasCheckedIn = Boolean(selectedEmployee?.today?.checkInTime)
  const hasCheckedOut = Boolean(selectedEmployee?.today?.checkOutTime)

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(660, ctx.currentTime)
      osc.frequency.setValueAtTime(980, ctx.currentTime + 0.09)
      gain.gain.setValueAtTime(0.14, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } catch {
      // ignore audio restriction
    }
  }

  const executeBiometricPunch = async (mode: 'checkin' | 'checkout') => {
    if (scanning || !selectedEmployee) return
    setScanning(mode)
    setBannerResult(null)
    setScanProgress(0)

    // Smooth biometric scan animation (0 -> 100%)
    await new Promise<void>((resolve) => {
      let p = 0
      const interval = setInterval(() => {
        p += 20
        setScanProgress(Math.min(100, p))
        if (p >= 100) {
          clearInterval(interval)
          resolve()
        }
      }, 140)
    })

    playBeep()

    const nowIso = new Date().toISOString()
    const timeLabel = formatVnTime(nowIso)
    const methodLabel =
      biometricMethod === 'FACE_ID' ? 'Nhận diện Khuôn mặt AI (Face ID)' : 'Quét Vân tay Quang học (Fingerprint)'

    try {
      const res = await fetch('/api/v1/attendance/kiosk-punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          employeeCode: selectedEmployee.employeeCode,
          mode,
          biometricMethod,
        }),
      })
      const json = await res.json().catch(() => null)

      if (res.ok && json?.success !== false) {
        await fetchKioskStatus()
        const rec = json.data
        const recordedTime =
          mode === 'checkin'
            ? formatVnTime(rec?.checkInTime || nowIso)
            : formatVnTime(rec?.checkOutTime || nowIso)

        setBannerResult({
          type: 'success',
          title:
            mode === 'checkin'
              ? `CHECK-IN THÀNH CÔNG — ${selectedEmployee.fullName}`
              : `CHECK-OUT THÀNH CÔNG — ${selectedEmployee.fullName}`,
          subtitle:
            mode === 'checkin'
              ? `Đã ghi nhận giờ vào ca (${recordedTime}). Dữ liệu công đã đồng bộ sang Bảng lương.`
              : `Đã ghi nhận giờ tan ca (${recordedTime}) · Tổng giờ làm hôm nay: ${
                  rec?.rawWorkingHours ?? 8
                } giờ.`,
          timestamp: recordedTime,
          methodLabel,
        })

        setLogs((prev) => [
          {
            id: `${Date.now()}`,
            time: recordedTime,
            employeeName: selectedEmployee.fullName,
            employeeCode: selectedEmployee.employeeCode,
            mode,
            method: biometricMethod,
            statusText: mode === 'checkin' ? 'Đã vào ca' : 'Đã hoàn thành ca',
          },
          ...prev.slice(0, 9),
        ])
      } else {
        const errorTitle =
          res.status === 422
            ? mode === 'checkout'
              ? 'Chưa thể thực hiện Check-out'
              : 'Dữ liệu chấm công không hợp lệ'
            : res.status === 409
            ? 'Kỳ chấm công đã khóa'
            : res.status === 401 || res.status === 403
            ? 'Không có quyền thực hiện chấm công'
            : mode === 'checkin'
            ? 'Check-in thất bại'
            : 'Check-out thất bại'

        setBannerResult({
          type: 'error',
          title: errorTitle,
          subtitle:
            json?.error?.message ||
            (res.status === 422
              ? 'Nhân sự chưa thực hiện Check-in trong ngày hôm nay.'
              : `Máy chủ từ chối yêu cầu chấm công (HTTP ${res.status}).`),
          timestamp: timeLabel,
          methodLabel,
        })
      }
    } catch {
      setBannerResult({
        type: 'error',
        title: 'Lỗi kết nối máy chủ chấm công',
        subtitle: 'Vui lòng kiểm tra lại kết nối Backend API.',
        timestamp: timeLabel,
        methodLabel,
      })
    } finally {
      setScanning(null)
      setScanProgress(0)
    }
  }

  const handleResetToday = async () => {
    if (!selectedEmployee) return
    const timeLabel = formatVnTime(new Date().toISOString())
    const methodLabel =
      biometricMethod === 'FACE_ID'
        ? 'Nhận diện Khuôn mặt AI (Face ID)'
        : 'Quét Vân tay Quang học (Fingerprint)'
    try {
      const res = await fetch('/api/v1/attendance/kiosk-punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          employeeCode: selectedEmployee.employeeCode,
          mode: 'reset',
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.success === false) {
        setBannerResult({
          type: 'error',
          title: 'Reset bản ghi chấm công thất bại',
          subtitle:
            json?.error?.message || 'Không thể reset bản ghi chấm công hôm nay.',
          timestamp: timeLabel,
          methodLabel,
        })
        return
      }
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === selectedEmployee.id ? { ...emp, today: null } : emp))
      )
      setBannerResult(null)
      await fetchKioskStatus()
    } catch {
      setBannerResult({
        type: 'error',
        title: 'Reset bản ghi chấm công thất bại',
        subtitle: 'Không thể reset bản ghi chấm công hôm nay.',
        timestamp: timeLabel,
        methodLabel,
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none">
      {/* =====================================================================
          TOP KIOSK TERMINAL HEADER (STANDALONE — NO ADMIN SIDEBAR)
      ===================================================================== */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20">
            <Scan size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                TRẠM CHẤM CÔNG SINH TRẮC HỌC (CHECK-IN / CHECK-OUT KIOSK)
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                ONLINE · TERMINAL #01
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Giao diện Máy chấm công độc lập tại Sảnh chính — Tự động đồng bộ số lần chấm công sang Bảng lương
            </p>
          </div>
        </div>

        {/* Navigation Links back to Management / Login */}
        <div className="flex items-center gap-2">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
          >
            <CalendarCheck size={14} className="text-sky-400" />
            <span>Bảng Chấm Công</span>
          </Link>
          <Link
            href="/payroll"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition"
          >
            <Banknote size={14} />
            <span>Xem Bảng Lương</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3.5 py-2 text-xs font-bold text-slate-950 transition"
          >
            <ArrowLeft size={14} />
            <span>Cổng Đăng Nhập</span>
          </Link>
        </div>
      </header>

      {/* =====================================================================
          MAIN KIOSK WORKSPACE (2 COLUMNS)
      ===================================================================== */}
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 COLS): BIOMETRIC SCANNER VIEWPORT (FACE ID & FINGERPRINT) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Live Digital Clock & Biometric Method Switcher */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                THỜI GIAN THỰC HỆ THỐNG (GMT+7)
              </div>
              <div className="font-mono text-3xl sm:text-4xl font-black tracking-wider text-white mt-0.5">
                {clockStr || '08:00:00'}
              </div>
              <div className="text-xs text-slate-400 capitalize mt-0.5">{dateStr}</div>
            </div>

            {/* Switcher: Face ID vs Fingerprint */}
            <div className="flex rounded-xl bg-slate-950 p-1.5 border border-slate-800">
              <button
                type="button"
                onClick={() => setBiometricMethod('FACE_ID')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  biometricMethod === 'FACE_ID'
                    ? 'bg-sky-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera size={15} />
                <span>Nhận diện Khuôn mặt</span>
              </button>
              <button
                type="button"
                onClick={() => setBiometricMethod('FINGERPRINT')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  biometricMethod === 'FINGERPRINT'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Fingerprint size={15} />
                <span>Quét Vân tay</span>
              </button>
            </div>
          </div>

          {/* BIOMETRIC SENSOR VIEWPORT */}
          <div className="relative rounded-2xl border-2 border-slate-800 bg-slate-900 overflow-hidden aspect-video flex flex-col items-center justify-center shadow-2xl">
            {biometricMethod === 'FACE_ID' ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${
                    cameraActive ? 'opacity-90' : 'hidden'
                  }`}
                />
                {!cameraActive && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at center, rgba(14,165,233,0.16) 0%, rgba(9,13,22,0.98) 75%), linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)',
                      backgroundSize: '100% 100%, 32px 32px, 32px 32px',
                    }}
                  />
                )}

                {/* Face Targeting Frame */}
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div
                    className={`relative w-52 h-64 sm:w-60 sm:h-72 rounded-[45%] border-2 transition-all duration-300 flex items-center justify-center ${
                      scanning
                        ? 'border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)]'
                        : 'border-sky-400/80 shadow-[0_0_25px_rgba(56,189,248,0.25)]'
                    }`}
                  >
                    {/* Face silhouette icon when webcam is not active */}
                    {!cameraActive && (
                      <div className="text-center space-y-2 px-4">
                        <Scan
                          size={56}
                          className={`mx-auto ${
                            scanning ? 'text-emerald-400 animate-pulse' : 'text-sky-400/80'
                          }`}
                        />
                        <p className="font-mono text-[11px] text-sky-300 font-bold">
                          AI FACE RECOGNITION HUD
                        </p>
                        <p className="text-xs text-slate-300 font-semibold">
                          {selectedEmployee?.fullName}
                        </p>
                      </div>
                    )}

                    {/* Laser Scan Line */}
                    <div
                      className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e]"
                      style={{
                        top: scanning ? `${scanProgress}%` : '50%',
                        transition: 'top 120ms linear',
                      }}
                    />
                  </div>

                  <div className="mt-4 rounded-full bg-slate-950/90 border border-slate-700 px-4 py-1.5 text-xs font-mono text-sky-300 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>
                      {scanning
                        ? `Đang phân tích sinh trắc khuôn mặt... ${scanProgress}%`
                        : `Sẵn sàng nhận diện: ${selectedEmployee?.fullName} (${selectedEmployee?.employeeCode})`}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* FINGERPRINT OPTICAL SCANNER MODE */
              <div
                className=" inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at center, rgba(16,185,129,0.16) 0%, rgba(9,13,22,0.98) 75%)',
                }}
              >
                <div
                  className={`relative flex h-44 w-44 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                    scanning
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.6)] scale-105'
                      : 'border-emerald-500/50 bg-slate-950/80 hover:border-emerald-400'
                  }`}
                >
                  <Fingerprint
                    size={96}
                    className={
                      scanning ? 'text-emerald-300 animate-pulse' : 'text-emerald-400'
                    }
                  />
                </div>
                <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                  CẢM BIẾN VÂN TAY QUANG HỌC BIO-OPTIC 500DPI
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {scanning
                    ? `Đang quét đường vân tay của ${selectedEmployee?.fullName}... (${scanProgress}%)`
                    : `Đặt ngón tay hoặc bấm nút Check-in / Check-out bên dưới cho ${selectedEmployee?.fullName}`}
                </p>
              </div>
            )}
          </div>

          {/* RESULT FEEDBACK BANNER */}
          {bannerResult && (
            <div
              className={`rounded-2xl border p-4 flex items-start gap-3.5 ${
                bannerResult.type === 'success'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/50 bg-rose-500/10 text-rose-200'
              }`}
            >
              {bannerResult.type === 'success' ? (
                <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={24} className="text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-white">{bannerResult.title}</h4>
                  <span className="font-mono text-[11px] rounded bg-slate-900 px-2 py-0.5 text-sky-300 border border-slate-700">
                    {bannerResult.timestamp} · {bannerResult.methodLabel}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{bannerResult.subtitle}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 COLS): EMPLOYEE SELECTOR, CHECK-IN/OUT BUTTONS & LIVE FEED */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Employee Selection & Shift Action Panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  1. Chọn Nhân Sự Chấm Công Tại Trạm Kiosk
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchKioskStatus}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} /> Làm mới
              </button>
            </div>

            {/* Employee Selector List */}
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {employees.map((emp) => {
                const isSelected = emp.id === selectedEmployee?.id
                const empIn = Boolean(emp.today?.checkInTime)
                const empOut = Boolean(emp.today?.checkOutTime)
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setSelectedEmpId(emp.id)
                      setBannerResult(null)
                    }}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 bg-sky-500/15 shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{emp.fullName}</span>
                        <span className="font-mono text-[10px] rounded bg-slate-800 px-1.5 py-0.5 text-sky-300">
                          {emp.employeeCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {emp.unitName} · Công tháng: <strong className="text-emerald-400">{emp.monthlyWorkingDays}/{emp.standardDays} ngày</strong>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {empOut ? (
                        <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          ✓ Đã đủ In/Out
                        </span>
                      ) : empIn ? (
                        <span className="inline-block rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          Đang trong ca
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          Chưa Check-in
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Selected Employee Today Shift Card */}
            {selectedEmployee && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      NHÂN SỰ ĐANG CHỌN
                    </span>
                    <h4 className="text-sm font-bold text-white">{selectedEmployee.fullName}</h4>
                  </div>
                  {isDevMode && hasCheckedIn && (
                    <button
                      type="button"
                      onClick={handleResetToday}
                      title="Xóa bản ghi hôm nay để Demo lại từ đầu"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 cursor-pointer"
                    >
                      <RotateCcw size={11} /> Reset ca hôm nay (Demo)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                    <span className="text-[10px] text-slate-400 block">Giờ vào ca (Check-in)</span>
                    <span className="font-mono text-sm font-bold text-emerald-400 mt-0.5 block">
                      {formatVnTime(selectedEmployee.today?.checkInTime)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                    <span className="text-[10px] text-slate-400 block">Giờ tan ca (Check-out)</span>
                    <span className="font-mono text-sm font-bold text-sky-400 mt-0.5 block">
                      {formatVnTime(selectedEmployee.today?.checkOutTime)}
                    </span>
                  </div>
                </div>

                {/* TWO BIG CHECK-IN / CHECK-OUT BUTTONS */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={Boolean(scanning) || hasCheckedIn}
                    onClick={() => executeBiometricPunch('checkin')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-xs sm:text-sm font-extrabold transition shadow-lg cursor-pointer ${
                      hasCheckedIn
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    <LogIn size={17} />
                    <span>{hasCheckedIn ? 'ĐÃ CHECK-IN' : 'CHECK-IN (VÀO CA)'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(scanning) || !hasCheckedIn || hasCheckedOut}
                    onClick={() => executeBiometricPunch('checkout')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-xs sm:text-sm font-extrabold transition shadow-lg cursor-pointer ${
                      !hasCheckedIn || hasCheckedOut
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
                    }`}
                  >
                    <LogOut size={17} />
                    <span>{hasCheckedOut ? 'ĐÃ CHECK-OUT' : 'CHECK-OUT (TAN CA)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Live Biometric Activity Feed */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Nhật Ký Quẹt Sinh Trắc Học Gần Nhất
                </h3>
              </div>
              <span className="font-mono text-[10px] text-slate-400">{logs.length} lượt quẹt</span>
            </div>

            {logs.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Chưa có lượt quét mới trong phiên này. Hãy chọn nhân sự và bấm Check-in hoặc Check-out.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{log.employeeName}</span>{' '}
                      <span className="font-mono text-[10px] text-slate-400">({log.employeeCode})</span>
                      <div className="text-[10px] text-slate-400">
                        {log.method === 'FACE_ID' ? '📷 Khuôn mặt AI' : '☝️ Vân tay quang học'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          log.mode === 'checkin'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {log.statusText}
                      </span>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">{log.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
