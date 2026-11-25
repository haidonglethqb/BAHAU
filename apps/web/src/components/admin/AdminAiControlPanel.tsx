"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Eye,
  EyeOff,
  HeadphonesIcon,
  KeyRound,
  Loader2,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { getAiAuthHeaders } from "../ai/ai-stream-client";

type AiProvider = "CODEX" | "GROQ" | "LOCAL_ONLY";

interface MaskedAiConfig {
  provider: AiProvider;
  codexApiKeyMasked: string;
  hasCodexApiKey: boolean;
  codexBaseUrl: string;
  codexPrimaryModel: string;
  codexFallbackModel: string;
  groqApiKeyMasked: string;
  hasGroqApiKey: boolean;
  groqPrimaryModel: string;
  temperature: number;
  timeoutMs: number;
  defaultUserDailyLimit: number | null;
}

interface TestConnectionResult {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  model?: string;
  sampleReply?: string;
  error?: string;
}

interface SessionToolTrace {
  id: string;
  tool: string;
  label: string;
  status: string;
  summary?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

interface SessionTurn {
  id?: string;
  role: "user" | "assistant" | "admin";
  content: string;
  timestamp?: string;
  createdAt?: string;
  authorName?: string;
  toolTraces?: SessionToolTrace[];
  meta?: {
    modelUsed?: string;
    fallbackTier?: number;
    latencyMs?: number;
    provider?: string;
  };
}

interface AiLogSession {
  id?: string;
  sessionId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  needsHumanSupport?: boolean;
  escalated?: boolean;
  escalationReason?: string;
  updatedAt?: string;
  createdAt?: string;
  turns?: SessionTurn[];
  messages?: SessionTurn[];
}

const CODEX_MODEL_PRESETS = [
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-4o",
  "gpt-5-mini",
  "gpt-6.1-sol",
  "gemini-2.5-flash",
  "claude-3-5-sonnet-latest",
];

const GROQ_MODEL_PRESETS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

const BASE_URL_PRESETS = [
  { label: "ModelAPI.vn", url: "https://api.modelapi.vn/v1" },
  { label: "OpenAI", url: "https://api.openai.com/v1" },
  { label: "OpenRouter", url: "https://openrouter.ai/api/v1" },
  {
    label: "Gemini OpenAI-Compat",
    url: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
];

async function adminFetchJson<T = any>(
  url: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...getAiAuthHeaders(Boolean(init.body)),
      ...((init.headers as Record<string, string>) || {}),
    },
  });
  const json = await res.json().catch(() => null);
  return {
    ok: res.ok && json?.success !== false,
    status: res.status,
    data: json?.data ?? json,
    error: json?.error?.message || (res.ok ? undefined : `HTTP ${res.status}`),
  };
}

export function AdminAiControlPanel() {
  const [subTab, setSubTab] = useState<"config" | "logs">("config");

  // Config state
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [configNotice, setConfigNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  const [maskedInfo, setMaskedInfo] = useState<MaskedAiConfig | null>(null);
  const [provider, setProvider] = useState<AiProvider>("CODEX");
  const [codexBaseUrl, setCodexBaseUrl] = useState("https://api.modelapi.vn/v1");
  const [codexApiKey, setCodexApiKey] = useState("");
  const [showCodexKey, setShowCodexKey] = useState(false);
  const [codexPrimaryModel, setCodexPrimaryModel] = useState("gpt-4o-mini");
  const [codexFallbackModel, setCodexFallbackModel] = useState("gpt-4.1-mini");

  const [groqApiKey, setGroqApiKey] = useState("");
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [groqPrimaryModel, setGroqPrimaryModel] = useState(
    "llama-3.3-70b-versatile"
  );

  const [temperature, setTemperature] = useState<string>("0.2");
  const [timeoutMs, setTimeoutMs] = useState<string>("25000");
  const [defaultUserDailyLimit, setDefaultUserDailyLimit] = useState<string>("");

  // Logs state
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sessions, setSessions] = useState<AiLogSession[]>([]);
  const [logsFilter, setLogsFilter] = useState<"ALL" | "ESCALATED">("ALL");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [expandedTraceMap, setExpandedTraceMap] = useState<Record<string, boolean>>({});
  const [replyInput, setReplyInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [logsNotice, setLogsNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const applyMaskedConfig = useCallback((cfg: MaskedAiConfig) => {
    setMaskedInfo(cfg);
    setProvider(cfg.provider || "CODEX");
    setCodexBaseUrl(cfg.codexBaseUrl || "https://api.modelapi.vn/v1");
    setCodexPrimaryModel(cfg.codexPrimaryModel || "gpt-4o-mini");
    setCodexFallbackModel(cfg.codexFallbackModel || "gpt-4.1-mini");
    setGroqPrimaryModel(cfg.groqPrimaryModel || "llama-3.3-70b-versatile");
    setTemperature(String(cfg.temperature ?? 0.2));
    setTimeoutMs(String(cfg.timeoutMs ?? 25000));
    setDefaultUserDailyLimit(
      cfg.defaultUserDailyLimit === null || cfg.defaultUserDailyLimit === undefined
        ? ""
        : String(cfg.defaultUserDailyLimit)
    );
  }, []);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await adminFetchJson<MaskedAiConfig>("/api/v1/admin/ai-config");
      if (res.ok && res.data) {
        applyMaskedConfig(res.data);
      } else {
        setConfigNotice({
          type: "error",
          text: res.error || "Không thể tải cấu hình AI hiện tại.",
        });
      }
    } catch (err) {
      setConfigNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi kết nối khi tải cấu hình AI.",
      });
    } finally {
      setLoadingConfig(false);
    }
  }, [applyMaskedConfig]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await adminFetchJson<any>("/api/v1/admin/ai-config/logs");
      if (res.ok) {
        const list: AiLogSession[] = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.sessions)
            ? res.data.sessions
            : [];
        setSessions(list);
        if (list.length > 0) {
          setSelectedSessionId((prev) => {
            if (prev && list.some((s) => (s.sessionId || s.id) === prev)) {
              return prev;
            }
            return list[0].sessionId || list[0].id || null;
          });
        } else {
          setSelectedSessionId(null);
        }
      } else {
        setLogsNotice({
          type: "error",
          text: res.error || "Không thể tải nhật ký hội thoại AI.",
        });
      }
    } catch (err) {
      setLogsNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi mạng khi tải nhật ký.",
      });
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (subTab === "logs") {
      loadLogs();
    }
  }, [subTab, loadLogs]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigNotice(null);
    try {
      const parsedTemp = Number(temperature);
      const parsedTimeout = Number(timeoutMs);
      const trimmedLimit = defaultUserDailyLimit.trim();
      const parsedLimit = trimmedLimit === "" ? null : Number(trimmedLimit);

      const payload: Record<string, unknown> = {
        provider,
        codexBaseUrl: codexBaseUrl.trim(),
        codexPrimaryModel: codexPrimaryModel.trim(),
        codexFallbackModel: codexFallbackModel.trim(),
        groqPrimaryModel: groqPrimaryModel.trim(),
        temperature: Number.isFinite(parsedTemp) ? parsedTemp : 0.2,
        timeoutMs: Number.isFinite(parsedTimeout) ? parsedTimeout : 25000,
        defaultUserDailyLimit:
          parsedLimit === null || Number.isFinite(parsedLimit) ? parsedLimit : null,
      };

      if (codexApiKey.trim()) {
        payload.codexApiKey = codexApiKey.trim();
      }
      if (groqApiKey.trim()) {
        payload.groqApiKey = groqApiKey.trim();
      }

      const res = await adminFetchJson<MaskedAiConfig>("/api/v1/admin/ai-config", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (res.ok && res.data) {
        applyMaskedConfig(res.data);
        setCodexApiKey("");
        setGroqApiKey("");
        setConfigNotice({
          type: "success",
          text: "Đã lưu cấu hình AI Agent vào runtime thành công! Áp dụng ngay lập tức cho mọi phiên chat.",
        });
      } else {
        setConfigNotice({
          type: "error",
          text: res.error || "Lưu cấu hình thất bại.",
        });
      }
    } catch (err) {
      setConfigNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi mạng khi lưu cấu hình.",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (provider === "LOCAL_ONLY") {
      setTestResult({
        ok: true,
        latencyMs: 0,
        model: "AgentDeterministicFallback (Local)",
        sampleReply:
          "Chế độ Local Fallback nội bộ đang sẵn sàng, không phụ thuộc kết nối LLM bên ngoài.",
      });
      return;
    }

    setTestingConn(true);
    setTestResult(null);
    setConfigNotice(null);
    try {
      const testPayload =
        provider === "GROQ"
          ? {
              provider: "GROQ" as const,
              apiKey: groqApiKey.trim() || undefined,
              model: groqPrimaryModel.trim() || undefined,
            }
          : {
              provider: "CODEX" as const,
              apiKey: codexApiKey.trim() || undefined,
              baseUrl: codexBaseUrl.trim() || undefined,
              model: codexPrimaryModel.trim() || undefined,
            };

      const res = await adminFetchJson<TestConnectionResult>(
        "/api/v1/admin/ai-config/test",
        {
          method: "POST",
          body: JSON.stringify(testPayload),
        }
      );

      if (res.data && typeof res.data.ok === "boolean") {
        setTestResult(res.data);
      } else {
        setTestResult({
          ok: false,
          status: res.status,
          error: res.error || "Kiểm tra kết nối thất bại.",
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        error: err instanceof Error ? err.message : "Lỗi kết nối khi test provider.",
      });
    } finally {
      setTestingConn(false);
    }
  };

  const handleReplySession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !replyInput.trim()) return;
    setSendingReply(true);
    setLogsNotice(null);
    try {
      const res = await adminFetchJson(
        `/api/v1/admin/ai-config/sessions/${encodeURIComponent(selectedSessionId)}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ message: replyInput.trim() }),
        }
      );
      if (res.ok) {
        setReplyInput("");
        setLogsNotice({
          type: "success",
          text: "Đã gửi phản hồi trực tiếp tới phiên hội thoại của người dùng.",
        });
        await loadLogs();
      } else {
        setLogsNotice({
          type: "error",
          text: res.error || "Không thể gửi phản hồi.",
        });
      }
    } catch (err) {
      setLogsNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi mạng khi gửi phản hồi.",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setLogsNotice(null);
    try {
      const res = await adminFetchJson(
        `/api/v1/admin/ai-config/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setLogsNotice({
          type: "success",
          text: `Đã xóa phiên ${sessionId}.`,
        });
        await loadLogs();
      } else {
        setLogsNotice({
          type: "error",
          text: res.error || "Không thể xóa phiên.",
        });
      }
    } catch (err) {
      setLogsNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi mạng khi xóa phiên.",
      });
    }
  };

  const handleClearAllLogs = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Bạn có chắc muốn xóa toàn bộ nhật ký hội thoại AI không?")
    ) {
      return;
    }
    setLogsNotice(null);
    try {
      const res = await adminFetchJson("/api/v1/admin/ai-config/logs", {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions([]);
        setSelectedSessionId(null);
        setLogsNotice({
          type: "success",
          text: "Đã dọn sạch toàn bộ nhật ký hội thoại AI.",
        });
      } else {
        setLogsNotice({
          type: "error",
          text: res.error || "Không thể xóa nhật ký.",
        });
      }
    } catch (err) {
      setLogsNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi mạng khi xóa nhật ký.",
      });
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (logsFilter === "ESCALATED") {
      return Boolean(s.needsHumanSupport || s.escalated);
    }
    return true;
  });

  const selectedSession =
    filteredSessions.find((s) => (s.sessionId || s.id) === selectedSessionId) ||
    sessions.find((s) => (s.sessionId || s.id) === selectedSessionId) ||
    null;

  const selectedTurns = selectedSession
    ? selectedSession.turns || selectedSession.messages || []
    : [];

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-ink">
              Bảng Điều Khiển AI Agent &amp; API Gateway (MORI Pattern)
            </h2>
            <p className="text-xs text-muted">
              Cắm API Key là chạy ngay không cần restart, bảo vệ SSRF &amp; thanh tra Tool Calls theo thời gian thực
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSubTab("config")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              subTab === "config"
                ? "bg-white text-brand-700 shadow-2xs"
                : "text-slate-600 hover:text-ink"
            }`}
          >
            <KeyRound size={14} />
            <span>Cấu hình Provider &amp; API Key</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("logs")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              subTab === "logs"
                ? "bg-white text-brand-700 shadow-2xs"
                : "text-slate-600 hover:text-ink"
            }`}
          >
            <MessageSquare size={14} />
            <span>Nhật ký Hội thoại &amp; Tool Inspector</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: PROVIDER & API KEY CONFIG                                  */}
      {/* ===================================================================== */}
      {subTab === "config" && (
        <form onSubmit={handleSaveConfig} className="space-y-5">
          {configNotice && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
                configNotice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {configNotice.type === "success" ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
              )}
              <span>{configNotice.text}</span>
            </div>
          )}

          {/* Runtime notice */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-950">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-700" />
            <div>
              <strong>Lưu ý bảo mật Secret &amp; Runtime:</strong> API Key nhập tại đây
              được <strong>mã hóa AES-256-GCM và tự động lưu bền vững qua các lần restart server</strong>,
              đồng thời có hiệu lực ngay lập tức trong bộ nhớ runtime mà không cần khởi động lại.
              Ngoài ra hệ thống vẫn hỗ trợ cấu hình qua biến môi trường{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">CODEX_API_KEY</code> hoặc{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">GROQ_API_KEY</code> trong file{" "}
              <code className="rounded bg-amber-100 px-1 font-mono">.env</code>.
            </div>
          </div>

          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setProvider("CODEX")}
              className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                provider === "CODEX"
                  ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20"
                  : "border-line bg-surface hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-ink">
                  <Sparkles size={16} className="text-brand-600" />
                  CODEX (OpenAI-Compatible)
                </span>
                {maskedInfo?.hasCodexApiKey && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Key sẵn sàng
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Hỗ trợ ModelAPI.vn, OpenAI, OpenRouter, Gemini OpenAI-compat qua giao thức SSE Tool-Calling.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProvider("GROQ")}
              className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                provider === "GROQ"
                  ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20"
                  : "border-line bg-surface hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-ink">
                  <Zap size={16} className="text-amber-600" />
                  GROQ (Groq Cloud)
                </span>
                {maskedInfo?.hasGroqApiKey && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Key sẵn sàng
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Tốc độ suy luận siêu nhanh với Llama 3.3 70B / Mixtral và cơ chế failover chéo từ CODEX.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProvider("LOCAL_ONLY")}
              className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                provider === "LOCAL_ONLY"
                  ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20"
                  : "border-line bg-surface hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-ink">
                  <Cpu size={16} className="text-slate-700" />
                  LOCAL_ONLY (Nội bộ)
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  Offline 100%
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Chế độ nội bộ không dùng LLM ngoài. Chỉ chạy bộ quy tắc RAG &amp; tra cứu số dư BAHAU.
              </p>
            </button>
          </div>

          {loadingConfig ? (
            <div className="flex items-center justify-center rounded-2xl border border-line bg-surface p-10 text-xs text-muted gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span>Đang tải cấu hình AI Gateway...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* CODEX Configuration */}
              <div className="rounded-2xl border border-line bg-surface p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="text-sm font-extrabold text-ink">
                    Cấu hình OpenAI-Compatible (CODEX)
                  </h3>
                  {maskedInfo?.hasCodexApiKey ? (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-800">
                      Đã cấu hình: {maskedInfo.codexApiKeyMasked}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      Chưa có key
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Base URL (HTTPS Whitelist)
                  </label>
                  <input
                    type="url"
                    value={codexBaseUrl}
                    onChange={(e) => setCodexBaseUrl(e.target.value)}
                    placeholder="https://api.modelapi.vn/v1"
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono text-ink focus:border-brand-500 focus:outline-none"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {BASE_URL_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setCodexBaseUrl(preset.url)}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-700 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Codex / OpenAI API Key (để trống nếu giữ nguyên key hiện tại)
                  </label>
                  <div className="relative">
                    <input
                      type={showCodexKey ? "text" : "password"}
                      value={codexApiKey}
                      onChange={(e) => setCodexApiKey(e.target.value)}
                      autoComplete="off"
                      placeholder={
                        maskedInfo?.hasCodexApiKey
                          ? `Key đang chạy: ${maskedInfo.codexApiKeyMasked}`
                          : "sk-..."
                      }
                      className="w-full rounded-xl border border-line px-3 py-2 pr-9 text-xs font-mono text-ink focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCodexKey((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label="Hiện/ẩn API key"
                    >
                      {showCodexKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Primary Model (Tier 1)
                    </label>
                    <select
                      value={
                        CODEX_MODEL_PRESETS.includes(codexPrimaryModel)
                          ? codexPrimaryModel
                          : "__custom__"
                      }
                      onChange={(e) => {
                        if (e.target.value !== "__custom__") {
                          setCodexPrimaryModel(e.target.value);
                        }
                      }}
                      className="w-full rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-medium text-ink mb-1.5"
                    >
                      {CODEX_MODEL_PRESETS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="__custom__">-- Nhập tên model tùy chỉnh --</option>
                    </select>
                    <input
                      type="text"
                      value={codexPrimaryModel}
                      onChange={(e) => setCodexPrimaryModel(e.target.value)}
                      placeholder="Tên model tùy ý..."
                      className="w-full rounded-xl border border-line px-3 py-1.5 text-xs font-mono text-ink focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fallback Model (Tier 2)
                    </label>
                    <select
                      value={
                        CODEX_MODEL_PRESETS.includes(codexFallbackModel)
                          ? codexFallbackModel
                          : "__custom__"
                      }
                      onChange={(e) => {
                        if (e.target.value !== "__custom__") {
                          setCodexFallbackModel(e.target.value);
                        }
                      }}
                      className="w-full rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-medium text-ink mb-1.5"
                    >
                      {CODEX_MODEL_PRESETS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="__custom__">-- Nhập tên model tùy chỉnh --</option>
                    </select>
                    <input
                      type="text"
                      value={codexFallbackModel}
                      onChange={(e) => setCodexFallbackModel(e.target.value)}
                      placeholder="Tên fallback model..."
                      className="w-full rounded-xl border border-line px-3 py-1.5 text-xs font-mono text-ink focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* GROQ & Global Tunings */}
              <div className="rounded-2xl border border-line bg-surface p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="text-sm font-extrabold text-ink">
                    Groq Cloud (Cross-Provider Failover) &amp; Tham số
                  </h3>
                  {maskedInfo?.hasGroqApiKey ? (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-800">
                      Đã cấu hình: {maskedInfo.groqApiKeyMasked}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      Chưa có key
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Groq API Key (để trống nếu giữ nguyên)
                  </label>
                  <div className="relative">
                    <input
                      type={showGroqKey ? "text" : "password"}
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      autoComplete="off"
                      placeholder={
                        maskedInfo?.hasGroqApiKey
                          ? `Key đang chạy: ${maskedInfo.groqApiKeyMasked}`
                          : "gsk_..."
                      }
                      className="w-full rounded-xl border border-line px-3 py-2 pr-9 text-xs font-mono text-ink focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqKey((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label="Hiện/ẩn Groq API key"
                    >
                      {showGroqKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Groq Primary Model
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={
                        GROQ_MODEL_PRESETS.includes(groqPrimaryModel)
                          ? groqPrimaryModel
                          : "__custom__"
                      }
                      onChange={(e) => {
                        if (e.target.value !== "__custom__") {
                          setGroqPrimaryModel(e.target.value);
                        }
                      }}
                      className="w-full rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-medium text-ink"
                    >
                      {GROQ_MODEL_PRESETS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="__custom__">-- Tùy chỉnh --</option>
                    </select>
                    <input
                      type="text"
                      value={groqPrimaryModel}
                      onChange={(e) => setGroqPrimaryModel(e.target.value)}
                      placeholder="llama-3.3-70b-versatile"
                      className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono text-ink focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Temperature (0–2)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono text-ink focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="3000"
                      max="180000"
                      value={timeoutMs}
                      onChange={(e) => setTimeoutMs(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono text-ink focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giới hạn lượt/ngày
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={defaultUserDailyLimit}
                      onChange={(e) => setDefaultUserDailyLimit(e.target.value)}
                      placeholder="Không giới hạn"
                      className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono text-ink focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar & Live Test Result */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConn || loadingConfig}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50 transition cursor-pointer"
            >
              {testingConn ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>
                {testingConn
                  ? "Đang kiểm tra kết nối..."
                  : "✦ Kiểm tra kết nối (Live Test)"}
              </span>
            </button>

            <button
              type="submit"
              disabled={savingConfig || loadingConfig}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50 transition cursor-pointer"
            >
              {savingConfig ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>
                {savingConfig ? "Đang lưu cấu hình..." : "Lưu cấu hình hệ thống"}
              </span>
            </button>
          </div>

          {testResult && (
            <div
              className={`rounded-2xl border p-4 text-xs space-y-2 ${
                testResult.ok
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                  : "border-rose-200 bg-rose-50/70 text-rose-950"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-extrabold">
                  {testResult.ok ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600" />
                  )}
                  {testResult.ok
                    ? "Kết nối Provider thành công!"
                    : "Kiểm tra kết nối thất bại"}
                </span>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  {testResult.model && (
                    <span className="rounded bg-white/80 px-2 py-0.5 border border-black/10">
                      {testResult.model}
                    </span>
                  )}
                  {typeof testResult.latencyMs === "number" && (
                    <span className="rounded bg-white/80 px-2 py-0.5 border border-black/10">
                      {testResult.latencyMs}ms
                    </span>
                  )}
                  {typeof testResult.status === "number" && (
                    <span className="rounded bg-white/80 px-2 py-0.5 border border-black/10">
                      HTTP {testResult.status}
                    </span>
                  )}
                </div>
              </div>
              {testResult.sampleReply && (
                <p className="rounded-lg bg-white/80 p-2.5 border border-emerald-200 text-slate-800">
                  <strong>Phản hồi mẫu:</strong> {testResult.sampleReply}
                </p>
              )}
              {testResult.error && (
                <p className="rounded-lg bg-white/80 p-2.5 border border-rose-200 font-mono text-[11px] text-rose-800">
                  {testResult.error}
                </p>
              )}
            </div>
          )}
        </form>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: CONVERSATION LOGS & TOOL INSPECTOR                         */}
      {/* ===================================================================== */}
      {subTab === "logs" && (
        <div className="space-y-4">
          {logsNotice && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
                logsNotice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {logsNotice.type === "success" ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
              )}
              <span>{logsNotice.text}</span>
            </div>
          )}

          {/* Filter & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLogsFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  logsFilter === "ALL"
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả ({sessions.length})
              </button>
              <button
                type="button"
                onClick={() => setLogsFilter("ESCALATED")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  logsFilter === "ESCALATED"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <HeadphonesIcon size={13} />
                <span>
                  Cần hỗ trợ (Escalated:{" "}
                  {sessions.filter((s) => s.needsHumanSupport || s.escalated).length})
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadLogs}
                disabled={loadingLogs}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw
                  size={13}
                  className={loadingLogs ? "animate-spin" : ""}
                />
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={handleClearAllLogs}
                disabled={sessions.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Xóa toàn bộ nhật ký</span>
              </button>
            </div>
          </div>

          {/* Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Session List */}
            <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-2xs">
              <div className="border-b border-line bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700">
                Danh sách phiên hội thoại ({filteredSessions.length})
              </div>
              <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
                {loadingLogs && sessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted">
                    Đang tải danh sách phiên...
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted">
                    Chưa có phiên hội thoại nào phù hợp bộ lọc.
                  </div>
                ) : (
                  filteredSessions.map((sess) => {
                    const sid = sess.sessionId || sess.id || "";
                    const active = sid === (selectedSession?.sessionId || selectedSession?.id);
                    const isEscalated = Boolean(
                      sess.needsHumanSupport || sess.escalated
                    );
                    const turnsCount = (sess.turns || sess.messages || []).length;

                    return (
                      <div
                        key={sid}
                        onClick={() => setSelectedSessionId(sid)}
                        className={`p-3.5 cursor-pointer transition-colors ${
                          active
                            ? "bg-brand-50/70 border-l-4 border-brand-500"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-ink truncate">
                              {sess.userName || sess.userEmail || sess.userId || "Người dùng"}
                            </div>
                            <div className="font-mono text-[10px] text-muted truncate">
                              {sid}
                            </div>
                          </div>
                          {isEscalated && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                              Cần hỗ trợ
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{turnsCount} lượt trao đổi</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(sid);
                            }}
                            title="Xóa phiên này"
                            className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Session Detail & Tool Inspector */}
            <div className="lg:col-span-2 rounded-2xl border border-line bg-surface flex flex-col overflow-hidden shadow-2xs">
              {!selectedSession ? (
                <div className="flex-1 flex items-center justify-center p-10 text-xs text-muted">
                  Chọn một phiên hội thoại bên trái để xem chi tiết lượt chat, Tool Traces và gửi phản hồi.
                </div>
              ) : (
                <>
                  <div className="border-b border-line bg-slate-50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-ink">
                        {selectedSession.userName ||
                          selectedSession.userEmail ||
                          selectedSession.userId ||
                          "Phiên hội thoại"}
                      </div>
                      <div className="font-mono text-[11px] text-muted">
                        Session: {selectedSession.sessionId || selectedSession.id}
                        {selectedSession.userRole
                          ? ` · Role: ${selectedSession.userRole}`
                          : ""}
                      </div>
                    </div>
                    {(selectedSession.needsHumanSupport ||
                      selectedSession.escalated) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                        <HeadphonesIcon size={12} />
                        Đang chờ Phòng TCHC / Admin hỗ trợ
                      </span>
                    )}
                  </div>

                  <div className="flex-1 p-5 space-y-4 max-h-[460px] overflow-y-auto">
                    {selectedTurns.map((turn, idx) => {
                      const isUser = turn.role === "user";
                      const isAdmin = turn.role === "admin";
                      return (
                        <div
                          key={turn.id || idx}
                          className={`rounded-xl border p-3.5 text-xs space-y-2 ${
                            isUser
                              ? "border-blue-200 bg-blue-50/50"
                              : isAdmin
                                ? "border-emerald-200 bg-emerald-50/70"
                                : "border-slate-200 bg-slate-50/70"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-slate-800">
                              {isUser
                                ? selectedSession.userName || "Người dùng"
                                : isAdmin
                                  ? turn.authorName || "Phòng TCHC / Admin"
                                  : "AI Agent BAHAU"}
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                              {turn.meta?.modelUsed && (
                                <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200">
                                  {turn.meta.modelUsed} · Tier{" "}
                                  {turn.meta.fallbackTier ?? 1} ·{" "}
                                  {turn.meta.latencyMs ?? 0}ms
                                </span>
                              )}
                              {(turn.timestamp || turn.createdAt) && (
                                <span>{turn.timestamp || turn.createdAt}</span>
                              )}
                            </div>
                          </div>

                          <div className="whitespace-pre-line text-slate-800 leading-relaxed">
                            {turn.content}
                          </div>

                          {turn.toolTraces && turn.toolTraces.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                              <div className="font-semibold text-[11px] text-slate-600">
                                Tool Traces ({turn.toolTraces.length}):
                              </div>
                              {turn.toolTraces.map((trace, tIdx) => {
                                const traceKey = `${idx}-${trace.id || tIdx}`;
                                const isOpen = Boolean(expandedTraceMap[traceKey]);
                                return (
                                  <div
                                    key={traceKey}
                                    className="rounded-lg border border-slate-200 bg-white p-2"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedTraceMap((prev) => ({
                                          ...prev,
                                          [traceKey]: !prev[traceKey],
                                        }))
                                      }
                                      className="flex w-full items-center justify-between text-left cursor-pointer"
                                    >
                                      <span className="font-mono text-[11px] font-bold text-slate-800">
                                        {trace.tool}{" "}
                                        <span className="font-sans font-normal text-slate-500">
                                          ({trace.status}
                                          {typeof trace.durationMs === "number"
                                            ? ` · ${trace.durationMs}ms`
                                            : ""}
                                          )
                                        </span>
                                      </span>
                                      {isOpen ? (
                                        <ChevronDown size={13} />
                                      ) : (
                                        <ChevronRight size={13} />
                                      )}
                                    </button>
                                    {isOpen && (
                                      <div className="mt-2 rounded bg-slate-950 p-2 font-mono text-[10px] text-slate-200 overflow-x-auto space-y-1">
                                        {trace.input && (
                                          <div>
                                            <span className="text-sky-400">input: </span>
                                            {JSON.stringify(trace.input, null, 2)}
                                          </div>
                                        )}
                                        {trace.output && (
                                          <div>
                                            <span className="text-emerald-400">
                                              output:{" "}
                                            </span>
                                            {JSON.stringify(trace.output, null, 2)}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Direct Admin / HR Reply Form */}
                  <form
                    onSubmit={handleReplySession}
                    className="border-t border-line bg-slate-50/70 p-4 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="Nhập phản hồi trực tiếp từ Phòng TCHC / Admin tới phiên này..."
                      className="flex-1 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyInput.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                    >
                      {sendingReply ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      <span>Gửi phản hồi</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
