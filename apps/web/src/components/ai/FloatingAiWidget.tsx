"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Loader2,
  Maximize2,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AiMarkdown } from "./AiMarkdown";
import { AiToolTrace } from "./AiToolTrace";
import { AiActionCard } from "./AiActionCard";
import {
  getAiAuthHeaders,
  streamAiChat,
  type AgentProposedAction,
  type AgentToolTraceItem,
} from "./ai-stream-client";

interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolTraces?: AgentToolTraceItem[];
  proposedActions?: AgentProposedAction[];
}

function getVnTime(): string {
  return new Date().toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPathSuggestions(pathname: string): { title: string; prompts: string[] } {
  if (pathname.startsWith("/payroll")) {
    return {
      title: "Gợi ý nghiệp vụ Tiền lương & BHXH",
      prompts: [
        "Giải thích các khoản trích đóng BHXH tháng này",
        "Xem tổng lương thực lĩnh kỳ gần nhất của tôi",
        "Cách tính thuế TNCN và giảm trừ gia cảnh",
      ],
    };
  }
  if (pathname.startsWith("/attendance") || pathname.startsWith("/checkin")) {
    return {
      title: "Gợi ý nghiệp vụ Chấm công & Giờ làm",
      prompts: [
        "Soạn giải trình chấm công quên check-in hôm nay",
        "Xem tổng số giờ công & đi muộn tháng này",
        "Quy định phạt vi phạm chấm công (QĐ 128)",
      ],
    };
  }
  if (pathname.startsWith("/leave")) {
    return {
      title: "Gợi ý nghiệp vụ Nghỉ phép & Chế độ",
      prompts: [
        "Tôi còn bao nhiêu ngày phép trong năm nay?",
        "Soạn đơn xin nghỉ phép 2 ngày việc gia đình",
        "Quy chế nghỉ bù & chế độ nghỉ hè (QĐ 45)",
      ],
    };
  }
  if (pathname.startsWith("/contracts") || pathname.startsWith("/employees")) {
    return {
      title: "Gợi ý nghiệp vụ Hồ sơ & Hợp đồng",
      prompts: [
        "Cảnh báo hợp đồng lao động sắp hết hạn",
        "Quy chế nâng bậc lương trước hạn (QyĐ 89)",
        "Tiêu chuẩn bổ nhiệm giảng viên chính KTS",
      ],
    };
  }
  if (pathname.startsWith("/admin")) {
    return {
      title: "Gợi ý Quản trị & Hệ thống",
      prompts: [
        "Tổng quan hệ thống, outbox và hàng đợi job",
        "Tình trạng cấu hình AI Gateway & API Key",
        "Quy chế đánh giá KPI tối đa 20% Loại A (QĐ 210)",
      ],
    };
  }
  return {
    title: "Gợi ý câu hỏi nhanh",
    prompts: [
      "Tôi còn bao nhiêu ngày phép trong năm nay?",
      "Xem bảng công và phiếu lương kỳ gần nhất",
      "Định mức giờ chuẩn giảng viên KTS (QĐ 128)?",
    ],
  };
}

export function FloatingAiWidget() {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");
  const [liveTraces, setLiveTraces] = useState<AgentToolTraceItem[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [confirmingMsgId, setConfirmingMsgId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize welcome message once
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome-widget",
          role: "assistant",
          content:
            "Xin chào! Tôi là **Trợ lý AI BAHAU**. Tôi có thể tra cứu nhanh quy chế DAU, số dư phép, bảng công, phiếu lương hoặc soạn thảo đơn từ trực tiếp cho Thầy/Cô.",
          timestamp: getVnTime(),
        },
      ]);
    }
  }, [messages.length]);

  // Auto scroll
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, messages, streamingContent, liveTraces, isStreaming]);

  const pathSuggestions = useMemo(() => getPathSuggestions(pathname || "/"), [pathname]);

  // Only show when authenticated and not on full /ai-assistant page
  if (!isAuthenticated || pathname === "/ai-assistant") {
    return null;
  }

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend ?? inputQuery).trim();
    if (q.length < 2) return;
    if (isStreaming) return;

    setChatError(null);
    const userMsg: WidgetMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: getVnTime(),
    };

    const historyPayload = messages
      .filter((m) => m.id !== "welcome-widget")
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, 2000),
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsStreaming(true);
    setAgentStatus("Đang phân tích...");
    setLiveTraces([]);
    setStreamingContent("");

    try {
      const result = await streamAiChat(
        {
          message: q.slice(0, 2000),
          history: historyPayload,
          sessionId: `drawer-${user?.id || "user"}`,
          currentPath: pathname || "/",
        },
        {
          onStatus: (msg) => setAgentStatus(msg),
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
          onDelta: (chunk) => setStreamingContent((prev) => prev + chunk),
        }
      );

      if (result.kind === "quota" || result.kind === "error") {
        setChatError(result.error);
        return;
      }

      const botMsg: WidgetMessage = {
        id: `b-${Date.now()}`,
        role: "assistant",
        content: result.data.reply,
        timestamp: getVnTime(),
        toolTraces: result.data.toolTraces,
        proposedActions: result.data.proposedActions,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Lỗi kết nối Trợ lý AI.");
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

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: getAiAuthHeaders(true),
        body: JSON.stringify({
          message: "Xác nhận gửi đơn nghỉ phép",
          history: [],
          sessionId: `drawer-${user?.id || "user"}`,
          confirmDraft: true,
          draftPayload: payload,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false || !json?.data) {
        setChatError(json?.error?.message || "Không thể gửi đơn nháp.");
        return;
      }

      const createdId = json.data.draftProposal?.createdRecordId;
      setMessages((prev) => [
        ...prev.map((m) => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            proposedActions: m.proposedActions?.map((act) =>
              act.type === "LEAVE_DRAFT"
                ? { ...act, status: "SUBMITTED" as const, createdRecordId: createdId }
                : act
            ),
          };
        }),
        {
          id: `bot-conf-${Date.now()}`,
          role: "assistant",
          content: json.data.reply || "Đã gửi đơn nghỉ phép vào hàng đợi phê duyệt.",
          timestamp: getVnTime(),
        },
      ]);
    } catch {
      setChatError("Lỗi kết nối khi gửi đơn nghỉ phép.");
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

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: getAiAuthHeaders(true),
        body: JSON.stringify({
          message: "Xác nhận gửi đơn giải trình công",
          history: [],
          sessionId: `drawer-${user?.id || "user"}`,
          confirmAction: {
            type: "ATTENDANCE_ADJUSTMENT_DRAFT",
            payload,
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false || !json?.data) {
        setChatError(json?.error?.message || "Không thể gửi giải trình công.");
        return;
      }

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
                ? { ...act, status: "SUBMITTED" as const, createdRecordId: createdId }
                : act
            ),
          };
        }),
        {
          id: `bot-conf-${Date.now()}`,
          role: "assistant",
          content:
            json.data.reply ||
            "Đã gửi giải trình chấm công thành công vào hệ thống phê duyệt.",
          timestamp: getVnTime(),
        },
      ]);
    } catch {
      setChatError("Lỗi kết nối khi gửi giải trình công.");
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

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Mở Trợ lý AI"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
      >
        {isOpen ? (
          <X size={22} className="text-white" />
        ) : (
          <div className="relative">
            <Bot size={26} className="text-amber-300 group-hover:rotate-12 transition-transform duration-200" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
        )}
      </button>

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 flex h-[580px] w-[410px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-indigo-950/20 bg-gradient-to-r from-blue-900 to-indigo-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Bot size={18} className="text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold truncate">Trợ Lý AI BAHAU</span>
                  <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200">
                    {user?.roleLabel || "DAU"}
                  </span>
                </div>
                <div className="text-[10px] text-blue-200 truncate">
                  Đồng hành tác nghiệp theo thời gian thực
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/ai-assistant"
                onClick={() => setIsOpen(false)}
                title="Mở toàn màn hình"
                className="flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] font-bold text-white hover:bg-white/20 transition-colors"
              >
                <Maximize2 size={12} />
                <span className="hidden sm:inline">Toàn màn hình</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="mb-0.5 px-1 text-[10px] text-slate-400">
                    {isUser ? user?.fullName || "Bạn" : "Trợ lý AI BAHAU"} • {m.timestamp}
                  </div>

                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      isUser
                        ? "bg-blue-900 text-white rounded-br-none shadow-xs"
                        : "bg-white text-slate-800 rounded-bl-none border border-slate-200/80 shadow-2xs"
                    }`}
                  >
                    {m.toolTraces && m.toolTraces.length > 0 && (
                      <AiToolTrace traces={m.toolTraces} />
                    )}

                    {isUser ? (
                      <div className="whitespace-pre-line">{m.content}</div>
                    ) : (
                      <AiMarkdown content={m.content} />
                    )}

                    {m.proposedActions &&
                      m.proposedActions.length > 0 &&
                      m.proposedActions.map((action, aIdx) => (
                        <AiActionCard
                          key={`${m.id}-act-${aIdx}`}
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
                  </div>
                </div>
              );
            })}

            {/* Live Streaming State */}
            {isStreaming && (
              <div className="flex flex-col items-start">
                <div className="mb-0.5 px-1 text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  <span>{agentStatus || "Đang xử lý..."}</span>
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-bl-none border border-slate-200/80 bg-white p-3.5 text-xs leading-relaxed text-slate-800 shadow-2xs">
                  {liveTraces.length > 0 && (
                    <AiToolTrace traces={liveTraces} defaultExpanded />
                  )}
                  {streamingContent ? (
                    <div>
                      <AiMarkdown content={streamingContent} />
                      <span className="inline-block h-3 w-1 ml-1 align-middle bg-blue-700 animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 italic">
                      <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                      <span>{agentStatus || "AI đang tổng hợp thông tin..."}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contextual Suggestions based on current route */}
          <div className="border-t border-slate-100 bg-white px-3.5 py-2">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 mb-1">
              <Lightbulb size={11} className="text-amber-500" />
              <span>{pathSuggestions.title}:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {pathSuggestions.prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSend(p)}
                  disabled={isStreaming}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-700 hover:border-blue-900 hover:text-blue-900 hover:bg-white transition disabled:opacity-50 cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input Footer */}
          <div className="border-t border-slate-200 p-2.5 bg-white">
            {chatError && (
              <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800">
                <AlertCircle size={12} className="shrink-0 text-rose-600" />
                <span className="truncate">{chatError}</span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Hỏi nhanh trợ lý AI..."
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isStreaming}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-white shadow hover:bg-blue-800 disabled:opacity-50 transition cursor-pointer shrink-0"
              >
                {isStreaming ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
