import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AdminReplyItem, AiConversationSession, AiSessionTurn } from "./ai-types.js";

export type { AdminReplyItem, AiConversationSession, AiSessionTurn };

const MAX_SESSIONS = 100;

export interface SessionUserMeta {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

export class AiLogService {
  private sessionsMap = new Map<string, AiConversationSession>();
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath =
      filePath ?? process.env.BAHAU_AI_LOG_PATH ?? join(process.cwd(), ".data", "ai-sessions.json");
    this.loadSessions();
  }

  recordTurn(
    sessionId: string,
    turnData: Omit<AiSessionTurn, "id" | "turnIndex" | "timestamp">,
    userMeta?: SessionUserMeta
  ): AiConversationSession {
    const cleanSessionId = sessionId.trim() || "session_guest_default";
    const now = new Date().toISOString();

    const session =
      this.sessionsMap.get(cleanSessionId) ??
      this.createEmptySession(cleanSessionId, turnData.modelUsed, now, userMeta);

    const newTurn: AiSessionTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      turnIndex: session.turns.length + 1,
      timestamp: now,
      ...turnData,
    };

    session.turns.push(newTurn);
    session.turnsCount = session.turns.length;
    session.updatedAt = now;
    session.lastModelUsed = turnData.modelUsed;
    if (userMeta?.userId !== undefined) session.userId = userMeta.userId;
    if (userMeta?.userEmail !== undefined) session.userEmail = userMeta.userEmail;
    if (userMeta?.userName !== undefined) session.userName = userMeta.userName;

    this.sessionsMap.set(cleanSessionId, session);
    this.persistSessions();
    return session;
  }

  markEscalated(
    sessionId: string,
    opts?: {
      customerContact?: string | null;
      reason?: string | null;
      userMeta?: SessionUserMeta;
    }
  ): AiConversationSession {
    const cleanId = sessionId.trim() || "session_guest_default";
    const now = new Date().toISOString();
    const session =
      this.sessionsMap.get(cleanId) ??
      this.createEmptySession(cleanId, "human-handoff", now, opts?.userMeta);

    session.needsHumanSupport = true;
    session.escalatedAt = session.escalatedAt ?? now;
    if (opts?.customerContact?.trim()) session.customerContact = opts.customerContact.trim();
    if (opts?.reason?.trim()) session.escalationReason = opts.reason.trim();
    if (opts?.userMeta?.userId !== undefined) session.userId = opts.userMeta.userId;
    if (opts?.userMeta?.userEmail !== undefined) session.userEmail = opts.userMeta.userEmail;
    if (opts?.userMeta?.userName !== undefined) session.userName = opts.userMeta.userName;
    session.adminReplies = session.adminReplies ?? [];
    session.updatedAt = now;

    this.sessionsMap.set(cleanId, session);
    this.persistSessions();
    return session;
  }

  addAdminReply(
    sessionId: string,
    opts: { sender: string; message: string; resolveEscalation?: boolean }
  ): AiConversationSession | null {
    const session = this.sessionsMap.get(sessionId);
    if (!session) return null;

    const now = new Date().toISOString();
    const item: AdminReplyItem = {
      id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      sender: opts.sender,
      message: opts.message.trim(),
    };

    session.adminReplies = [...(session.adminReplies ?? []), item];
    if (opts.resolveEscalation === true) {
      session.needsHumanSupport = false;
    }
    session.updatedAt = now;

    this.sessionsMap.set(sessionId, session);
    this.persistSessions();
    return session;
  }

  getSessions(limit = 50): AiConversationSession[] {
    const list = Array.from(this.sessionsMap.values());
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list.slice(0, limit);
  }

  getSession(sessionId: string): AiConversationSession | null {
    return this.sessionsMap.get(sessionId) ?? null;
  }

  clearSessions(): void {
    this.sessionsMap.clear();
    this.persistSessions();
  }

  deleteSession(sessionId: string): boolean {
    const deleted = this.sessionsMap.delete(sessionId);
    if (deleted) this.persistSessions();
    return deleted;
  }

  private createEmptySession(
    sessionId: string,
    lastModelUsed: string,
    now: string,
    userMeta?: SessionUserMeta
  ): AiConversationSession {
    return {
      sessionId,
      userId: userMeta?.userId ?? null,
      userEmail: userMeta?.userEmail ?? null,
      userName: userMeta?.userName ?? null,
      createdAt: now,
      updatedAt: now,
      turnsCount: 0,
      lastModelUsed,
      turns: [],
      needsHumanSupport: false,
      escalatedAt: null,
      escalationReason: null,
      customerContact: null,
      adminReplies: [],
    };
  }

  private loadSessions(): void {
    try {
      if (!existsSync(this.filePath)) return;
      const raw = readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as AiConversationSession[];
      if (Array.isArray(parsed)) {
        for (const s of parsed) {
          if (s.sessionId) this.sessionsMap.set(s.sessionId, s);
        }
      }
    } catch {
      this.sessionsMap.clear();
    }
  }

  private persistSessions(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const list = Array.from(this.sessionsMap.values())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, MAX_SESSIONS);
      writeFileSync(this.filePath, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // Ignore file persistence errors
    }
  }
}

export const aiLogService = new AiLogService();
