"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, BookOpen, Bot, CheckCircle2, FileText, Lightbulb, Pin, ShieldCheck } from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { useAuth } from "../../context/AuthContext";

interface PolicyKnowledgeItem {
  id?: string;
  documentNo: string;
  title: string;
  category: string;
  chunkText: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: Array<{
    documentNo: string;
    title: string;
    excerpt: string;
  }>;
  draftProposal?: {
    type: "LEAVE" | "TRAINING";
    summary: string;
    payload: Record<string, unknown>;
    status: "CONFIRMATION_REQUIRED" | "SUBMITTED" | "CANCELLED";
    createdRecordId?: string;
  };
}

function getVnTimeStr(): string {
  return new Date().toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAuthHeaders(includeJson = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("bahau_session_id");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export default function AiAssistantPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<PolicyKnowledgeItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Xin chào Thầy/Cô! Tôi là **Trợ lý ảo AI Quản trị Nhân sự BAHAU** của Trường Đại học Kiến trúc Đà Nẵng.\n\nTôi được huấn luyện trên hệ thống văn bản pháp quy, quy chế nội bộ của Nhà trường và có thể kết nối dữ liệu hồ sơ nhân sự của Thầy/Cô. Tôi có thể hỗ trợ Thầy/Cô:\n- **Tra cứu Quy chế & Định mức**: Giờ chuẩn giảng dạy KTS, nghỉ hè & nghỉ phép thường niên, nâng bậc lương định kỳ, tiêu chuẩn KPI.\n- **Kiểm tra Số dư Cá nhân**: Số ngày phép năm còn lại, thời hạn hợp đồng, thời hạn chứng chỉ hành nghề.\n- **Soạn Thảo Đơn Nháp**: Tự động tạo đơn nghỉ phép có hộp xác nhận an toàn trước khi nộp.\n\nThầy/Cô có thể bấm vào các câu hỏi gợi ý bên dưới hoặc nhập câu hỏi trực tiếp!",
      timestamp: getVnTimeStr(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [confirmingMsgId, setConfirmingMsgId] = useState<string | null>(null);

  const quickPrompts = [
    "Tôi còn bao nhiêu ngày phép trong năm nay?",
    "Định mức giờ chuẩn giảng viên kiến trúc sư (QĐ 128)?",
    "Điều kiện nâng lương trước hạn cho CBGV (QyĐ 89)?",
    "Quy chế đánh giá KPI khống chế 20% Loại A (QĐ 210)?",
    "Soạn đơn xin nghỉ phép 2 ngày đi việc gia đình",
  ];

  useEffect(() => {
    let active = true;
    const loadPolicies = async () => {
      try {
        const res = await fetch("/api/v1/ai/policies", {
          credentials: "include",
          headers: getAuthHeaders(),
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

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend ?? inputQuery).trim();
    if (q.length < 2) {
      setChatError("Vui lòng nhập câu hỏi tối thiểu 2 ký tự.");
      return;
    }
    setChatError(null);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: getVnTimeStr(),
    };

    const historyPayload = messages
      .filter((m) => m.id !== "welcome")
      .slice(-20)
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, 4000),
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          message: q.slice(0, 1000),
          history: historyPayload,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false || !json?.data) {
        setChatError(json?.error?.message || `Trợ lý AI gặp lỗi khi xử lý yêu cầu (HTTP ${res.status}).`);
        return;
      }

      const data = json.data;
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: getVnTimeStr(),
        sources: Array.isArray(data.sources) ? data.sources : undefined,
        draftProposal: data.draftProposal,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Không thể kết nối máy chủ Trợ lý AI.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmDraft = async (msgId: string) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg?.draftProposal) return;

    setConfirmingMsgId(msgId);
    setChatError(null);
    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          message: "Xác nhận gửi đơn nghỉ phép",
          history: [],
          confirmDraft: true,
          draftPayload: targetMsg.draftProposal.payload,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false || !json?.data) {
        setChatError(json?.error?.message || `Không thể nộp đơn nháp (HTTP ${res.status}).`);
        return;
      }

      const confirmedReply = json.data.reply;
      const createdId = json.data.draftProposal?.createdRecordId;

      setMessages((prev) => [
        ...prev.map((m) =>
          m.id === msgId && m.draftProposal
            ? {
                ...m,
                draftProposal: {
                  ...m.draftProposal,
                  status: "SUBMITTED" as const,
                  createdRecordId: createdId,
                },
              }
            : m,
        ),
        {
          id: `bot-confirm-${Date.now()}`,
          role: "assistant",
          content: confirmedReply || "Đã gửi đơn thành công vào hệ thống phê duyệt.",
          timestamp: getVnTimeStr(),
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Lỗi kết nối máy chủ khi gửi đơn.");
    } finally {
      setConfirmingMsgId(null);
    }
  };

  const handleCancelDraft = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.draftProposal
          ? {
              ...m,
              draftProposal: {
                ...m.draftProposal,
                status: "CANCELLED",
              },
            }
          : m,
      ),
    );
  };

  return (
    <AuthGuard moduleName="Trợ lý Ảo AI Quy chế DAU">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[750px]">
        {/* Sidebar: Cơ sở Tri thức Quy chế DAU */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <BookOpen size={16} className="text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Cơ Sở Tri Thức DAU</h3>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Các văn bản quy chế pháp quy nội bộ phục vụ bộ máy RAG AI:
            </p>

            <div className="mt-3 space-y-2.5">
              {policies.length > 0 ? (
                policies.map((pol, idx) => (
                  <div key={pol.id || idx} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-900">
                      {pol.documentNo}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">{pol.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{pol.chunkText}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-900">
                      128/QĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">Quy chế làm việc &amp; Giờ chuẩn KTS</p>
                    <p className="text-[11px] text-slate-500">270 giờ chuẩn, quy đổi ĐATN 18h/SV</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                      45/QĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">Nghỉ phép thường niên &amp; Nghỉ hè</p>
                    <p className="text-[11px] text-slate-500">12 ngày phép, 5 năm thâm niên +1</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-900">
                      89/QyĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">Nâng bậc lương định kỳ &amp; trước hạn</p>
                    <p className="text-[11px] text-slate-500">3 năm cử nhân, 2 năm thạc sĩ/tiến sĩ</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                      210/QĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">Đánh giá KPI &amp; Thi đua khen thưởng</p>
                    <p className="text-[11px] text-slate-500">Thang 100đ, tối đa 20% Loại A</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-900">
                      15/QyĐ-ĐHKT
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-800">Tiêu chuẩn CCHN Kiến trúc sư</p>
                    <p className="text-[11px] text-slate-500">Điều kiện giảng dạy &amp; chủ trì thiết kế</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-purple-900 flex items-start gap-2">
            <ShieldCheck size={16} className="text-purple-700 shrink-0 mt-0.5" />
            <span>
              <b>Bảo mật thông tin:</b> AI Assistant hoạt động trong mạng nội bộ DAU, không chia sẻ dữ liệu nhân sự ra các dịch vụ ngoài trường.
            </span>
          </div>
        </div>

        {/* Main Chatbox: Giao diện Trò chuyện 2 chiều */}
        <div className="lg:col-span-3 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 font-bold">
                <Bot size={22} className="text-amber-300" />
              </div>
              <div>
                <h2 className="text-base font-bold">Trợ Lý Ảo AI Quản Trị Nhân Sự DAU</h2>
                <p className="text-xs text-blue-200">
                  Hỗ trợ tra cứu quy chế, số dư cá nhân và hỗ trợ soạn thảo đơn nháp 24/7
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sẵn sàng</span>
            </span>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[500px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1 px-1">
                  <span>{m.role === "user" ? user?.fullName || "Cán bộ giảng viên" : "Trợ lý AI BAHAU"}</span>
                  <span>•</span>
                  <span>{m.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-900 text-white rounded-br-none shadow-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60"
                  }`}
                >
                  <div className="whitespace-pre-line">{m.content}</div>

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
                            <span className="font-bold text-blue-900">{src.documentNo}</span>:{" "}
                            <span className="font-medium text-slate-800">{src.title}</span>
                            <p className="mt-0.5 text-[11px] text-slate-500 italic">
                              &quot;{src.excerpt}&quot;
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.draftProposal && (
                    <div className="mt-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                        <span className="font-bold flex items-center space-x-1.5 text-sm">
                          <FileText size={15} className="text-amber-700" />
                          <span>Đề Xuất Đơn Nháp Chờ Xác Nhận</span>
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            m.draftProposal.status === "SUBMITTED"
                              ? "bg-emerald-200 text-emerald-900"
                              : m.draftProposal.status === "CANCELLED"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-amber-200 text-amber-900"
                          }`}
                        >
                          {m.draftProposal.status === "SUBMITTED"
                            ? "ĐÃ NỘP"
                            : m.draftProposal.status === "CANCELLED"
                            ? "ĐÃ HỦY"
                            : "CHỜ XÁC NHẬN"}
                        </span>
                      </div>

                      <p className="mt-2 text-slate-800 font-medium">{m.draftProposal.summary}</p>

                      <div className="mt-3 flex items-center justify-end space-x-2">
                        {m.draftProposal.status === "CONFIRMATION_REQUIRED" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCancelDraft(m.id)}
                              disabled={confirmingMsgId === m.id}
                              className="rounded px-3 py-1.5 text-xs text-slate-600 hover:bg-amber-100 disabled:opacity-50"
                            >
                              Hủy bỏ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmDraft(m.id)}
                              disabled={confirmingMsgId === m.id}
                              className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-800 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} />{" "}
                              {confirmingMsgId === m.id ? "Đang gửi..." : "Xác Nhận Gửi Đơn"}
                            </button>
                          </>
                        ) : m.draftProposal.status === "CANCELLED" ? (
                          <span className="text-xs text-slate-500 font-medium">Đã hủy bản nháp</span>
                        ) : (
                          <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
                            <CheckCircle2 size={13} />
                            <span>
                              Đã ghi vào hàng đợi phê duyệt
                              {m.draftProposal.createdRecordId ? ` (${m.draftProposal.createdRecordId})` : ""}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 italic">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                <span>Trợ lý AI đang tra cứu văn bản quy chế DAU...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts Suggestions */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-2.5">
            <div className="flex items-center space-x-1 text-xs text-slate-500 mb-1.5">
              <Lightbulb size={13} className="text-amber-600" />
              <span>Gợi ý câu hỏi nhanh:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  disabled={isTyping}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-blue-900 hover:text-blue-900 transition shadow-2xs disabled:opacity-50"
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
                placeholder="Đặt câu hỏi về quy chế, số dư phép, hoặc yêu cầu soạn đơn..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50 transition flex items-center space-x-1.5"
              >
                <span>Gửi</span>
                <span>&rarr;</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
