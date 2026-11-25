import type { LlmToolCall } from "./ai-types.js";

export const TOOL_STREAM_HINTS: Record<string, string> = {
  search_dau_policies: "Đang tra cứu quy chế & văn bản nội bộ ĐH Kiến trúc Đà Nẵng...",
  get_my_leave_balance: "Đang kiểm tra số dư ngày phép năm của bạn...",
  get_my_attendance_summary: "Đang tổng hợp bảng chấm công tháng hiện tại...",
  get_my_payslip: "Đang tra cứu thông tin phiếu lương & bảo hiểm...",
  get_my_profile_summary: "Đang xem hồ sơ nhân sự và hợp đồng hiện tại...",
  get_hr_overview_alerts: "Đang quét cảnh báo nhân sự & hợp đồng sắp hết hạn...",
  get_payroll_period_summary: "Đang tổng hợp quỹ lương & trạng thái kỳ lương...",
  get_pending_approvals: "Đang kiểm tra danh sách hồ sơ chờ phê duyệt...",
  propose_leave_request: "Đang soạn dự thảo đơn xin nghỉ phép để bạn xác nhận...",
  propose_navigation: "Đang chuẩn bị lối tắt điều hướng tới màn hình nghiệp vụ...",
  propose_attendance_adjustment: "Đang soạn đơn giải trình điều chỉnh giờ công...",
  search_employee_info: "Đang tìm kiếm thông tin nhân sự trong danh bạ...",
  get_employee_payroll_attendance: "Đang tra cứu bảng công & phiếu lương nhân sự...",
};

interface RawStreamDelta {
  content?: string | null;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

export async function parseOpenAiSseStream(
  body: ReadableStream<Uint8Array>,
  onProgress?: (message: string) => void,
  onChunk?: () => void,
  onTextDelta?: (text: string) => void
): Promise<{ content: string; toolCalls: LlmToolCall[] }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let content = "";
  const callMap = new Map<number, { id: string; name: string; arguments: string }>();
  let lastStatus = "";
  let textNotified = false;
  let textDeltaBuffer = "";

  const emitStatus = (msg: string) => {
    if (msg && msg !== lastStatus) {
      lastStatus = msg;
      onProgress?.(msg);
    }
  };

  const pushTextDelta = (chunk: string) => {
    textDeltaBuffer += chunk;
    const upperBuffer = textDeltaBuffer.toUpperCase();

    const followupIdx = upperBuffer.indexOf("[FOLLOWUPS:");
    if (followupIdx !== -1) {
      if (followupIdx > 0) {
        onTextDelta?.(textDeltaBuffer.slice(0, followupIdx));
        textDeltaBuffer = textDeltaBuffer.slice(followupIdx);
      }
      return;
    }

    const TARGET = "[FOLLOWUPS:";
    let matchedPrefixLen = 0;
    const maxLen = Math.min(TARGET.length - 1, upperBuffer.length);
    for (let len = maxLen; len >= 1; len--) {
      const prefix = TARGET.slice(0, len);
      if (upperBuffer.endsWith(prefix)) {
        matchedPrefixLen = len;
        break;
      }
    }

    if (matchedPrefixLen > 0) {
      const safePart = textDeltaBuffer.slice(0, textDeltaBuffer.length - matchedPrefixLen);
      if (safePart.length > 0) {
        onTextDelta?.(safePart);
        textDeltaBuffer = textDeltaBuffer.slice(textDeltaBuffer.length - matchedPrefixLen);
      }
    } else {
      onTextDelta?.(textDeltaBuffer);
      textDeltaBuffer = "";
    }
  };

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return;

    try {
      const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: RawStreamDelta }> };
      const delta = parsed.choices?.[0]?.delta;
      if (!delta) return;

      const hasToolCalls = Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0;

      if (typeof delta.content === "string" && delta.content.length > 0) {
        content += delta.content;
        if (!textNotified && callMap.size === 0) {
          textNotified = true;
          emitStatus("Đang soạn phản hồi chi tiết cho bạn...");
        }
        if (onTextDelta && callMap.size === 0 && !hasToolCalls) {
          pushTextDelta(delta.content);
        }
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = typeof tc.index === "number" ? tc.index : 0;
          const existing = callMap.get(idx) ?? {
            id: tc.id || `call_${idx}`,
            name: "",
            arguments: "",
          };
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) {
            existing.name += tc.function.name;
            const hint = TOOL_STREAM_HINTS[existing.name];
            if (hint) emitStatus(hint);
          }
          if (tc.function?.arguments) {
            existing.arguments += tc.function.arguments;
          }
          callMap.set(idx, existing);
        }
      }
    } catch {
      // Ignore partial or non-JSON keepalive lines
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    onChunk?.();
    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split(/\r?\n/);
    sseBuffer = lines.pop() ?? "";
    for (const line of lines) processLine(line);
  }
  if (sseBuffer.trim()) processLine(sseBuffer);

  if (onTextDelta && callMap.size === 0 && textDeltaBuffer.length > 0) {
    const upperRemaining = textDeltaBuffer.toUpperCase();
    const isFollowup =
      upperRemaining.startsWith("[FOLLOWUPS:") ||
      upperRemaining.startsWith("[FOLLOWUPS");
    if (!isFollowup) {
      onTextDelta(textDeltaBuffer);
      textDeltaBuffer = "";
    }
  }

  const toolCalls: LlmToolCall[] = [...callMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .filter(([, v]) => v.name.length > 0)
    .map(([, v]) => ({
      id: v.id,
      type: "function" as const,
      function: { name: v.name, arguments: v.arguments },
    }));

  return { content, toolCalls };
}
