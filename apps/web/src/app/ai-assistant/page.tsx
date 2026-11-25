"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Bot,
  HeadphonesIcon,
  Lightbulb,
  Loader2,
  Pin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { useAuth } from "../../context/AuthContext";
import { AiToolTrace } from "../../components/ai/AiToolTrace";
import { AiActionCard } from "../../components/ai/AiActionCard";
import { AiMarkdown } from "../../components/ai/AiMarkdown";
import {
  getAiAuthHeaders,
  streamAiChat,
  type AgentMeta,
  type AgentProposedAction,
  type AgentToolTraceItem,
  type DraftProposal,
  type PolicySourceCitation,
} from "../../components/ai/ai-stream-client";

interface PolicyKnowledgeItem {
  id?: string;
  documentNo: string;
  title: string;
  category: string;
  chunkText: string;
}

interface ChatUiMessage {
  id: string;
  role: "user" | "assistant" | "admin";
  content: string;
  timestamp: string;
  authorName?: string;
  sources?: PolicySourceCitation[];
  draftProposal?: DraftProposal;
  toolTraces?: AgentToolTraceItem[];
  proposedActions?: AgentProposedAction[];
  quickFollowUps?: string[];
  meta?: AgentMeta;
}

const SESSION_STORAGE_KEY = "bahau_ai_session_id";

function getVnTimeStr(dateInput?: string): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleTimeString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrCreateAiSessionId(): string {
  if (typeof window === "undefined") return "bahau-ssr";
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing && existing.trim().length > 0) return existing;
  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `bahau-${crypto.randomUUID()}`
      : `bahau-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

const WELCOME_MESSAGE: ChatUiMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Xin chào Thầy/Cô! Tôi là **Trợ lý ảo AI Agent BAHAU** của Trường Đại học Kiến trúc Đà Nẵng.\n\nTôi được trang bị bộ công cụ nghiệp vụ theo phân quyền của Thầy/Cô và cơ sở tri thức văn bản quy chế Nhà trường:\n- **Tra cứu Quy chế & Định mức**: Giờ chuẩn giảng dạy KTS (QĐ 128), nghỉ phép (QĐ 45), nâng bậc lương (QyĐ 89), KPI (QĐ 210), Luật BHXH.\n- **Truy xuất Dữ liệu Thực tế**: Số dư phép năm, bảng công, phiếu lương & BHXH, hợp đồng và hồ sơ chờ phê duyệt.\n- **Hành động An toàn (HITL)**: Soạn thảo đơn nghỉ phép kèm thẻ xác nhận trước khi gửi, hoặc điều hướng nhanh tới phân hệ.\n\nThầy/Cô có thể bấm vào các câu hỏi gợi ý bên dưới hoặc nhập yêu cầu trực tiếp!",
  timestamp: getVnTimeStr(),
};

const ROLE_QUICK_PROMPTS: Record<string, string[]> = {
  LECTURER: [
    "Tôi còn bao nhiêu ngày phép trong năm nay?",
    "Xem bảng công và phiếu lương BHXH tháng này của tôi",
    "Định mức giờ chuẩn giảng viên kiến trúc sư (QĐ 128)?",
    "Soạn đơn xin nghỉ phép 2 ngày đi việc gia đình",
    "Điều kiện nâng lương trước hạn cho CBGV (QyĐ 89)?",
  ],
  HR_SPECIALIST: [
    "Tổng hợp bảng lương và quỹ BHXH kỳ hiện tại",
    "Cảnh báo hợp đồng lao động sắp hết hạn & trạng thái chấm công",
    "Danh sách hồ sơ đang chờ duyệt trong hệ thống",
    "Quy định trích đóng BHXH 10.5% NLĐ và 21.5% Nhà trường",
  ],
  SYSTEM_ADMIN: [
    "Tổng quan điều hành nhân sự, chấm công & cảnh báo hợp đồng",
    "Danh sách hồ sơ & đơn từ đang chờ phê duyệt",
    "Tình trạng kỳ tính lương và tổng quỹ lương hiện tại",
    "Quy chế đánh giá KPI khống chế 20% Loại A (QĐ 210)?",
  ],
};

function formatMetaBadge(meta?: AgentMeta): string | null {
  if (!meta) return null;
  if (meta.provider === "LOCAL_ONLY" || meta.fallbackTier >= 4) {
    return `Local Fallback · ${meta.latencyMs}ms`;
  }
  return `${meta.modelUsed} · Tier ${meta.fallbackTier} · ${meta.latencyMs}ms`;
}

export default function AiAssistantPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sessionId, setSessionId] = useState<string>("");
  const [policies, setPolicies] = useState<PolicyKnowledgeItem[]>([]);
  const [messages, setMessages] = useState<ChatUiMessage[]>([WELCOME_MESSAGE]);

  const [inputQuery, setInputQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>("");
  const [liveTraces, setLiveTraces] = useState<AgentToolTraceItem[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>("");

  const [chatError, setChatError] = useState<string | null>(null);
  const [confirmingMsgId, setConfirmingMsgId] = useState<string | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(() => {
    const role = user?.role || "LECTURER";
    return ROLE_QUICK_PROMPTS[role] || ROLE_QUICK_PROMPTS.LECTURER;
  }, [user?.role]);

  useEffect(() => {
    setSessionId(getOrCreateAiSessionId());
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, liveTraces, isStreaming]);

  useEffect(() => {
    let active = true;
    const loadPolicies = async () => {
      try {
        const res = await fetch("/api/v1/ai/policies", {
          credentials: "include",
          headers: getAiAuthHeaders(),
        });
        const json = await res.json().catch(() => null);
        if (active && res.ok && json?.success && Array.isArray(json.data)) {
          setPolicies(json.data);
        }
      } catch {
        // Ignore non-blocking policy sidebar load error
      }
    };
    loadPolicies();
    return () => {
      active = false;
    };
  }, []);

  const syncSessionFromServer = useCallback(async (sid: string) => {
    if (!sid) return;
    try {
      const res = await fetch(
        `/api/v1/ai/session?sessionId=${encodeURIComponent(sid)}`,
        {
          credentials: "include",
          headers: getAiAuthHeaders(),
        }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false || !json?.data) return;

      const data = json.data;
      if (data.needsHumanSupport || data.escalated) {
        setIsEscalated(true);
      }

      const rawTurns: any[] = Array.isArray(data.turns)
        ? data.turns
        : Array.isArray(data.messages)
          ? data.messages
          : [];

      if (rawTurns.length > 0) {
        const mapped: ChatUiMessage[] = rawTurns.map((t, idx) => ({
          id: t.id || `sync-${idx}-${t.role}`,
          role: t.role === "admin" ? "admin" : t.role === "user" ? "user" : "assistant",
          content: String(t.content || ""),
          timestamp: getVnTimeStr(t.timestamp || t.createdAt),
          authorName: t.authorName,
          sources: Array.isArray(t.sources) ? t.sources : undefined,
          toolTraces: Array.isArray(t.toolTraces) ? t.toolTraces : undefined,
          proposedActions: Array.isArray(t.proposedActions)
            ? t.proposedActions
            : undefined,
          quickFollowUps: Array.isArray(t.quickFollowUps)
            ? t.quickFollowUps
            : undefined,
          meta: t.meta,
        }));

        setMessages((prev) => {
          // Preserve local draft action status changes if lengths match, otherwise sync full list
          if (prev.length <= 1) {
            return [WELCOME_MESSAGE, ...mapped];
          }
          // Append any new admin replies or turns from server not yet reflected locally
          const existingContents = new Set(
            prev.map((m) => `${m.role}:${m.content.trim()}`)
          );
          const additions = mapped.filter(
            (m) => !existingContents.has(`${m.role}:${m.content.trim()}`)
          );
          if (additions.length === 0) return prev;
          return [...prev, ...additions];
        });
      }
    } catch {
      // Non-blocking session sync
    }
  }, []);

  // Sync session on mount
  useEffect(() => {
    if (!sessionId) return;
    syncSessionFromServer(sessionId);
  }, [sessionId, syncSessionFromServer]);

  // Poll periodically while escalated so HR/Admin replies appear automatically
  useEffect(() => {
    if (!sessionId || !isEscalated) return;
    const timer = setInterval(() => {
      syncSessionFromServer(sessionId);
    }, 5000);
    return () => clearInterval(timer);
  }, [sessionId, isEscalated, syncSessionFromServer]);

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend ?? inputQuery).trim();
    if (q.length < 2) {
      setChatError("Vui lòng nhập câu hỏi tối thiểu 2 ký tự.");
      return;
    }
    if (isStreaming) return;

    const activeSessionId = sessionId || getOrCreateAiSessionId();
    if (!sessionId) setSessionId(activeSessionId);

    setChatError(null);

    const userMsg: ChatUiMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: getVnTimeStr(),
    };

    const historyPayload = messages
      .filter((m) => m.id !== "welcome" && (m.role === "user" || m.role === "assistant"))
      .slice(-20)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content.slice(0, 4000),
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsStreaming(true);
    setAgentStatus("Đang khởi tạo Agent và phân tích yêu cầu...");
    setLiveTraces([]);
    setStreamingContent("");

    try {
      const result = await streamAiChat(
        {
          message: q.slice(0, 2000),
          history: historyPayload,
          sessionId: activeSessionId,
          currentPath: pathname || "/ai-assistant",
        },
        {
          onStatus: (msg) => {
            setAgentStatus(msg);
          },
          onToolStart: (trace) => {
            setLiveTraces((prev) => {
              const exists = prev.some((t) => t.id === trace.id);
              if (exists) {
                return prev.map((t) => (t.id === trace.id ? { ...t, ...trace } : t));
              }
              return [...prev, { ...trace, status: "running" }];
            });
          },
          onToolDone: (trace) => {
            setLiveTraces((prev) => {
              const exists = prev.some((t) => t.id === trace.id);
              if (exists) {
                return prev.map((t) => (t.id === trace.id ? { ...t, ...trace } : t));
              }
              return [...prev, trace];
            });
          },
          onDelta: (chunk) => {
            setStreamingContent((prev) => prev + chunk);
          },
        }
      );

      if (result.kind === "quota" || result.kind === "error") {
        setChatError(result.error);
        return;
      }

      const data = result.data;
      const botMsg: ChatUiMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: getVnTimeStr(),
        sources: data.sources,
        draftProposal: data.draftProposal,
        toolTraces: data.toolTraces,
        proposedActions: data.proposedActions,
        quickFollowUps: data.quickFollowUps,
        meta: data.meta,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : "Không thể kết nối máy chủ Trợ lý AI."
      );
    } finally {
      setIsStreaming(false);
      setAgentStatus("");
      setLiveTraces([]);
      setStreamingContent("");
    }
  };

  const handleConfirmLeaveDraft = async (
    msgId: string,
    payload: Record<string, unknown>
  ) => {
    setConfirmingMsgId(msgId);
    setChatError(null);
    const activeSessionId = sessionId || getOrCreateAiSessionId();

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: getAiAuthHeaders(true),
        body: JSON.stringify({
          message: "Xác nhận gửi đơn nghỉ phép",
          history: [],
          sessionId: activeSessionId,
          confirmDraft: true,
          draftPayload: payload,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false || !json?.data) {
        setChatError(
          json?.error?.message || `Không thể nộp đơn nháp (HTTP ${res.status}).`
        );
        return;
      }

      const confirmedReply = json.data.reply;
      const createdId = json.data.draftProposal?.createdRecordId;

      setMessages((prev) => [
        ...prev.map((m) => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            draftProposal: m.draftProposal
              ? {
                  ...m.draftProposal,
                  status: "SUBMITTED" as const,
                  createdRecordId: createdId,
                }
              : undefined,
            proposedActions: m.proposedActions?.map((act) =>
              act.type === "LEAVE_DRAFT"
                ? {
                    ...act,
                    status: "SUBMITTED" as const,
                    createdRecordId: createdId,
                  }
                : act
            ),
          };
        }),
        {
          id: `bot-confirm-${Date.now()}`,
          role: "assistant",
          content:
            confirmedReply || "Đã gửi đơn thành công vào hệ thống phê duyệt.",
          timestamp: getVnTimeStr(),
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : "Lỗi kết nối máy chủ khi gửi đơn."
      );
    } finally {
      setConfirmingMsgId(null);
    }
  };

  const handleCancelLeaveDraft = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        return {
          ...m,
          draftProposal: m.draftProposal
            ? { ...m.draftProposal, status: "CANCELLED" as const }
            : undefined,
          proposedActions: m.proposedActions?.map((act) =>
            act.type === "LEAVE_DRAFT"
              ? { ...act, status: "CANCELLED" as const }
              : act
          ),
        };
      })
    );
  };

  const handleConfirmAttendanceAdjustment = async (
    msgId: string,
    payload: {
      workDate: string;
      requestedCheckIn?: string;
      requestedCheckOut?: string;
      reason: string;
    }
  ) => {
    setConfirmingMsgId(msgId);
    setChatError(null);
    const activeSessionId = sessionId || getOrCreateAiSessionId();

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: getAiAuthHeaders(true),
        body: JSON.stringify({
          message: "Xác nhận gửi đơn giải trình công",
          history: [],
          sessionId: activeSessionId,
          confirmAction: {
            type: "ATTENDANCE_ADJUSTMENT_DRAFT",
            payload,
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false || !json?.data) {
        setChatError(
          json?.error?.message ||
            `Không thể nộp đơn giải trình công (HTTP ${res.status}).`
        );
        return;
      }

      const confirmedReply = json.data.reply;
      const createdId =
        json.data.proposedActions?.find(
          (a: any) => a.type === "ATTENDANCE_ADJUSTMENT_DRAFT"
        )?.createdRecordId || json.data.draftProposal?.createdRecordId;

      setMessages((prev) => [
        ...prev.map((m) => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            proposedActions: m.proposedActions?.map((act) =>
              act.type === "ATTENDANCE_ADJUSTMENT_DRAFT"
                ? {
                    ...act,
                    status: "SUBMITTED" as const,
                    createdRecordId: createdId,
                  }
                : act
            ),
          };
        }),
        {
          id: `bot-confirm-${Date.now()}`,
          role: "assistant",
          content:
            confirmedReply ||
            "Đã gửi đơn giải trình chấm công thành công vào hệ thống phê duyệt.",
          timestamp: getVnTimeStr(),
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : "Lỗi kết nối máy chủ khi gửi giải trình."
      );
    } finally {
      setConfirmingMsgId(null);
    }
  };

  const handleCancelAttendanceAdjustment = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        return {
          ...m,
          proposedActions: m.proposedActions?.map((act) =>
            act.type === "ATTENDANCE_ADJUSTMENT_DRAFT"
              ? { ...act, status: "CANCELLED" as const }
              : act
          ),
        };
      })
    );
  };

  const handleEscalate = async () => {
    if (escalating || isEscalated) return;
    const activeSessionId = sessionId || getOrCreateAiSessionId();
    setEscalating(true);
    setChatError(null);

    try {
      const res = await fetch("/api/v1/ai/escalate", {
        method: "POST",
        credentials: "include",
        headers: getAiAuthHeaders(true),
        body: JSON.stringify({
          sessionId: activeSessionId,
          reason: "Người dùng yêu cầu chuyển Phòng TCHC / Admin hỗ trợ trực tiếp",
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        setChatError(
          json?.error?.message ||
            `Không thể chuyển hỗ trợ tới Phòng TCHC (HTTP ${res.status}).`
        );
        return;
      }

      setIsEscalated(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-escalate-${Date.now()}`,
          role: "assistant",
          content:
            "Đã chuyển phiên hội thoại của Thầy/Cô tới **Phòng Tổ chức - Hành chính (TCHC)** và Quản trị viên hệ thống. Phản hồi từ chuyên viên sẽ tự động hiển thị ngay tại khung chat này.",
          timestamp: getVnTimeStr(),
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : "Lỗi kết nối khi chuyển yêu cầu hỗ trợ."
      );
    } finally {
      setEscalating(false);
    }
  };

  // Find index of the latest assistant message so quickFollowUps show cleanly after the latest reply
  const latestAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  }, [messages]);

  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const showLocalFallbackBanner =
    user?.role === "SYSTEM_ADMIN" &&
    latestAssistantMessage?.meta?.provider === "LOCAL_ONLY";

  return (
    <AuthGuard moduleName="Trợ lý Ảo AI Quy chế DAU">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[760px]">
        {/* Sidebar: Cơ sở Tri thức Quy chế DAU */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <BookOpen size={16} className="text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Cơ Sở Tri Thức DAU
              </h3>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Các văn bản quy chế pháp quy nội bộ phục vụ bộ máy RAG &amp; Tool Agent:
            </p>

            <div className="mt-3 space-y-2.5">
              {policies.length > 0 ? (
                policies.map((pol, idx) => (
                  <div
                    key={pol.id || idx}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-2.5"
                  >
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-900">
                      {pol.documentNo}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {pol.title}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {pol.chunkText}
                    </p>
                  </div>
                ))
              ) : (
                <>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-900">
                      128/QĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      Quy chế làm việc &amp; Giờ chuẩn KTS
                    </p>
                    <p className="text-[11px] text-slate-500">
                      270 giờ chuẩn, quy đổi ĐATN 18h/SV
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                      45/QĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      Nghỉ phép thường niên &amp; Nghỉ hè
                    </p>
                    <p className="text-[11px] text-slate-500">
                      12 ngày phép, 5 năm thâm niên +1
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-900">
                      89/QyĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      Nâng bậc lương định kỳ &amp; trước hạn
                    </p>
                    <p className="text-[11px] text-slate-500">
                      3 năm cử nhân, 2 năm thạc sĩ/tiến sĩ
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                      210/QĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      Đánh giá KPI &amp; Thi đua khen thưởng
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Thang 100đ, tối đa 20% Loại A
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-900">
                      15/QyĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      Tiêu chuẩn CCHN Kiến trúc sư
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Điều kiện giảng dạy &amp; chủ trì thiết kế
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-purple-900 flex items-start gap-2">
            <ShieldCheck size={16} className="text-purple-700 shrink-0 mt-0.5" />
            <span>
              <b>Phân quyền &amp; Bảo mật:</b> AI Agent chỉ truy xuất dữ liệu thuộc
              phạm vi Role của bạn (RBAC) và luôn yêu cầu xác nhận trước khi gửi đơn từ.
            </span>
          </div>
        </div>

        {/* Main Chatbox: Giao diện Trò chuyện Streaming */}
        <div className="lg:col-span-3 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Chat Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 font-bold">
                <Bot size={22} className="text-amber-300" />
              </div>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <span>Trợ Lý Ảo AI Agent BAHAU</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                    {user?.roleLabel || "DAU"}
                  </span>
                </h2>
                <p className="text-xs text-blue-200">
                  Hỗ trợ streaming thời gian thực, tra cứu số liệu thật và soạn thảo đơn nháp 24/7
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEscalate}
                disabled={escalating || isEscalated}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition cursor-pointer disabled:cursor-default ${
                  isEscalated
                    ? "bg-amber-400/20 border-amber-300 text-amber-200"
                    : "bg-white/10 border-white/25 text-white hover:bg-white/20"
                }`}
              >
                {escalating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <HeadphonesIcon size={13} />
                )}
                <span>
                  {isEscalated
                    ? "Đã chuyển Phòng TCHC"
                    : "Chuyển Phòng TCHC hỗ trợ"}
                </span>
              </button>

              <span className="rounded-full bg-emerald-500/20 border border-emerald-400 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sẵn sàng</span>
              </span>
            </div>
          </div>

          {/* Admin Local Fallback Alert Banner */}
          {showLocalFallbackBanner && (
            <div className="flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-6 py-2.5 text-xs text-amber-950 font-medium">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>
                  Hệ thống AI đang chạy chế độ Local Fallback —{" "}
                  <Link
                    href="/admin/system?tab=ai"
                    className="font-bold text-amber-900 hover:text-amber-950 underline"
                  >
                    Cắm API Key ngay &rarr;
                  </Link>
                </span>
              </div>
              <Link
                href="/admin/system?tab=ai"
                className="hidden sm:inline-flex items-center gap-1 rounded-md bg-amber-200/80 px-2.5 py-1 text-[11px] font-bold text-amber-950 hover:bg-amber-300 transition shrink-0"
              >
                <span>Cấu hình AI</span>
                <span>&rarr;</span>
              </Link>
            </div>
          )}

          {/* Chat Messages Stream */}
          <div
            ref={chatScrollRef}
            className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[520px]"
          >
            {messages.map((m, msgIdx) => {
              const isUser = m.role === "user";
              const isAdmin = m.role === "admin";
              const metaBadge = formatMetaBadge(m.meta);
              const hasLeaveAction = Boolean(
                m.proposedActions?.some((a) => a.type === "LEAVE_DRAFT")
              );

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1 px-1">
                    <span>
                      {isUser
                        ? user?.fullName || "Cán bộ giảng viên"
                        : isAdmin
                          ? m.authorName || "Phòng TCHC / Admin"
                          : "Trợ lý AI BAHAU"}
                    </span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                    {metaBadge && (
                      <>
                        <span>•</span>
                        <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 font-mono text-[10px] text-slate-600">
                          {metaBadge}
                        </span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[88%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                      isUser
                        ? "bg-blue-900 text-white rounded-br-none shadow-sm"
                        : isAdmin
                          ? "bg-emerald-50 text-emerald-950 rounded-bl-none border border-emerald-200"
                          : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60"
                    }`}
                  >
                    {m.toolTraces && m.toolTraces.length > 0 && (
                      <AiToolTrace traces={m.toolTraces} />
                    )}

                    {m.role === "assistant" ? (
                      <AiMarkdown content={m.content} />
                    ) : (
                      <div className="whitespace-pre-line">{m.content}</div>
                    )}

                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs">
                        <p className="font-semibold text-slate-700 flex items-center space-x-1.5 mb-1.5">
                          <Pin size={13} className="text-brand-600" />
                          <span>Văn bản trích dẫn đối chiếu:</span>
                        </p>
                        <div className="space-y-1.5">
                          {m.sources.map((src, i) => (
                            <div
                              key={i}
                              className="rounded-lg bg-white/80 p-2 border border-slate-200 text-slate-600"
                            >
                              <span className="font-bold text-blue-900">
                                {src.documentNo}
                              </span>
                              :{" "}
                              <span className="font-medium text-slate-800">
                                {src.title}
                              </span>
                              <p className="mt-0.5 text-[11px] text-slate-500 italic">
                                &quot;{src.excerpt}&quot;
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.proposedActions &&
                      m.proposedActions.length > 0 &&
                      m.proposedActions.map((action, aIdx) => (
                        <AiActionCard
                          key={`${m.id}-action-${aIdx}`}
                          action={action}
                          isConfirming={confirmingMsgId === m.id}
                          onConfirmLeaveDraft={(payload) =>
                            handleConfirmLeaveDraft(m.id, payload)
                          }
                          onCancelLeaveDraft={() => handleCancelLeaveDraft(m.id)}
                          onConfirmAttendanceAdjustment={(payload) =>
                            handleConfirmAttendanceAdjustment(m.id, payload)
                          }
                          onCancelAttendanceAdjustment={() =>
                            handleCancelAttendanceAdjustment(m.id)
                          }
                        />
                      ))}

                    {/* Legacy draftProposal compatibility when proposedActions doesn't already include LEAVE_DRAFT */}
                    {m.draftProposal && !hasLeaveAction && (
                      <AiActionCard
                        action={{
                          type: "LEAVE_DRAFT",
                          title: "Đề Xuất Đơn Nháp Chờ Xác Nhận",
                          subtitle:
                            m.draftProposal.type === "LEAVE"
                              ? "Đơn xin nghỉ phép"
                              : "Đề xuất đào tạo",
                          summary: m.draftProposal.summary,
                          payload: m.draftProposal.payload,
                          status: m.draftProposal.status,
                          createdRecordId: m.draftProposal.createdRecordId,
                        }}
                        isConfirming={confirmingMsgId === m.id}
                        onConfirmLeaveDraft={(payload) =>
                          handleConfirmLeaveDraft(m.id, payload)
                        }
                        onCancelLeaveDraft={() => handleCancelLeaveDraft(m.id)}
                      />
                    )}
                  </div>

                  {/* Quick Follow-ups after the latest assistant reply */}
                  {!isStreaming &&
                    msgIdx === latestAssistantIndex &&
                    m.quickFollowUps &&
                    m.quickFollowUps.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-[88%]">
                        {m.quickFollowUps.map((followUp) => (
                          <button
                            key={followUp}
                            type="button"
                            onClick={() => handleSend(followUp)}
                            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-100 transition cursor-pointer"
                          >
                            <Sparkles size={11} className="text-indigo-600" />
                            <span>{followUp}</span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}

            {/* Live Streaming Assistant Bubble */}
            {isStreaming && (
              <div className="flex flex-col items-start">
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1 px-1">
                  <span>Trợ lý AI BAHAU</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                    <Loader2 size={11} className="animate-spin" />
                    <span>{agentStatus || "Đang xử lý..."}</span>
                  </span>
                </div>

                <div className="w-full max-w-[88%] rounded-2xl rounded-bl-none px-5 py-3.5 text-sm leading-relaxed bg-slate-100 text-slate-800 border border-slate-200/60">
                  {liveTraces.length > 0 && (
                    <AiToolTrace traces={liveTraces} defaultExpanded />
                  )}

                  {streamingContent ? (
                    <div>
                      <AiMarkdown content={streamingContent} />
                      <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-blue-700 animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                      <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                      <span>
                        {agentStatus ||
                          "Trợ lý AI đang tra cứu dữ liệu & quy chế DAU..."}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Suggestions (Role-Adaptive) */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-2.5">
            <div className="flex items-center space-x-1 text-xs text-slate-500 mb-1.5">
              <Lightbulb size={13} className="text-amber-600" />
              <span>Gợi ý câu hỏi nhanh theo vai trò ({user?.roleLabel || "DAU"}):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSend(p)}
                  disabled={isStreaming}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-blue-900 hover:text-blue-900 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <div className="border-t border-slate-200 p-4 bg-white space-y-2">
            {chatError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                <span>{chatError}</span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Đặt câu hỏi về quy chế, số dư phép, phiếu lương, hoặc yêu cầu soạn đơn..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isStreaming}
                className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <span>{isStreaming ? "Đang trả lời..." : "Gửi"}</span>
                {!isStreaming && <span>&rarr;</span>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
