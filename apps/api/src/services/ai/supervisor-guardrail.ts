import type { AgentProposedAction, AuthUser } from "@bahau/contracts";
import { isHrOrAdminUser } from "./agent-tool-registry.js";

const FOLLOWUPS_REGEX = /\[FOLLOWUPS:\s*([^\]]+)\]\s*$/im;

export function extractInlineFollowUps(raw: string): {
  reply: string;
  inlineFollowUps: string[];
} {
  const match = raw.match(FOLLOWUPS_REGEX);
  if (!match) {
    return { reply: raw.trim(), inlineFollowUps: [] };
  }

  const inlineFollowUps = match[1]
    .split("|")
    .map((item) => item.trim().replace(/^[-*\d.)\s]+/, ""))
    .filter((item) => item.length >= 4 && item.length <= 120)
    .slice(0, 3);

  const reply = raw.replace(FOLLOWUPS_REGEX, "").trim();
  return { reply, inlineFollowUps };
}

export function redactSecretsInChunk(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_KEY]")
    .replace(/\bgsk_[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_KEY]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{10,}\b/gi, "Bearer [REDACTED_TOKEN]");
}

export function sanitizeReply(raw: string): string {
  if (!raw) return "";
  return redactSecretsInChunk(raw)
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function buildSmartFollowUps(params: {
  inlineFollowUps: string[];
  authUser: AuthUser;
  actions: AgentProposedAction[];
  lastUserMessage: string;
}): string[] {
  const { inlineFollowUps, authUser, actions, lastUserMessage } = params;
  const suggestions: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(clean);
  };

  for (const item of inlineFollowUps) {
    pushUnique(item);
    if (suggestions.length >= 3) return suggestions;
  }

  const hasLeaveDraft = actions.some((a) => a.type === "LEAVE_DRAFT");
  if (hasLeaveDraft) {
    pushUnique("Kiểm tra số dư ngày phép năm hiện tại của tôi");
    pushUnique("Quy định nghỉ phép thường niên theo QĐ 45/QĐ-ĐHKT");
  }

  const qLower = (lastUserMessage || "").toLowerCase();
  const isHrAdmin = isHrOrAdminUser(authUser);

  if (isHrAdmin) {
    if (authUser.roles.includes("ROLE_SYSADMIN")) {
      pushUnique("Tổng hợp cảnh báo hợp đồng & chứng chỉ sắp hết hạn");
      pushUnique("Kiểm tra tổng hợp quỹ lương kỳ hiện tại");
      pushUnique("Danh sách hồ sơ đang chờ phê duyệt");
    } else {
      pushUnique("Xem cảnh báo hợp đồng sắp hết hạn 30/60/90 ngày");
      pushUnique("Tổng hợp quỹ lương tháng này");
      pushUnique("Kiểm tra danh sách hồ sơ đang chờ phê duyệt");
    }
  } else {
    if (!qLower.includes("phép")) {
      pushUnique("Kiểm tra số dư phép năm hiện tại của tôi");
    }
    if (!qLower.includes("lương") && !qLower.includes("thu nhập")) {
      pushUnique("Xem phiếu lương tháng hiện tại của tôi");
    }
    if (!qLower.includes("công") && !qLower.includes("chấm công")) {
      pushUnique("Xem tổng hợp chấm công tháng này");
    }
    pushUnique("Định mức giờ chuẩn giảng viên theo QĐ 128/QĐ-ĐHKT");
    pushUnique("Soạn đơn xin nghỉ phép 1 ngày");
  }

  return suggestions.slice(0, 3);
}
