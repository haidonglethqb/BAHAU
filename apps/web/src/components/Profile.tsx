'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Award, Briefcase, Loader2, Mail, MapPin, Phone, RefreshCw, ShieldCheck } from 'lucide-react'
import { type Role } from '../data'
import { useAuth } from '../context/AuthContext'
import apiClient from '../services/api-client'
import { Avatar, Badge, Card } from './ui'

interface EmployeeProfileData {
  id: string
  employeeCode: string
  fullName: string
  gender?: string
  workEmail: string
  phoneNumber?: string | null
  academicTitle?: string | null
  academicDegree?: string | null
  employmentStatus: string
  hireDate?: string | null
  primaryUnitName?: string | null
  primaryPositionName?: string | null
  personalEmail?: string | null
  currentAddress?: string | null
}

interface EmploymentEventItem {
  id: string
  eventType: string
  decisionNumber?: string | null
  effectiveDate: string
  toUnitName?: string | null
  toPositionName?: string | null
  note?: string | null
}

const DEGREE_LABEL_MAP: Record<string, string> = {
  BACHELOR: 'Cử nhân / Kỹ sư',
  MASTER: 'Thạc sĩ',
  DOCTOR: 'Tiến sĩ',
}

const TITLE_LABEL_MAP: Record<string, string> = {
  NONE: 'Không',
  ASSOCIATE_PROFESSOR: 'Phó Giáo sư',
  PROFESSOR: 'Giáo sư',
}

const EVENT_TYPE_LABEL_MAP: Record<string, string> = {
  HIRED: 'Tiếp nhận nhân sự',
  APPOINTED: 'Bổ nhiệm chức vụ',
  TRANSFERRED: 'Điều chuyển công tác',
  CONCURRENT_ASSIGNED: 'Phân công kiêm nhiệm',
  PROMOTED: 'Nâng ngạch / Thăng hạng',
  RESIGNED: 'Thôi việc',
  RETIRED: 'Nghỉ hưu',
}

const STATUS_BADGE_MAP: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  ACTIVE: { label: 'Đang công tác', tone: 'success' },
  PROBATION: { label: 'Thử việc', tone: 'warning' },
  ON_LEAVE: { label: 'Nghỉ dài hạn', tone: 'neutral' },
  RESIGNED: { label: 'Đã thôi việc', tone: 'danger' },
  RETIRED: { label: 'Đã nghỉ hưu', tone: 'neutral' },
}

function formatDateVi(value?: string | null): string {
  if (!value) return 'Chưa cập nhật'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}

export function Profile({ role: _role }: { role?: Role }) {
  const { user, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<EmployeeProfileData | null>(null)
  const [events, setEvents] = useState<EmploymentEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setProfile(null)
      setEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.employees.getMyProfile()
      if (res.ok && res.data) {
        setProfile(res.data)
        if (res.data.id) {
          const evRes = await apiClient.employees.getEvents(res.data.id).catch(() => null)
          if (evRes?.ok && Array.isArray(evRes.data)) {
            setEvents(evRes.data)
          } else {
            setEvents([])
          }
        }
      } else {
        setProfile(null)
        setEvents([])
        if (res.status !== 404) {
          setError(res.error || 'Không thể tải thông tin hồ sơ cá nhân.')
        }
      }
    } catch (err: any) {
      setProfile(null)
      setEvents([])
      setError(err?.message || 'Lỗi kết nối máy chủ hồ sơ.')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const displayName = profile?.fullName || user?.fullName || 'Chưa xác định'
  const displayCode = profile?.employeeCode || user?.employeeCode || user?.code || '—'
  const displayEmail = profile?.workEmail || user?.email || '—'
  const displayPosition = profile?.primaryPositionName || user?.title || user?.roleLabel || 'Cán bộ / Giảng viên'
  const displayUnit = profile?.primaryUnitName || user?.unitName || 'Trường ĐH Kiến trúc Đà Nẵng'
  const statusInfo = STATUS_BADGE_MAP[profile?.employmentStatus || 'ACTIVE'] || {
    label: profile?.employmentStatus || 'Đang công tác',
    tone: 'neutral' as const,
  }

  const academicText = (() => {
    const title = profile?.academicTitle && profile.academicTitle !== 'NONE'
      ? TITLE_LABEL_MAP[profile.academicTitle] || profile.academicTitle
      : ''
    const degree = profile?.academicDegree
      ? DEGREE_LABEL_MAP[profile.academicDegree] || profile.academicDegree
      : ''
    return [title, degree].filter(Boolean).join(' · ') || 'Chưa cập nhật'
  })()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">Hồ sơ cá nhân</h1>
          <p className="mt-1 text-[14px] text-muted">Sơ yếu lý lịch và thông tin công tác của bạn tại DAU.</p>
        </div>
        {error && (
          <button
            type="button"
            onClick={loadProfile}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={13} /> Tải lại
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface py-16">
          <Loader2 size={28} className="animate-spin text-brand-500" />
          <p className="mt-3 text-xs text-muted">Đang tải hồ sơ cán bộ từ hệ thống...</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Card className="mb-6 overflow-hidden">
            <div className="h-20 bg-brand-500" />
            <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
              <div className="-mt-10 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-line">
                <Avatar name={displayName} size={80} />
              </div>
              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[20px] font-bold text-ink">{displayName}</h2>
                  <ShieldCheck size={18} className="text-brand-500" />
                </div>
                <p className="text-[14px] text-muted">
                  {displayPosition} · {displayUnit}
                </p>
              </div>
              <div className="flex gap-2 pb-1">
                <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                <Badge tone="neutral">{displayCode}</Badge>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <h3 className="mb-4 text-[16px] font-semibold text-ink">Sơ yếu lý lịch & Liên hệ</h3>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <Info icon={<Mail size={16} />} label="Email công tác" value={displayEmail} mono />
                <Info
                  icon={<Phone size={16} />}
                  label="Số điện thoại"
                  value={profile?.phoneNumber || 'Chưa cập nhật'}
                  mono
                />
                <Info icon={<Briefcase size={16} />} label="Đơn vị chính" value={displayUnit} />
                <Info icon={<Award size={16} />} label="Học vị / Học hàm" value={academicText} />
                <Info
                  icon={<MapPin size={16} />}
                  label="Địa chỉ"
                  value={profile?.currentAddress || 'Chưa cập nhật'}
                />
                <Info
                  icon={<Briefcase size={16} />}
                  label="Ngày vào trường"
                  value={formatDateVi(profile?.hireDate)}
                  mono
                />
              </dl>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 text-[16px] font-semibold text-ink">Lịch sử bổ nhiệm & Biến động</h3>
              {events.length === 0 ? (
                <p className="text-xs text-muted py-4">
                  {profile
                    ? 'Chưa có biến động công tác nào được ghi nhận.'
                    : 'Tài khoản chưa liên kết hồ sơ nhân sự chi tiết.'}
                </p>
              ) : (
                <ol className="relative space-y-5 border-l border-line pl-5">
                  {events.map((ev) => {
                    const label = EVENT_TYPE_LABEL_MAP[ev.eventType] || ev.eventType
                    const descParts = [
                      ev.toPositionName,
                      ev.toUnitName,
                      ev.decisionNumber ? `QĐ ${ev.decisionNumber}` : null,
                      ev.note,
                    ].filter(Boolean)
                    return (
                      <li key={ev.id} className="relative">
                        <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
                        <div className="font-mono text-[12px] text-ochre-500">
                          {formatDateVi(ev.effectiveDate)}
                        </div>
                        <div className="text-[14px] font-semibold text-ink">{label}</div>
                        {descParts.length > 0 && (
                          <div className="text-[12px] text-muted">{descParts.join(' · ')}</div>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function Info({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <dt className="text-[12px] text-muted">{label}</dt>
        <dd className={`text-[14px] font-medium text-ink ${mono ? 'font-mono' : ''}`}>{value}</dd>
      </div>
    </div>
  )
}
