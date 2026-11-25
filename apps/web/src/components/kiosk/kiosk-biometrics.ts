'use client'

export interface FrameLivenessResult {
  ok: boolean
  reason?: string
  brightness: number
  contrast: number
  skinRatio: number
  motionScore: number
  descriptor: number[]
  rawSample: Float32Array
}

export interface FaceMatchCandidate {
  id: string
  fullName: string
  employeeCode: string
  faceDescriptor?: number[] | null
}

export interface FaceMatchResult {
  employeeId: string
  fullName: string
  employeeCode: string
  confidence: number
}

/**
 * Build auth headers for Kiosk API requests (includes Bearer token if present).
 */
export function getKioskAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) }
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('bahau_session_id')
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }
  return headers
}

/**
 * Strip Vietnamese diacritics and normalize whitespace for fast accent-insensitive search.
 */
export function normalizeVnSearch(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Derive default 4-digit Kiosk PIN from employeeCode (last 4 digits).
 */
export function getDefaultEmployeePin(employeeCode: string): string {
  const digits = (employeeCode || '').replace(/\D/g, '')
  if (digits.length >= 4) return digits.slice(-4)
  return digits.padStart(4, '0')
}

/**
 * Capture a horizontally mirrored JPEG snapshot from the live webcam <video>.
 */
export function captureVideoSnapshot(
  video: HTMLVideoElement | null,
  maxWidth = 360,
  quality = 0.72
): string | null {
  if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return null
  }
  const width = Math.min(maxWidth, video.videoWidth)
  const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.save()
  ctx.translate(width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, width, height)
  ctx.restore()

  try {
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return null
  }
}

let analysisCanvas: HTMLCanvasElement | null = null

function getAnalysisCanvas(size: number): HTMLCanvasElement {
  if (!analysisCanvas) {
    analysisCanvas = document.createElement('canvas')
  }
  if (analysisCanvas.width !== size) analysisCanvas.width = size
  if (analysisCanvas.height !== size) analysisCanvas.height = size
  return analysisCanvas
}

/**
 * Analyze center oval region of <video> on a 16x16 canvas for liveness metrics
 * and extract a 256-dimensional L2-normalized luminance descriptor.
 */
export function analyzeFrameLivenessAndDescriptor(
  video: HTMLVideoElement | null,
  prevSample?: Float32Array | null
): FrameLivenessResult {
  const emptySample = new Float32Array(256)
  if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return {
      ok: false,
      reason: 'Camera đang khởi tạo tín hiệu...',
      brightness: 0,
      contrast: 0,
      skinRatio: 0,
      motionScore: 0,
      descriptor: [],
      rawSample: emptySample,
    }
  }

  const size = 16
  const canvas = getAnalysisCanvas(size)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return {
      ok: false,
      reason: 'Không thể khởi tạo bộ phân tích khung hình',
      brightness: 0,
      contrast: 0,
      skinRatio: 0,
      motionScore: 0,
      descriptor: [],
      rawSample: emptySample,
    }
  }

  // Crop center oval region (~44% width, ~60% height)
  const vw = video.videoWidth
  const vh = video.videoHeight
  const cropW = Math.max(16, Math.round(vw * 0.44))
  const cropH = Math.max(16, Math.round(vh * 0.6))
  const sx = Math.round((vw - cropW) / 2)
  const sy = Math.round((vh - cropH) / 2)

  ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, size, size)
  const imageData = ctx.getImageData(0, 0, size, size).data

  const rawSample = new Float32Array(256)
  let lumSum = 0
  let skinCount = 0

  for (let i = 0; i < 256; i++) {
    const idx = i * 4
    const r = imageData[idx]
    const g = imageData[idx + 1]
    const b = imageData[idx + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    rawSample[i] = lum
    lumSum += lum

    const maxC = Math.max(r, g, b)
    const minC = Math.min(r, g, b)
    if (
      r > 95 &&
      g > 40 &&
      b > 20 &&
      maxC - minC > 15 &&
      Math.abs(r - g) > 15 &&
      r > g &&
      r > b
    ) {
      skinCount++
    }
  }

  const brightness = lumSum / 256
  const skinRatio = skinCount / 256

  let varianceSum = 0
  let motionSum = 0
  const hasPrev = Boolean(prevSample && prevSample.length === 256)

  for (let i = 0; i < 256; i++) {
    const diff = rawSample[i] - brightness
    varianceSum += diff * diff
    if (hasPrev && prevSample) {
      motionSum += Math.abs(rawSample[i] - prevSample[i])
    }
  }

  const contrast = Math.sqrt(varianceSum / 256)
  const motionScore = hasPrev ? motionSum / 256 : 0

  // 256-dim zero-mean L2-normalized descriptor
  let normSq = 0
  const centered = new Array<number>(256)
  for (let i = 0; i < 256; i++) {
    const v = rawSample[i] - brightness
    centered[i] = v
    normSq += v * v
  }
  const norm = Math.sqrt(normSq) || 1
  const descriptor = centered.map((v) => Number((v / norm).toFixed(6)))

  if (brightness < 24) {
    return {
      ok: false,
      reason: 'Camera bị che hoặc quá tối — vui lòng hướng mặt vào vùng sáng',
      brightness,
      contrast,
      skinRatio,
      motionScore,
      descriptor,
      rawSample,
    }
  }

  if (contrast < 10) {
    return {
      ok: false,
      reason: 'Không phát hiện đối tượng rõ nét trước ống kính',
      brightness,
      contrast,
      skinRatio,
      motionScore,
      descriptor,
      rawSample,
    }
  }

  return {
    ok: true,
    brightness,
    contrast,
    skinRatio,
    motionScore,
    descriptor,
    rawSample,
  }
}

/**
 * Average multiple 256-dim descriptors and re-normalize to unit L2 length.
 */
export function averageDescriptors(descriptors: number[][]): number[] {
  const valid = descriptors.filter((d) => Array.isArray(d) && d.length === 256)
  if (valid.length === 0) return []
  const sum = new Array<number>(256).fill(0)
  for (const d of valid) {
    for (let i = 0; i < 256; i++) {
      sum[i] += d[i]
    }
  }
  let normSq = 0
  for (let i = 0; i < 256; i++) {
    sum[i] /= valid.length
    normSq += sum[i] * sum[i]
  }
  const norm = Math.sqrt(normSq) || 1
  return sum.map((v) => Number((v / norm).toFixed(6)))
}

/**
 * Compute cosine similarity in [0, 1] between two descriptors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
    return 0
  }
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom <= 0) return 0
  return Math.max(0, Math.min(1, dot / denom))
}

/**
 * Find the best matching employee whose enrolled descriptor has similarity >= 0.90.
 */
export function findBestFaceMatch(
  liveDescriptor: number[],
  employees: FaceMatchCandidate[]
): FaceMatchResult | null {
  if (!Array.isArray(liveDescriptor) || liveDescriptor.length === 0) return null
  let best: FaceMatchResult | null = null

  for (const emp of employees) {
    if (!Array.isArray(emp.faceDescriptor) || emp.faceDescriptor.length !== liveDescriptor.length) {
      continue
    }
    const confidence = cosineSimilarity(liveDescriptor, emp.faceDescriptor)
    if (confidence >= 0.9 && (!best || confidence > best.confidence)) {
      best = {
        employeeId: emp.id,
        fullName: emp.fullName,
        employeeCode: emp.employeeCode,
        confidence,
      }
    }
  }

  return best
}

/**
 * Check if platform authenticator (Windows Hello / Touch ID / Face ID) is available.
 */
export async function isWebAuthnAvailable(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    typeof PublicKeyCredential === 'undefined' ||
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    return false
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Trigger real platform biometric verification via WebAuthn (Windows Hello / Touch ID).
 */
export async function verifyWithWebAuthn(
  employeeCode: string,
  employeeName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const available = await isWebAuthnAvailable()
    if (!available || !navigator.credentials?.create) {
      return {
        ok: false,
        error: 'Trình duyệt hoặc thiết bị chưa hỗ trợ Windows Hello / Touch ID.',
      }
    }

    const challenge = new Uint8Array(32)
    window.crypto.getRandomValues(challenge)
    const userId = new TextEncoder().encode(employeeCode || 'kiosk-user')

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'BAHAU Biometric Kiosk' },
        user: {
          id: userId,
          name: employeeCode,
          displayName: employeeName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 30000,
      },
    })

    if (!credential) {
      return { ok: false, error: 'Không nhận được phản hồi xác thực từ thiết bị.' }
    }
    return { ok: true }
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'NotAllowedError' || name === 'AbortError') {
      return {
        ok: false,
        error: 'Đã hủy hoặc hết thời gian xác thực Windows Hello / Touch ID.',
      }
    }
    return {
      ok: false,
      error: 'Không thể kích hoạt cảm biến sinh trắc học thiết bị.',
    }
  }
}

let sharedAudioCtx: AudioContext | null = null

/**
 * Play distinct Web Audio chimes for Kiosk outcomes:
 * - "success": 2 cheerful ascending notes
 * - "late": 2 warning descending notes
 * - "error": 1 low alert tone
 */
export function playKioskChime(type: 'success' | 'late' | 'error'): void {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx()
    }
    const ctx = sharedAudioCtx
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {})
    }
    const now = ctx.currentTime

    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      oscType: OscillatorType,
      peakGain: number
    ) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = oscType
      osc.frequency.setValueAtTime(freq, now + startOffset)
      gain.gain.setValueAtTime(0.001, now + startOffset)
      gain.gain.linearRampToValueAtTime(peakGain, now + startOffset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + startOffset)
      osc.stop(now + startOffset + duration)
    }

    if (type === 'success') {
      playTone(587.33, 0, 0.14, 'sine', 0.14) // D5
      playTone(880, 0.11, 0.22, 'sine', 0.16) // A5
    } else if (type === 'late') {
      playTone(523.25, 0, 0.16, 'triangle', 0.14) // C5
      playTone(392.0, 0.14, 0.24, 'triangle', 0.14) // G4
    } else {
      playTone(196.0, 0, 0.34, 'sawtooth', 0.11) // G3 low alert
    }
  } catch {
    // Ignore browser autoplay restrictions
  }
}
