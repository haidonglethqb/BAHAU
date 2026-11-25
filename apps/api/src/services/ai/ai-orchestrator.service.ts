import { prisma } from "@bahau/database";
import {
  AiLeaveDraftPayloadSchema,
  CreateAttendanceAdjustmentSchema,
  type AiChatRequest,
  type AiChatResponse,
  type AuthUser,
} from "@bahau/contracts";
import { AppError } from "../../middlewares/error.middleware.js";
import { AttendanceService } from "../attendance.service.js";
import { LeaveService } from "../leave.service.js";
import { agentLoopService, AgentLoopService } from "./agent-loop.service.js";
import { aiLogService, AiLogService } from "./ai-log.service.js";
import { aiQuotaService, AiQuotaService } from "./ai-quota.service.js";
import type { AgentStreamEvent } from "./ai-types.js";
import { buildSmartFollowUps } from "./supervisor-guardrail.js";

const ESCALATION_PATTERNS = [
  "gặp nhân sự",
  "chuyển phòng tchc",
  "hỗ trợ trực tiếp",
  "liên hệ tchc",
  "liên hệ phòng tchc",
  "nói chuyện với nhân sự",
  "gặp chuyên viên",
  "chuyển nhân sự",
];

function isEscalationIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_PATTERNS.some((p) => lower.includes(p));
}

function emitDeltaChunks(text: string, onEvent?: (event: AgentStreamEvent) => void): void {
  if (!onEvent || !text) return;
  const chunkSize = 48;
  for (let i = 0; i < text.length; i += chunkSize) {
    onEvent({ type: "delta", text: text.slice(i, i + chunkSize) });
  }
}

export class AiOrchestratorService {
  constructor(
    private readonly loopService: Pick<AgentLoopService, "run"> = agentLoopService,
    private readonly logService: Pick<AiLogService, "recordTurn" | "markEscalated"> = aiLogService,
    private readonly quotaService: Pick<AiQuotaService, "reserve"> = aiQuotaService
  ) {}

  async handleChat(
    authUser: AuthUser,
    input: AiChatRequest,
    sessionId?: string
  ): Promise<AiChatResponse> {
    return this.handleChatStream(authUser, input, sessionId);
  }

  async handleChatStream(
    authUser: AuthUser,
    input: AiChatRequest,
    sessionId?: string,
    onEvent?: (event: AgentStreamEvent) => void
  ): Promise<AiChatResponse> {
    const startedAt = Date.now();
    const effectiveSessionId = sessionId?.trim() || input.sessionId?.trim() || `user:${authUser.id}`;
    const userMeta = {
      userId: authUser.id,
      userEmail: authUser.email,
      userName: authUser.fullName ?? authUser.email,
    };

    const emit = (ev: AgentStreamEvent) => onEvent?.(ev);

    // 1. Xử lý xác nhận gửi đơn nghỉ phép nháp (Human-in-the-Loop)
    if (input.confirmDraft) {
      if (!authUser.employeeId) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Tài khoản của bạn chưa được liên kết với Hồ sơ Cán bộ, Giảng viên để gửi đơn nghỉ phép."
        );
      }

      if (!input.draftPayload) {
        throw new AppError(422, "VALIDATION_FAILED", "Thiếu dữ liệu dự thảo đơn nghỉ phép (draftPayload).");
      }

      const parsedDraft = AiLeaveDraftPayloadSchema.safeParse(input.draftPayload);
      if (!parsedDraft.success) {
        throw new AppError(
          422,
          "VALIDATION_FAILED",
          parsedDraft.error.issues[0]?.message || "Dữ liệu dự thảo đơn nghỉ phép không hợp lệ."
        );
      }

      let createdLeave;
      try {
        createdLeave = await LeaveService.createLeaveRequest(authUser, parsedDraft.data);
      } catch (err) {
        if (err instanceof AppError && err.code === "INSUFFICIENT_LEAVE_BALANCE") {
          const failResp: AiChatResponse = {
            reply: `⚠️ Không thể khởi tạo đơn: ${err.message}`,
            meta: {
              modelUsed: "bahau-workflow",
              fallbackTier: 0,
              latencyMs: Math.max(1, Date.now() - startedAt),
              provider: "LOCAL_ONLY",
            },
          };
          emitDeltaChunks(failResp.reply, emit);
          emit({ type: "complete", response: failResp });
          return failResp;
        }
        throw err;
      }

      try {
        await prisma.outboxEvent.create({
          data: {
            aggregateType: "LEAVE_REQUEST",
            aggregateId: createdLeave.id,
            eventType: "LEAVE_REQUEST_SUBMITTED",
            payload: {
              employeeEmail: authUser.email,
              employeeName: authUser.fullName || authUser.email,
              reason: createdLeave.reason,
              days: createdLeave.totalDays,
            },
            idempotencyKey: `AI-LEAVE-${createdLeave.id}`,
            status: "PENDING",
          },
        });
      } catch {
        // Best-effort outbox event
      }

      const summary = `Đơn nghỉ phép (${createdLeave.leaveType}): ${createdLeave.totalDays} ngày từ ${createdLeave.startDate} đến ${createdLeave.endDate}`;
      const response: AiChatResponse = {
        reply: `🎉 Đơn xin nghỉ phép của Thầy/Cô đã được khởi tạo thành công vào hệ thống với mã số **${createdLeave.id.slice(0, 8)}**.\n\nHệ thống đã tự động gửi sự kiện phê duyệt đến Trưởng đơn vị của Thầy/Cô. Thầy/Cô có thể theo dõi tiến độ duyệt tại phân hệ **Nghỉ phép & Công tác**.`,
        draftProposal: {
          type: "LEAVE",
          summary,
          payload: parsedDraft.data,
          status: "SUBMITTED",
          createdRecordId: createdLeave.id,
        },
        proposedActions: [
          {
            type: "LEAVE_DRAFT",
            title: "Đã gửi đơn xin nghỉ phép",
            subtitle: `Mã đơn ${createdLeave.id.slice(0, 8)} — Chờ phê duyệt`,
            summary,
            payload: parsedDraft.data,
            status: "SUBMITTED",
            createdRecordId: createdLeave.id,
          },
        ],
        meta: {
          modelUsed: "bahau-workflow",
          fallbackTier: 0,
          latencyMs: Math.max(1, Date.now() - startedAt),
          provider: "LOCAL_ONLY",
        },
      };

      this.logService.recordTurn(
        effectiveSessionId,
        {
          userMessage: input.message,
          modelUsed: "bahau-workflow",
          fallbackTier: 0,
          latencyMs: response.meta!.latencyMs,
          assistantReply: response.reply,
          proposedActions: response.proposedActions,
        },
        userMeta
      );

      emitDeltaChunks(response.reply, emit);
      emit({ type: "complete", response });
      return response;
    }

    // 1b. Xử lý xác nhận gửi đơn giải trình điều chỉnh công (Human-in-the-Loop)
    if (input.confirmAction?.type === "ATTENDANCE_ADJUSTMENT_DRAFT") {
      if (!authUser.employeeId) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Tài khoản của bạn chưa được liên kết với Hồ sơ Cán bộ, Giảng viên để gửi đơn giải trình điều chỉnh công."
        );
      }

      const payload = (input.confirmAction.payload ?? {}) as Record<string, any>;
      const workDate = String(payload.workDate || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
        throw new AppError(422, "VALIDATION_FAILED", "Ngày làm việc giải trình không đúng định dạng YYYY-MM-DD.");
      }

      const toIsoWithTz = (val: unknown, fieldLabel: string): string | undefined => {
        if (val === undefined || val === null || val === "") return undefined;
        if (typeof val !== "string") {
          throw new AppError(422, "VALIDATION_FAILED", `${fieldLabel} không hợp lệ.`);
        }
        const v = val.trim();
        if (!v) return undefined;
        const hhmm = v.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (hhmm) {
          const hNum = Number(hhmm[1]);
          const mNum = Number(hhmm[2]);
          if (hNum < 0 || hNum > 23 || mNum < 0 || mNum > 59) {
            throw new AppError(422, "VALIDATION_FAILED", `${fieldLabel} không hợp lệ (phải từ 00:00 đến 23:59).`);
          }
          const hh = String(hNum).padStart(2, "0");
          const mm = String(mNum).padStart(2, "0");
          return `${workDate}T${hh}:${mm}:00+07:00`;
        }
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
          const iso = v.includes("+") || v.endsWith("Z") ? v : `${v}+07:00`;
          if (Number.isNaN(Date.parse(iso))) {
            throw new AppError(422, "VALIDATION_FAILED", `${fieldLabel} không đúng định dạng thời gian hợp lệ.`);
          }
          return iso;
        }
        throw new AppError(422, "VALIDATION_FAILED", `${fieldLabel} phải theo định dạng HH:mm hoặc ISO datetime.`);
      };

      const adjustedCheckIn = toIsoWithTz(payload.requestedCheckIn, "Giờ vào ca");
      const adjustedCheckOut = toIsoWithTz(payload.requestedCheckOut, "Giờ tan ca");
      const reason = String(payload.reason || "").trim();

      const validatedAdj = CreateAttendanceAdjustmentSchema.safeParse({
        workDate,
        adjustedCheckIn,
        adjustedCheckOut,
        reason,
      });
      if (!validatedAdj.success) {
        throw new AppError(
          422,
          "VALIDATION_FAILED",
          validatedAdj.error.issues[0]?.message || "Dữ liệu giải trình chấm công không hợp lệ."
        );
      }

      const createdAdjustment = await AttendanceService.createAdjustmentRequest(
        validatedAdj.data,
        authUser
      );

      const checkInDisplay = payload.requestedCheckIn || "--:--";
      const checkOutDisplay = payload.requestedCheckOut || "--:--";
      const summary = `Giải trình công ngày ${workDate}: vào ${checkInDisplay}, ra ${checkOutDisplay} (Mã: ${createdAdjustment.id.slice(0, 8)})`;

      const response: AiChatResponse = {
        reply: `🎉 Đơn giải trình điều chỉnh giờ công ngày **${workDate}** của Thầy/Cô đã được gửi thành công với mã **${createdAdjustment.id.slice(0, 8)}**.\n\nHồ sơ đã được chuyển tới Trưởng đơn vị và Phòng TCHC xem xét phê duyệt. Thầy/Cô có thể theo dõi tiến độ tại phân hệ **Chấm công & Điểm danh**.`,
        proposedActions: [
          {
            type: "ATTENDANCE_ADJUSTMENT_DRAFT",
            title: "Đã gửi đơn giải trình chấm công",
            subtitle: `Mã đơn ${createdAdjustment.id.slice(0, 8)} — Chờ phê duyệt`,
            summary,
            payload: {
              workDate,
              requestedCheckIn: payload.requestedCheckIn,
              requestedCheckOut: payload.requestedCheckOut,
              reason,
            },
            status: "SUBMITTED",
            createdRecordId: createdAdjustment.id,
          },
        ],
        meta: {
          modelUsed: "bahau-workflow",
          fallbackTier: 0,
          latencyMs: Math.max(1, Date.now() - startedAt),
          provider: "LOCAL_ONLY",
        },
      };

      this.logService.recordTurn(
        effectiveSessionId,
        {
          userMessage: input.message,
          modelUsed: "bahau-workflow",
          fallbackTier: 0,
          latencyMs: response.meta!.latencyMs,
          assistantReply: response.reply,
          proposedActions: response.proposedActions,
        },
        userMeta
      );

      emitDeltaChunks(response.reply, emit);
      emit({ type: "complete", response });
      return response;
    }

    // 2. Phát hiện ý định chuyển Phòng TCHC hỗ trợ trực tiếp
    if (isEscalationIntent(input.message)) {
      this.logService.markEscalated(effectiveSessionId, {
        customerContact: authUser.email,
        reason: input.message,
        userMeta,
      });

      const reply =
        "Tôi đã ghi nhận yêu cầu và chuyển phiên hội thoại này tới **Phòng Tổ chức - Hành chính (TCHC)** để chuyên viên hỗ trợ trực tiếp cho Thầy/Cô.\n\nThầy/Cô sẽ nhận được phản hồi trực tiếp ngay tại khung trò chuyện này khi chuyên viên Phòng TCHC trả lời.";
      const response: AiChatResponse = {
        reply,
        quickFollowUps: buildSmartFollowUps({
          inlineFollowUps: [],
          authUser,
          actions: [],
          lastUserMessage: input.message,
        }),
        meta: {
          modelUsed: "human-handoff",
          fallbackTier: 0,
          latencyMs: Math.max(1, Date.now() - startedAt),
          provider: "LOCAL_ONLY",
        },
      };

      this.logService.recordTurn(
        effectiveSessionId,
        {
          userMessage: input.message,
          modelUsed: "human-handoff",
          fallbackTier: 0,
          latencyMs: response.meta!.latencyMs,
          assistantReply: reply,
        },
        userMeta
      );

      emitDeltaChunks(reply, emit);
      emit({ type: "complete", response });
      return response;
    }

    // 3. Kiểm tra hạn mức lượt hỏi AI hàng ngày
    this.quotaService.reserve(authUser.id);

    // 4. Thực thi Agent ReAct Loop
    const response = await this.loopService.run(authUser, input, emit);

    this.logService.recordTurn(
      effectiveSessionId,
      {
        userMessage: input.message,
        modelUsed: response.meta?.modelUsed || "unknown",
        fallbackTier: response.meta?.fallbackTier ?? 4,
        latencyMs: response.meta?.latencyMs ?? Math.max(1, Date.now() - startedAt),
        assistantReply: response.reply,
        toolTraces: response.toolTraces,
        proposedActions: response.proposedActions,
        sources: response.sources,
      },
      userMeta
    );

    emit({ type: "complete", response });
    return response;
  }
}

export const aiOrchestratorService = new AiOrchestratorService();
