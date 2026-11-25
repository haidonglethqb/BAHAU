'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock,
  Fingerprint,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  RefreshCw,
  RotateCcw,
  Scan,
  ScanFace,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import KioskEnrollModal from '@/components/kiosk/KioskEnrollModal'
import {
  analyzeFrameLivenessAndDescriptor,
  captureVideoSnapshot,
  FaceMatchResult,
  findBestFaceMatch,
  FrameLivenessResult,
  getDefaultEmployeePin,
  getKioskAuthHeaders,
  isWebAuthnAvailable,
  normalizeVnSearch,
  playKioskChime,
  verifyWithWebAuthn,
} from '@/components/kiosk/kiosk-biometrics'

interface KioskTodayRecord {
  workDate: string
  checkInTime: string | null
  checkOutTime: string | null
  rawWorkingHours: number
  status: string
  deviceSource: string | null
  lateMinutes?: number
  earlyLeaveMinutes?: number
  checkInSnapshot?: string | null
  checkOutSnapshot?: string | null
}

interface KioskEmployee {
  id: string
  employeeCode: string
  fullName: string
  unitName: string
  positionName: string
  hasFaceEnrolled?: boolean
  faceDescriptor?: number[] | null
  today: KioskTodayRecord | null
  monthlyWorkingDays: number
  standardDays: number
}

interface KioskTodayLog {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  unitName: string
  mode: 'checkin' | 'checkout'
  timeIso: string
  method: string | null
  status: string
  lateMinutes?: number
  earlyLeaveMinutes?: number
  snapshot?: string | null
}

interface KioskStats {
  totalEmployees: number
  checkedInCount: number
  onTimeCount: number
  lateCount: number
  checkedOutCount: number
  notCheckedInCount: number
}

interface BannerResultState {
  type: 'success' | 'late' | 'error'
  title: string
  subtitle: string
  timestamp: string
  methodLabel: string
  statusBadge?: string
  snapshot?: string | null
}

const FALLBACK_KIOSK_EMPLOYEES: KioskEmployee[] = [
  {
    id: 'emp-1',
    employeeCode: 'DAU240001',
    fullName: 'ThS. Nguyễn Văn An',
    unitName: 'Khoa Kiến trúc',
    positionName: 'Giảng viên / Nhân sự',
    hasFaceEnrolled: false,
    faceDescriptor: null,
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
    hasFaceEnrolled: false,
    faceDescriptor: null,
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
    hasFaceEnrolled: false,
    faceDescriptor: null,
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
    hasFaceEnrolled: false,
    faceDescriptor: null,
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

function formatShiftDuration(checkInIso?: string | null, nowMs?: number): string {
  if (!checkInIso || !nowMs) return '00:00:00'
  const diffSec = Math.max(0, Math.floor((nowMs - new Date(checkInIso).getTime()) / 1000))
  const h = Math.floor(diffSec / 3600)
  const m = Math.floor((diffSec % 3600) / 60)
  const s = diffSec % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

function formatPunchStatusLabel(params: {
  status?: string
  lateMinutes?: number
  earlyLeaveMinutes?: number
  mode?: 'checkin' | 'checkout'
}): { text: string; tone: 'emerald' | 'amber' | 'sky' } {
  const late = params.lateMinutes ?? 0
  const early = params.earlyLeaveMinutes ?? 0
  if (late > 0 && early > 0) {
    return { text: `Đi muộn ${late}p · Về sớm ${early}p`, tone: 'amber' }
  }
  if (late > 0) {
    return { text: `Đi muộn ${late} phút`, tone: 'amber' }
  }
  if (early > 0) {
    return { text: `Về sớm ${early} phút`, tone: 'amber' }
  }
  if (params.mode === 'checkout') {
    return { text: 'Hoàn thành ca (Đúng giờ)', tone: 'sky' }
  }
  return { text: 'Đúng giờ', tone: 'emerald' }
}

const isDevMode = process.env.NODE_ENV !== 'production'
const HOLD_DURATION_MS = 1000
const SVG_RING_RADIUS = 72
const SVG_RING_CIRCUMFERENCE = 2 * Math.PI * SVG_RING_RADIUS

export default function StandaloneCheckInKioskPage() {
  const [employees, setEmployees] = useState<KioskEmployee[]>(FALLBACK_KIOSK_EMPLOYEES)
  const [todayLogs, setTodayLogs] = useState<KioskTodayLog[]>([])
  const [apiStats, setApiStats] = useState<KioskStats | null>(null)
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [biometricMethod, setBiometricMethod] = useState<'FACE_ID' | 'FINGERPRINT'>('FACE_ID')
  const [clockStr, setClockStr] = useState<string>('')
  const [dateStr, setDateStr] = useState<string>('')
  const [nowMs, setNowMs] = useState<number>(0)

  const [scanning, setScanning] = useState<'checkin' | 'checkout' | null>(null)
  const [scanProgress, setScanProgress] = useState<number>(0)
  const [cameraActive, setCameraActive] = useState<boolean>(false)

  // Real-time Face ID liveness & AI match
  const [liveness, setLiveness] = useState<FrameLivenessResult | null>(null)
  const [faceMatch, setFaceMatch] = useState<FaceMatchResult | null>(null)
  const [autoSelectMatch, setAutoSelectMatch] = useState<boolean>(false)

  // Fingerprint WebAuthn & Hold-to-Scan
  const [webAuthnSupported, setWebAuthnSupported] = useState<boolean>(false)
  const [webAuthnBusy, setWebAuthnBusy] = useState<boolean>(false)
  const [holdProgress, setHoldProgress] = useState<number>(0)
  const [isHoldingFinger, setIsHoldingFinger] = useState<boolean>(false)

  // Anti-proxy 4-digit PIN mode
  const [pinModeEnabled, setPinModeEnabled] = useState<boolean>(false)
  const [pinInput, setPinInput] = useState<string>('')

  // Enrollment modal
  const [enrollOpen, setEnrollOpen] = useState<boolean>(false)

  // Result Banner
  const [bannerResult, setBannerResult] = useState<BannerResultState | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const prevSampleRef = useRef<Float32Array | null>(null)
  const holdRafRef = useRef<number | null>(null)
  const holdStartRef = useRef<number>(0)
  const holdTriggeredRef = useRef<boolean>(false)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef<boolean>(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
  }, [])

  // Live Clock & Shift Timer tick
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setNowMs(now.getTime())
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

  // Check WebAuthn availability on mount
  useEffect(() => {
    isWebAuthnAvailable().then(setWebAuthnSupported).catch(() => setWebAuthnSupported(false))
  }, [])

  // Auto-hide banner result after 8 seconds
  useEffect(() => {
    if (!bannerResult) return
    const timer = setTimeout(() => {
      setBannerResult(null)
    }, 8000)
    return () => clearTimeout(timer)
  }, [bannerResult])

  // Fetch employees, stats & todayLogs from Backend API
  const fetchKioskStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/attendance/kiosk-status', {
        cache: 'no-store',
        credentials: 'include',
        headers: getKioskAuthHeaders(),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && Array.isArray(json?.data?.employees) && json.data.employees.length > 0) {
        setEmployees(json.data.employees)
        setSelectedEmpId((prev) => prev || json.data.employees[0].id)
        if (json.data.stats) {
          setApiStats(json.data.stats)
        }
        if (Array.isArray(json.data.todayLogs)) {
          setTodayLogs(json.data.todayLogs)
        }
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
        setLiveness(null)
        setFaceMatch(null)
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

  // 350ms real-time liveness & AI face match loop
  useEffect(() => {
    if (biometricMethod !== 'FACE_ID' || !cameraActive || enrollOpen) {
      return
    }
    const timer = setInterval(() => {
      const analysis = analyzeFrameLivenessAndDescriptor(
        videoRef.current,
        prevSampleRef.current
      )
      prevSampleRef.current = analysis.rawSample
      setLiveness(analysis)

      if (analysis.ok && analysis.descriptor.length === 256) {
        const match = findBestFaceMatch(analysis.descriptor, employees)
        setFaceMatch(match)
        if (match && autoSelectMatch) {
          setSelectedEmpId(match.employeeId)
        }
      } else {
        setFaceMatch(null)
      }
    }, 350)

    return () => clearInterval(timer)
  }, [biometricMethod, cameraActive, enrollOpen, employees, autoSelectMatch])

  const filteredEmployees = useMemo(() => {
    const q = normalizeVnSearch(searchQuery)
    if (!q) return employees
    return employees.filter((emp) => {
      const target = normalizeVnSearch(`${emp.fullName} ${emp.employeeCode} ${emp.unitName}`)
      return target.includes(q)
    })
  }, [employees, searchQuery])

  const selectedEmployee =
    employees.find((e) => e.id === selectedEmpId) || employees[0] || FALLBACK_KIOSK_EMPLOYEES[0]

  const hasCheckedIn = Boolean(selectedEmployee?.today?.checkInTime)
  const hasCheckedOut = Boolean(selectedEmployee?.today?.checkOutTime)

  const computedStats: KioskStats = useMemo(() => {
    if (apiStats) return apiStats
    const totalEmployees = employees.length
    const checkedInCount = employees.filter((e) => Boolean(e.today?.checkInTime)).length
    const lateCount = employees.filter((e) => (e.today?.lateMinutes ?? 0) > 0).length
    const onTimeCount = Math.max(0, checkedInCount - lateCount)
    const checkedOutCount = employees.filter((e) => Boolean(e.today?.checkOutTime)).length
    return {
      totalEmployees,
      checkedInCount,
      onTimeCount,
      lateCount,
      checkedOutCount,
      notCheckedInCount: Math.max(0, totalEmployees - checkedInCount),
    }
  }, [apiStats, employees])

  const verifyPinIfEnabled = useCallback((): boolean => {
    if (!pinModeEnabled || !selectedEmployee) return true
    const expected = getDefaultEmployeePin(selectedEmployee.employeeCode)
    if (pinInput.trim() === expected) return true

    playKioskChime('error')
    setBannerResult({
      type: 'error',
      title: 'Mã PIN xác thực không đúng',
      subtitle: `Vui lòng nhập đúng mã PIN 4 số của ${selectedEmployee.fullName} (mặc định là 4 số cuối mã NV) để chống chấm công hộ.`,
      timestamp: formatVnTime(new Date().toISOString()),
      methodLabel: 'Xác thực PIN Kiosk',
    })
    return false
  }, [pinModeEnabled, pinInput, selectedEmployee])

  const executeBiometricPunch = useCallback(
    async (mode: 'checkin' | 'checkout', overrideMethodLabel?: string) => {
      if (scanning || !selectedEmployee) return
      if (!verifyPinIfEnabled()) return

      const nowIso = new Date().toISOString()
      const timeLabel = formatVnTime(nowIso)
      const methodLabel =
        overrideMethodLabel ||
        (biometricMethod === 'FACE_ID'
          ? 'Nhận diện Khuôn mặt AI (Face ID)'
          : 'Quét Vân tay Quang học (Fingerprint)')

      let capturedSnapshot: string | null = null

      if (biometricMethod === 'FACE_ID' && cameraActive && videoRef.current) {
        const check = analyzeFrameLivenessAndDescriptor(
          videoRef.current,
          prevSampleRef.current
        )
        prevSampleRef.current = check.rawSample
        setLiveness(check)
        if (!check.ok) {
          playKioskChime('error')
          setBannerResult({
            type: 'error',
            title: 'Từ chối chấm công — Camera không hợp lệ',
            subtitle:
              check.reason ||
              'Camera bị che hoặc không phát hiện khuôn mặt rõ nét trước ống kính.',
            timestamp: timeLabel,
            methodLabel,
          })
          return
        }
        capturedSnapshot = captureVideoSnapshot(videoRef.current, 360, 0.72)
      }

      setScanning(mode)
      setBannerResult(null)
      setScanProgress(0)

      await new Promise<void>((resolve) => {
        let p = 0
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current)
        }
        scanIntervalRef.current = setInterval(() => {
          if (!mountedRef.current) {
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current)
              scanIntervalRef.current = null
            }
            resolve()
            return
          }
          p += 25
          setScanProgress(Math.min(100, p))
          if (p >= 100) {
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current)
              scanIntervalRef.current = null
            }
            resolve()
          }
        }, 90)
      })

      if (!mountedRef.current) return

      try {
        const res = await fetch('/api/v1/attendance/kiosk-punch', {
          method: 'POST',
          credentials: 'include',
          headers: getKioskAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            employeeId: selectedEmployee.id,
            employeeCode: selectedEmployee.employeeCode,
            mode,
            biometricMethod,
            snapshot: capturedSnapshot || undefined,
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

          const lateMin = Number(rec?.lateMinutes ?? 0)
          const earlyMin = Number(rec?.earlyLeaveMinutes ?? 0)
          const isWarning = lateMin > 0 || earlyMin > 0
          const statusInfo = formatPunchStatusLabel({
            status: rec?.status,
            lateMinutes: lateMin,
            earlyLeaveMinutes: earlyMin,
            mode,
          })

          playKioskChime(isWarning ? 'late' : 'success')
          setPinInput('')

          const detailParts: string[] = []
          if (mode === 'checkin') {
            detailParts.push(`Đã ghi nhận giờ vào ca (${recordedTime}).`)
            if (lateMin > 0) detailParts.push(`Đi muộn ${lateMin} phút.`)
            else detailParts.push('Đúng giờ quy định.')
          } else {
            detailParts.push(`Đã ghi nhận giờ tan ca (${recordedTime}).`)
            if (earlyMin > 0) detailParts.push(`Về sớm ${earlyMin} phút.`)
            detailParts.push(`Tổng giờ làm thực tế: ${rec?.rawWorkingHours ?? 8} giờ.`)
          }

          setBannerResult({
            type: isWarning ? 'late' : 'success',
            title:
              mode === 'checkin'
                ? `CHECK-IN THÀNH CÔNG — ${selectedEmployee.fullName}`
                : `CHECK-OUT THÀNH CÔNG — ${selectedEmployee.fullName}`,
            subtitle: detailParts.join(' '),
            timestamp: recordedTime,
            methodLabel,
            statusBadge: statusInfo.text,
            snapshot: rec?.snapshot || capturedSnapshot,
          })
        } else {
          playKioskChime('error')
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
        playKioskChime('error')
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
    },
    [
      biometricMethod,
      cameraActive,
      fetchKioskStatus,
      scanning,
      selectedEmployee,
      verifyPinIfEnabled,
    ]
  )

  // Hold-to-Scan (1.0s) handlers for Fingerprint mode
  const cancelHoldScan = useCallback(() => {
    if (holdRafRef.current !== null) {
      cancelAnimationFrame(holdRafRef.current)
      holdRafRef.current = null
    }
    setIsHoldingFinger(false)
    setHoldProgress(0)
  }, [])

  const startHoldScan = useCallback(() => {
    if (scanning || !selectedEmployee) return
    if (hasCheckedIn && hasCheckedOut) return
    if (holdRafRef.current !== null) cancelAnimationFrame(holdRafRef.current)

    holdTriggeredRef.current = false
    holdStartRef.current = performance.now()
    setIsHoldingFinger(true)

    const tick = (now: number) => {
      const elapsed = now - holdStartRef.current
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100)
      setHoldProgress(pct)

      if (pct >= 100) {
        holdRafRef.current = null
        setIsHoldingFinger(false)
        setHoldProgress(0)
        if (!holdTriggeredRef.current) {
          holdTriggeredRef.current = true
          const nextMode: 'checkin' | 'checkout' = hasCheckedIn ? 'checkout' : 'checkin'
          executeBiometricPunch(nextMode, 'Cảm biến Vân tay Quang học (Hold-to-Scan)')
        }
        return
      }
      holdRafRef.current = requestAnimationFrame(tick)
    }

    holdRafRef.current = requestAnimationFrame(tick)
  }, [executeBiometricPunch, hasCheckedIn, hasCheckedOut, scanning, selectedEmployee])

  useEffect(() => {
    return () => {
      if (holdRafRef.current !== null) cancelAnimationFrame(holdRafRef.current)
    }
  }, [])

  const handleWebAuthnPunch = async () => {
    if (!selectedEmployee || webAuthnBusy || scanning) return
    if (hasCheckedIn && hasCheckedOut) return
    if (!verifyPinIfEnabled()) return

    setWebAuthnBusy(true)
    const authRes = await verifyWithWebAuthn(
      selectedEmployee.employeeCode,
      selectedEmployee.fullName
    )
    setWebAuthnBusy(false)

    if (!authRes.ok) {
      playKioskChime('error')
      setBannerResult({
        type: 'error',
        title: 'Xác thực Windows Hello / Touch ID thất bại',
        subtitle: authRes.error || 'Không thể xác thực sinh trắc học thiết bị.',
        timestamp: formatVnTime(new Date().toISOString()),
        methodLabel: 'Windows Hello / Touch ID',
      })
      return
    }

    const nextMode: 'checkin' | 'checkout' = hasCheckedIn ? 'checkout' : 'checkin'
    await executeBiometricPunch(nextMode, 'Windows Hello / Touch ID (WebAuthn)')
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
        credentials: 'include',
        headers: getKioskAuthHeaders({ 'Content-Type': 'application/json' }),
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

  const handleFaceEnrolled = (employeeId: string, descriptor: number[]) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? { ...emp, hasFaceEnrolled: true, faceDescriptor: descriptor }
          : emp
      )
    )
    fetchKioskStatus()
  }

  const selectedStatusBadge = selectedEmployee?.today
    ? formatPunchStatusLabel({
        status: selectedEmployee.today.status,
        lateMinutes: selectedEmployee.today.lateMinutes,
        earlyLeaveMinutes: selectedEmployee.today.earlyLeaveMinutes,
        mode: selectedEmployee.today.checkOutTime ? 'checkout' : 'checkin',
      })
    : null

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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                TRẠM CHẤM CÔNG SINH TRẮC HỌC (CHECK-IN / CHECK-OUT KIOSK)
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                ONLINE · TERMINAL #01
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Máy chấm công AI &amp; Sinh trắc học tại Sảnh chính — Đồng bộ trực tiếp DB &amp; Bảng lương
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
          REAL-TIME KIOSK LOBBY KPI BAR
      ===================================================================== */}
      <section className="border-b border-slate-800/80 bg-slate-900/50 px-4 sm:px-6 lg:px-8 py-3">
        <div className="mx-auto max-w-7xl grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Tổng nhân sự</span>
              <span className="font-mono text-xl font-black text-white">
                {computedStats.totalEmployees}
              </span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-sky-400">
              <Users size={18} />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-300/80 block">
                Đã vào ca / Đúng giờ
              </span>
              <span className="font-mono text-xl font-black text-emerald-400">
                {computedStats.checkedInCount}{' '}
                <span className="text-xs font-semibold text-emerald-300/80">
                  ({computedStats.onTimeCount} đúng giờ)
                </span>
              </span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <UserCheck size={18} />
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-300/80 block">Đi muộn hôm nay</span>
              <span className="font-mono text-xl font-black text-amber-400">
                {computedStats.lateCount}
              </span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Clock size={18} />
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-sky-300/80 block">Đã tan ca (Check-out)</span>
              <span className="font-mono text-xl font-black text-sky-400">
                {computedStats.checkedOutCount}
              </span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
              <LogOut size={18} />
            </div>
          </div>
        </div>
      </section>

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

                {/* Top AI Face Match Bar (if enrolled match >= 90%) */}
                {cameraActive && faceMatch && (
                  <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-slate-950/90 backdrop-blur px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-emerald-400 shrink-0" />
                      <span className="font-mono font-bold text-emerald-300">
                        Match: {(faceMatch.confidence * 100).toFixed(1)}% — {faceMatch.fullName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoSelectMatch}
                          onChange={(e) => setAutoSelectMatch(e.target.checked)}
                          className="rounded border-slate-600 bg-slate-800 text-emerald-500"
                        />
                        Auto
                      </label>
                      {faceMatch.employeeId !== selectedEmployee?.id && (
                        <button
                          type="button"
                          onClick={() => setSelectedEmpId(faceMatch.employeeId)}
                          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 transition cursor-pointer"
                        >
                          Tự động chọn người khớp
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Face Targeting Frame */}
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div
                    className={`relative w-52 h-64 sm:w-60 sm:h-72 rounded-[45%] border-2 transition-all duration-300 flex items-center justify-center ${
                      scanning
                        ? 'border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)]'
                        : cameraActive && liveness && !liveness.ok
                        ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.45)]'
                        : cameraActive && liveness?.ok
                        ? 'border-emerald-400/90 shadow-[0_0_28px_rgba(16,185,129,0.35)]'
                        : 'border-sky-400/80 shadow-[0_0_25px_rgba(56,189,248,0.25)]'
                    }`}
                  >
                    {!cameraActive && (
                      <div className="text-center space-y-2 px-4">
                        <Scan
                          size={52}
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
                        transition: 'top 90ms linear',
                      }}
                    />
                  </div>

                  {/* Real-time Liveness Status Pill */}
                  <div
                    className={`mt-3 rounded-full border px-4 py-1.5 text-xs font-mono flex items-center gap-2 backdrop-blur ${
                      cameraActive && liveness && !liveness.ok
                        ? 'bg-rose-950/90 border-rose-500/60 text-rose-300'
                        : cameraActive && liveness?.ok
                        ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-950/90 border-slate-700 text-sky-300'
                    }`}
                  >
                    {cameraActive && liveness && !liveness.ok ? (
                      <AlertCircle size={14} className="text-rose-400 shrink-0" />
                    ) : (
                      <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                    )}
                    <span>
                      {scanning
                        ? `Đang xác thực & chụp ảnh sinh trắc... ${scanProgress}%`
                        : cameraActive && liveness
                        ? liveness.ok
                          ? '✓ Đã khóa khuôn mặt trong khung'
                          : liveness.reason || 'Camera bị che / thiếu sáng'
                        : `Sẵn sàng nhận diện: ${selectedEmployee?.fullName} (${selectedEmployee?.employeeCode})`}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* FINGERPRINT OPTICAL + WEBAUTHN SCANNER MODE */
              <div
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at center, rgba(16,185,129,0.16) 0%, rgba(9,13,22,0.98) 75%)',
                }}
              >
                {/* Hold-to-Scan 1.0s SVG Ring */}
                <button
                  type="button"
                  disabled={Boolean(scanning) || (hasCheckedIn && hasCheckedOut)}
                  onPointerDown={startHoldScan}
                  onPointerUp={cancelHoldScan}
                  onPointerLeave={cancelHoldScan}
                  onPointerCancel={cancelHoldScan}
                  className={`relative flex h-44 w-44 items-center justify-center rounded-full transition-transform select-none touch-none ${
                    hasCheckedIn && hasCheckedOut
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer active:scale-95'
                  }`}
                >
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r={SVG_RING_RADIUS}
                      fill="rgba(2,6,23,0.85)"
                      stroke="rgba(16,185,129,0.25)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r={SVG_RING_RADIUS}
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={SVG_RING_CIRCUMFERENCE}
                      strokeDashoffset={
                        SVG_RING_CIRCUMFERENCE * (1 - (scanning ? scanProgress : holdProgress) / 100)
                      }
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center">
                    <Fingerprint
                      size={76}
                      className={
                        isHoldingFinger || scanning
                          ? 'text-emerald-300 animate-pulse'
                          : 'text-emerald-400'
                      }
                    />
                    <span className="mt-1 font-mono text-[10px] font-bold text-emerald-300">
                      {hasCheckedIn && hasCheckedOut
                        ? 'ĐÃ ĐỦ IN/OUT'
                        : isHoldingFinger
                        ? `GIỮ YÊN ${Math.round(holdProgress)}%`
                        : 'NHẤN GIỮ 1.0s'}
                    </span>
                  </div>
                </button>

                <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                  CẢM BIẾN VÂN TAY QUANG HỌC BIO-OPTIC 500DPI
                </p>
                <p className="mt-1 text-xs text-slate-300 max-w-md">
                  {hasCheckedIn && hasCheckedOut
                    ? `${selectedEmployee?.fullName} đã hoàn tất Check-in & Check-out hôm nay.`
                    : `Nhấn giữ vòng tròn cảm biến 1.0 giây để ${
                        hasCheckedIn ? 'Check-out (Tan ca)' : 'Check-in (Vào ca)'
                      } cho ${selectedEmployee?.fullName}`}
                </p>

                {webAuthnSupported && !(hasCheckedIn && hasCheckedOut) && (
                  <button
                    type="button"
                    disabled={webAuthnBusy || Boolean(scanning)}
                    onClick={handleWebAuthnPunch}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/15 hover:bg-emerald-500/25 px-4 py-2 text-xs font-bold text-emerald-200 transition cursor-pointer"
                  >
                    <ShieldCheck size={15} className="text-emerald-400" />
                    <span>
                      {webAuthnBusy
                        ? 'Đang chờ Windows Hello / Touch ID...'
                        : 'Xác thực Windows Hello / Touch ID thật'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RESULT FEEDBACK BANNER (AUTO-DISMISS AFTER 8s) */}
          {bannerResult && (
            <div
              className={`rounded-2xl border p-4 flex items-start gap-3.5 ${
                bannerResult.type === 'success'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : bannerResult.type === 'late'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                  : 'border-rose-500/50 bg-rose-500/10 text-rose-200'
              }`}
            >
              {bannerResult.snapshot && (
                <img
                  src={bannerResult.snapshot}
                  alt="Ảnh chấm công"
                  className="h-14 w-14 rounded-xl object-cover border border-slate-700 shrink-0"
                />
              )}
              {!bannerResult.snapshot &&
                (bannerResult.type === 'success' ? (
                  <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : bannerResult.type === 'late' ? (
                  <Clock size={24} className="text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={24} className="text-rose-400 shrink-0 mt-0.5" />
                ))}
              <div className="flex-1 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-extrabold text-white">{bannerResult.title}</h4>
                    {bannerResult.statusBadge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          bannerResult.type === 'late'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {bannerResult.statusBadge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] rounded bg-slate-900 px-2 py-0.5 text-sky-300 border border-slate-700">
                      {bannerResult.timestamp} · {bannerResult.methodLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBannerResult(null)}
                      title="Đóng thông báo"
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed">{bannerResult.subtitle}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 COLS): EMPLOYEE SELECTOR, CHECK-IN/OUT BUTTONS & DB LIVE FEED */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Employee Selection & Shift Action Panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  1. Chọn Nhân Sự Chấm Công
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

            {/* Accent-insensitive Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên không dấu hoặc mã NV (vd: nguyen van an, DAU240001)..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Employee Selector List */}
            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredEmployees.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  Không tìm thấy nhân sự khớp từ khóa &ldquo;{searchQuery}&rdquo;.
                </p>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = emp.id === selectedEmployee?.id
                  const empIn = Boolean(emp.today?.checkInTime)
                  const empOut = Boolean(emp.today?.checkOutTime)
                  const empLate = (emp.today?.lateMinutes ?? 0) > 0
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmpId(emp.id)
                        setBannerResult(null)
                        setPinInput('')
                      }}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500/15 shadow-sm'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {emp.fullName}
                          </span>
                          <span className="font-mono text-[10px] rounded bg-slate-800 px-1.5 py-0.5 text-sky-300">
                            {emp.employeeCode}
                          </span>
                          {emp.hasFaceEnrolled && (
                            <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                              Face ID
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {emp.unitName} · Công:{' '}
                          <strong className="text-emerald-400">
                            {emp.monthlyWorkingDays}/{emp.standardDays} ngày
                          </strong>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {empOut ? (
                          <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            ✓ Đã đủ In/Out
                          </span>
                        ) : empIn ? (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              empLate
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                            }`}
                          >
                            {empLate ? `Muộn ${emp.today?.lateMinutes}p` : 'Đang trong ca'}
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                            Chưa Check-in
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Selected Employee Today Shift Card */}
            {selectedEmployee && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        NHÂN SỰ ĐANG CHỌN
                      </span>
                      {selectedEmployee.hasFaceEnrolled && (
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Đã đăng ký Face ID
                        </span>
                      )}
                      {selectedStatusBadge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            selectedStatusBadge.tone === 'amber'
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : selectedStatusBadge.tone === 'sky'
                              ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          }`}
                        >
                          {selectedStatusBadge.text}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      {selectedEmployee.fullName}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEnrollOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 text-[11px] font-bold text-sky-300 cursor-pointer"
                    >
                      <ScanFace size={12} /> Đăng ký Face ID
                    </button>
                    {isDevMode && hasCheckedIn && (
                      <button
                        type="button"
                        onClick={handleResetToday}
                        title="Xóa bản ghi hôm nay để Demo lại từ đầu"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2 py-1 text-[11px] text-slate-300 cursor-pointer"
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Check-in / Check-out / Live Shift Timer */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                    <span className="text-[10px] text-slate-400 block">Vào ca</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400 mt-0.5 block">
                      {formatVnTime(selectedEmployee.today?.checkInTime)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                    <span className="text-[10px] text-slate-400 block">Tan ca</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-sky-400 mt-0.5 block">
                      {formatVnTime(selectedEmployee.today?.checkOutTime)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                    <span className="text-[10px] text-slate-400 block">
                      {hasCheckedIn && !hasCheckedOut ? 'Trong ca' : 'Tổng giờ'}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-amber-300 mt-0.5 block">
                      {hasCheckedIn && !hasCheckedOut
                        ? formatShiftDuration(selectedEmployee.today?.checkInTime, nowMs)
                        : selectedEmployee.today?.checkOutTime
                        ? `${selectedEmployee.today.rawWorkingHours}h`
                        : '00:00:00'}
                    </span>
                  </div>
                </div>

                {/* Anti-Proxy PIN Verification Toggle */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinModeEnabled}
                      onChange={(e) => {
                        setPinModeEnabled(e.target.checked)
                        setPinInput('')
                      }}
                      className="rounded border-slate-600 bg-slate-800 text-sky-500"
                    />
                    <Lock size={12} className="text-amber-400" />
                    <span>Xác thực PIN 4 số (Chống chấm hộ)</span>
                  </label>
                  {pinModeEnabled && (
                    <div className="flex items-center gap-1.5">
                      <KeyRound size={12} className="text-slate-400" />
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="PIN 4 số"
                        className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-center font-mono text-xs text-white focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  )}
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

          {/* 2. Live DB-Synced Today Activity Feed */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Nhật Ký Quẹt Thẻ Hôm Nay (Đồng bộ DB)
                </h3>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                {todayLogs.length} lượt quẹt
              </span>
            </div>

            {todayLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Chưa có lượt quét nào hôm nay. Hãy chọn nhân sự và thực hiện Check-in.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {todayLogs.map((log) => {
                  const statusInfo = formatPunchStatusLabel({
                    status: log.status,
                    lateMinutes: log.lateMinutes,
                    earlyLeaveMinutes: log.earlyLeaveMinutes,
                    mode: log.mode,
                  })
                  const isFaceMethod =
                    log.method === 'FACE_ID' ||
                    Boolean(log.method?.toUpperCase().includes('FACE'))
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {log.snapshot ? (
                          <img
                            src={log.snapshot}
                            alt={log.employeeName}
                            className="h-9 w-9 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-400 shrink-0">
                            {isFaceMethod ? (
                              <Camera size={15} className="text-sky-400" />
                            ) : (
                              <Fingerprint size={15} className="text-emerald-400" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-white truncate">
                              {log.employeeName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              ({log.employeeCode})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {log.mode === 'checkin' ? 'Vào ca' : 'Tan ca'} ·{' '}
                            {isFaceMethod ? 'Khuôn mặt AI' : 'Vân tay'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            statusInfo.tone === 'amber'
                              ? 'bg-amber-500/20 text-amber-300'
                              : statusInfo.tone === 'sky'
                              ? 'bg-sky-500/20 text-sky-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {statusInfo.text}
                        </span>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                          {formatVnTime(log.timeIso)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FACE ENROLLMENT & QR PASS MODAL */}
      <KioskEnrollModal
        open={enrollOpen}
        employee={selectedEmployee}
        existingStream={cameraActive ? streamRef.current : null}
        onClose={() => setEnrollOpen(false)}
        onEnrolled={handleFaceEnrolled}
      />
    </div>
  )
}
