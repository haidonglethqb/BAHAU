import { prisma } from "@bahau/database";
import type {
  AiChatRequest,
  AiChatResponse,
  AuthUser,
  PolicyKnowledgeDto,
} from "@bahau/contracts";
import { AppError } from "../middlewares/error.middleware.js";
import { getAllPolicies } from "./ai/agent-fallback.js";
import { aiOrchestratorService } from "./ai/ai-orchestrator.service.js";

export class AiAssistantService {
  /**
   * Giải quyết AuthUser đầy đủ từ DB nếu caller chỉ truyền userId
   */
  private static async resolveAuthUser(userId: string): Promise<AuthUser> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roleAssignments: { include: { role: { select: { code: true } } } },
          employee: {
            select: {
              id: true,
              employeeCode: true,
              fullName: true,
              assignments: {
                where: { status: "ACTIVE", isHeadOfUnit: true },
                select: { unitId: true },
              },
            },
          },
        },
      });

      if (!user) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy tài khoản người dùng.");
      }

      return {
        id: user.id,
        email: user.email,
        employeeId: user.employee?.id ?? null,
        employeeCode: user.employee?.employeeCode ?? null,
        fullName: user.employee?.fullName ?? null,
        roles: (user.roleAssignments || []).map((ra) => ra.role.code),
        permissions: [],
        unitsManaged: (user.employee?.assignments || []).map((a) => a.unitId),
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      return {
        id: userId,
        email: "",
        employeeId: null,
        employeeCode: null,
        fullName: null,
        roles: ["ROLE_EMPLOYEE"],
        permissions: [],
        unitsManaged: [],
      };
    }
  }

  /**
   * Xử lý hội thoại AI Chatbot (ủy quyền cho AiOrchestratorService)
   */
  static async chat(
    userId: string,
    input: AiChatRequest,
    authUser?: AuthUser,
    sessionId?: string
  ): Promise<AiChatResponse> {
    const resolvedUser = authUser ?? (await this.resolveAuthUser(userId));
    return aiOrchestratorService.handleChat(resolvedUser, input, sessionId);
  }

  /**
   * Lấy danh sách các chính sách quy chế DAU có trong cơ sở tri thức
   */
  static async getPolicies(): Promise<PolicyKnowledgeDto[]> {
    return getAllPolicies();
  }
}
