import { prisma } from "@bahau/database";
import {
  AiChatRequest,
  AiChatResponse,
  AiLeaveDraftPayloadSchema,
  AuthUser,
  PolicyKnowledgeDto,
  PolicySourceCitation,
} from "@bahau/contracts";
import { AppError } from "../middlewares/error.middleware.js";
import { LeaveLedgerService } from "./leave-ledger.service.js";
import { LeaveService } from "./leave.service.js";

export class AiAssistantService {
  /**
   * Danh mục văn bản quy chế nội bộ DAU mặc định hỗ trợ tra cứu
   */
  private static defaultPolicies = [
    {
      documentNo: "128/QĐ-ĐHKT",
      title: "Quy chế làm việc và Định mức giờ chuẩn Giảng viên Trường Đại học Kiến trúc Đà Nẵng",
      category: "ACADEMIC_HOURS",
      chunkText:
        "Điều 4. Định mức giờ chuẩn giảng dạy trong năm học đối với Giảng viên tiêu chuẩn là 270 giờ chuẩn giảng dạy trực tiếp. Giảng viên kiêm nhiệm chức vụ quản lý (Trưởng khoa, Trưởng bộ môn) được giảm trừ từ 30% đến 50% định mức giờ chuẩn. Giờ hướng dẫn đồ án tốt nghiệp Kiến trúc sư được quy đổi 1 đồ án = 18 giờ chuẩn. Hướng dẫn đồ án môn học Kiến trúc quy đổi hệ số 1.25.",
      keywords: ["giờ chuẩn", "giảng viên", "270", "đồ án", "kiến trúc sư", "giảm trừ", "định mức"],
    },
    {
      documentNo: "45/QĐ-ĐHKT",
      title: "Quy định chế độ Nghỉ phép thường niên và Nghỉ hè của Cán bộ, Giảng viên",
      category: "LEAVE",
      chunkText:
        "Điều 3. Cán bộ, Giảng viên, Nhân viên làm việc trong điều kiện bình thường được nghỉ phép hàng năm 12 ngày làm việc hưởng nguyên lương. Cứ đủ 05 năm công tác tại Trường được cộng thêm 01 ngày nghỉ phép thâm niên. Giảng viên trực tiếp tham gia giảng dạy được bố trí nghỉ hè hàng năm theo kế hoạch đào tạo của Nhà trường, thời gian nghỉ hè thay thế cho nghỉ phép thường niên nhưng không vượt quá 06 tuần.",
      keywords: ["nghỉ phép", "thường niên", "12 ngày", "thâm niên", "nghỉ hè", "hưởng nguyên lương", "6 tuần", "phép năm"],
    },
    {
      documentNo: "89/QyĐ-ĐHKT",
      title: "Quy định chế độ Nâng bậc lương thường xuyên và Nâng bậc lương trước thời hạn",
      category: "SALARY",
      chunkText:
        "Điều 6. Thời gian giữ bậc để xét nâng bậc lương thường xuyên: 03 năm (đủ 36 tháng) đối với ngạch/chức danh yêu cầu trình độ đào tạo từ đại học trở lên (Cử nhân, Kỹ sư, Kiến trúc sư); 02 năm (đủ 24 tháng) đối với chức danh có bằng Thạc sĩ, Tiến sĩ. Cán bộ, Giảng viên đạt danh hiệu Chiến sĩ thi đua cấp cơ sở hoặc xếp loại KPI Xuất sắc (Loại A) 02 năm liên tiếp được xét nâng bậc lương trước thời hạn tối đa 06 tháng.",
      keywords: ["nâng lương", "bậc lương", "3 năm", "2 năm", "thạc sĩ", "tiến sĩ", "trước hạn", "loại A"],
    },
    {
      documentNo: "210/QĐ-ĐHKT",
      title: "Quy chế Đánh giá KPI, Đánh giá hiệu quả công việc và Thi đua khen thưởng hàng năm",
      category: "KPI",
      chunkText:
        "Điều 8. Đánh giá KPI và Xếp loại thi đua cuối năm học: Thang điểm chuẩn 100 điểm. Xếp loại A (Hoàn thành xuất sắc nhiệm vụ) đạt từ 90 đến 100 điểm, khống chế tỷ lệ tối đa không vượt quá 20% tổng số cán bộ, giảng viên của toàn đơn vị. Xếp loại B (Hoàn thành tốt nhiệm vụ) đạt từ 70 đến 89 điểm. Xếp loại C đạt từ 50 đến 69 điểm. Xếp loại D dưới 50 điểm. Trưởng đơn vị không được tự duyệt đánh giá của chính mình (nguyên tắc Anti-Self-Approval).",
      keywords: ["kpi", "xếp loại", "loại A", "20%", "thang điểm 100", "thi đua", "anti-self-approval"],
    },
    {
      documentNo: "15/QyĐ-ĐHKT",
      title: "Quy định tiêu chuẩn Chức danh nghề nghiệp và Chứng chỉ hành nghề chuyên môn",
      category: "TRAINING",
      chunkText:
        "Điều 5. Giảng viên giảng dạy các học phần chuyên ngành Kiến trúc, Quy hoạch và Công trình bắt buộc phải sở hữu Chứng chỉ hành nghề Kiến trúc sư hoặc Kỹ sư Xây dựng còn thời hạn hợp lệ theo Luật Kiến trúc và Luật Xây dựng. Để được bổ nhiệm chức danh Giảng viên chính (Hạng II), CBGV phải có bằng Thạc sĩ trở lên và Chứng chỉ Bồi dưỡng tiêu chuẩn chức danh Giảng viên đại học Hạng II do cơ sở đào tạo có thẩm quyền cấp.",
      keywords: ["chứng chỉ", "hành nghề", "kiến trúc sư", "kỹ sư xây dựng", "giảng viên chính", "hạng II", "sư phạm"],
    },
  ];

  private static getVnTodayDateStr(): string {
    return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];
  }

  private static addDaysToDateStr(dateStr: string, days: number): string {
    const base = new Date(`${dateStr}T00:00:00.000Z`);
    base.setUTCDate(base.getUTCDate() + days);
    return base.toISOString().split("T")[0];
  }

  private static scorePolicies(
    listToSearch: Array<{
      documentNo: string;
      title: string;
      category: string;
      chunkText: string;
      keywords: string[];
    }>,
    query: string
  ): PolicySourceCitation[] {
    const qLower = query.toLowerCase();
    const scored = listToSearch.map((pol) => {
      let score = 0;
      for (const kw of pol.keywords) {
        if (qLower.includes(kw.toLowerCase())) {
          score += 2;
        }
      }
      if (pol.title.toLowerCase().split(" ").some((w) => qLower.includes(w) && w.length > 3)) {
        score += 1;
      }
      if (pol.chunkText.toLowerCase().includes(qLower)) {
        score += 3;
      }
      return {
        documentNo: pol.documentNo,
        title: pol.title,
        category: pol.category,
        excerpt: pol.chunkText.slice(0, 200) + "...",
        relevanceScore: score,
      };
    });

    return scored.filter((s) => s.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Tra cứu văn bản quy chế liên quan theo từ khóa và nội dung
   */
  private static async searchPolicies(query: string): Promise<PolicySourceCitation[]> {
    // Thử tìm trong CSDL policy_knowledge trước
    try {
      const dbPolicies = await prisma.policyKnowledge.findMany();
      const listToSearch = dbPolicies.length > 0 ? dbPolicies : this.defaultPolicies;
      return this.scorePolicies(listToSearch, query);
    } catch {
      return this.scorePolicies(this.defaultPolicies, query);
    }
  }

  /**
   * Xử lý hội thoại AI Chatbot kết hợp RAG và Contextual Tools
   */
  static async chat(userId: string, input: AiChatRequest): Promise<AiChatResponse> {
    const message = input.message.trim();
    const mLower = message.toLowerCase();

    // 1. Tìm thông tin người dùng và nhân sự (nếu có)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: { include: { role: { select: { code: true } } } },
        employee: {
          include: {
            assignments: { where: { status: "ACTIVE" }, include: { unit: true, position: true } },
          },
        },
      },
    });

    const employee = user?.employee;

    // 2. Kiểm tra nếu là hành động XÁC NHẬN GỬI ĐƠN NHÁP (Draft Confirmation)
    if (input.confirmDraft) {
      if (!user || !employee) {
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

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        roles: (user.roleAssignments || []).map((ra) => ra.role.code),
        permissions: [],
        unitsManaged: [],
      };

      // Ủy quyền cho LeaveService.createLeaveRequest để đảm bảo $transaction + overlap + ledger + workflow
      let createdLeave;
      try {
        createdLeave = await LeaveService.createLeaveRequest(authUser, parsedDraft.data);
      } catch (err) {
        if (err instanceof AppError && err.code === "INSUFFICIENT_LEAVE_BALANCE") {
          return {
            reply: `⚠️ Không thể khởi tạo đơn: ${err.message}`,
          };
        }
        throw err;
      }

      // Tạo Outbox Event best-effort sau khi giao dịch đơn nghỉ phép đã commit
      try {
        await prisma.outboxEvent.create({
          data: {
            aggregateType: "LEAVE_REQUEST",
            aggregateId: createdLeave.id,
            eventType: "LEAVE_REQUEST_SUBMITTED",
            payload: {
              employeeEmail: user.email,
              employeeName: employee.fullName,
              reason: createdLeave.reason,
              days: createdLeave.totalDays,
            },
            idempotencyKey: `AI-LEAVE-${createdLeave.id}`,
            status: "PENDING",
          },
        });
      } catch {
        // Không làm hỏng phản hồi đơn đã tạo thành công
      }

      return {
        reply: `🎉 Đơn xin nghỉ phép của Thầy/Cô đã được khởi tạo thành công vào hệ thống với mã số **${createdLeave.id.slice(0, 8)}**.\n\nHệ thống đã tự động gửi sự kiện phê duyệt đến Trưởng đơn vị của Thầy/Cô. Thầy/Cô có thể theo dõi tiến độ duyệt tại phân hệ **Nghỉ phép & Công tác**.`,
        draftProposal: {
          type: "LEAVE",
          summary: `Đơn nghỉ phép (${createdLeave.leaveType}): ${createdLeave.totalDays} ngày từ ${createdLeave.startDate} đến ${createdLeave.endDate}`,
          payload: parsedDraft.data,
          status: "SUBMITTED",
          createdRecordId: createdLeave.id,
        },
      };
    }

    // 3. Tra cứu ngữ cảnh hồ sơ cá nhân: SỐ DƯ PHÉP
    if (
      mLower.includes("số dư phép") ||
      mLower.includes("còn bao nhiêu ngày phép") ||
      mLower.includes("phép của tôi") ||
      mLower.includes("ngày phép còn lại")
    ) {
      if (!employee) {
        return {
          reply: "Tài khoản của bạn chưa được liên kết với Hồ sơ Cán bộ, Giảng viên DAU để tra cứu số dư phép cá nhân.",
        };
      }

      const currentYear = Number(this.getVnTodayDateStr().slice(0, 4));
      const balance = await LeaveLedgerService.getBalance(employee.id, currentYear);
      const currentBalance = balance.remaining;

      return {
        reply: `Chào Thầy/Cô **${employee.fullName}**,\n\nTheo dữ liệu Sổ cái Phép năm **${currentYear}** của Trường ĐH Kiến trúc Đà Nẵng:\n- Số dư ngày phép hiện tại của Thầy/Cô là: **${currentBalance} ngày**.\n- Định mức cấp hàng năm: **12 ngày** (kèm cộng dồn thâm niên 1 ngày/5 năm công tác theo Quyết định số 45/QĐ-ĐHKT).\n\nThầy/Cô có muốn tôi hỗ trợ khởi tạo đơn xin nghỉ phép ngay bây giờ không?`,
        profileData: {
          employeeCode: employee.employeeCode,
          year: currentYear,
          remainingLeaveDays: currentBalance,
        },
        sources: [
          {
            documentNo: "45/QĐ-ĐHKT",
            title: "Quy định chế độ Nghỉ phép thường niên và Nghỉ hè của CBGV",
            category: "LEAVE",
            excerpt: "Điều 3: CBGV được nghỉ phép 12 ngày làm việc hưởng nguyên lương, đủ 5 năm thâm niên cộng 1 ngày...",
          },
        ],
      };
    }

    // 4. Phát hiện ý định SOẠN ĐƠN NHÁP (Draft Proposal Generation) - tránh chặn câu hỏi tra cứu quy chế
    const isPolicyQuestion = /(quy định|quy chế|chế độ|luật|hỏi|là gì|bao nhiêu ngày phép|thâm niên|nghỉ hè)/i.test(
      mLower
    );
    const isLeaveDraftIntent =
      mLower.includes("soạn đơn") ||
      mLower.includes("tạo đơn") ||
      mLower.includes("xin nghỉ") ||
      (mLower.includes("nghỉ phép") && !isPolicyQuestion);

    if (isLeaveDraftIntent) {
      let days = 1;
      const numericMatch = message.match(/(-?\d+(?:[.,]\d+)?)\s*(ngày|buổi|day|days)/i);
      if (numericMatch) {
        const rawQty = parseFloat(numericMatch[1].replace(",", "."));
        if (Number.isNaN(rawQty) || rawQty <= 0) {
          return {
            reply:
              "⚠️ Số ngày/buổi nghỉ phép phải lớn hơn 0 (tối thiểu 0.5 ngày hoặc 1 buổi). Vui lòng nhập lại số ngày nghỉ hợp lệ.",
          };
        }
        const unit = numericMatch[2].toLowerCase();
        days = unit === "buổi" ? rawQty * 0.5 : rawQty;
        days = Math.round(days * 2) / 2;
        if (days < 0.5) {
          return {
            reply:
              "⚠️ Số ngày nghỉ phép tối thiểu là 0.5 ngày (1 buổi). Vui lòng nhập lại số ngày nghỉ hợp lệ.",
          };
        }
      } else if (/nửa\s*(ngày|buổi)/i.test(message)) {
        days = 0.5;
      }

      const startDateStr = this.addDaysToDateStr(this.getVnTodayDateStr(), 1);
      const calendarDaysSpan = Math.max(0, Math.ceil(days) - 1);
      const endDateStr = this.addDaysToDateStr(startDateStr, calendarDaysSpan);

      const draftPayload = {
        leaveType: "ANNUAL",
        startDate: startDateStr,
        endDate: endDateStr,
        totalDays: days,
        reason: message,
      };

      return {
        reply: `Tôi đã lập dự thảo đơn xin nghỉ phép theo quy định của Trường Đại học Kiến trúc Đà Nẵng.\n\n**Thông tin dự thảo:**\n- Loại nghỉ: **Nghỉ phép thường niên**\n- Số ngày đăng ký: **${days} ngày**\n- Thời gian: Từ **${draftPayload.startDate}** đến **${draftPayload.endDate}**\n- Lý do: *${message}*\n\n⚠️ **Lưu ý**: Để đảm bảo tính an toàn dữ liệu, đơn này sẽ **chỉ được gửi chính thức** khi Thầy/Cô nhấn nút **Xác nhận gửi đơn** bên dưới.`,
        draftProposal: {
          type: "LEAVE",
          summary: `Đơn xin nghỉ phép thường niên (${days} ngày): từ ${draftPayload.startDate} đến ${draftPayload.endDate}`,
          payload: draftPayload,
          status: "CONFIRMATION_REQUIRED",
        },
        sources: [
          {
            documentNo: "45/QĐ-ĐHKT",
            title: "Quy định chế độ Nghỉ phép thường niên và Nghỉ hè của CBGV",
            category: "LEAVE",
            excerpt: "Điều 3: Nghỉ phép thường niên hưởng nguyên lương và trừ trực tiếp vào sổ cái phép năm.",
          },
        ],
      };
    }

    // 5. Tìm kiếm RAG trên cơ sở tri thức pháp quy DAU
    const sources = await this.searchPolicies(message);

    if (sources.length > 0) {
      const top = sources[0];
      let customAnswer = "";

      if (top.category === "ACADEMIC_HOURS") {
        customAnswer = `Theo **Quyết định số 128/QĐ-ĐHKT** về Quy chế làm việc và Định mức giờ chuẩn Giảng viên DAU:\n- **Định mức chuẩn**: Giảng viên tiêu chuẩn là **270 giờ chuẩn** giảng dạy trực tiếp trong năm học.\n- **Giảm trừ kiêm nhiệm**: CBGV kiêm nhiệm chức vụ quản lý (Trưởng khoa, Trưởng bộ môn) được giảm trừ từ **30% đến 50%** định mức giờ chuẩn.\n- **Quy đổi đồ án chuyên ngành**: Hướng dẫn 1 đồ án tốt nghiệp Kiến trúc sư = **18 giờ chuẩn**; hướng dẫn đồ án môn học Kiến trúc = **hệ số 1.25**.`;
      } else if (top.category === "SALARY") {
        customAnswer = `Theo **Quy định số 89/QyĐ-ĐHKT** về chế độ nâng bậc lương của Trường ĐH Kiến trúc Đà Nẵng:\n- **Nâng lương thường xuyên**: Thời gian giữ bậc là **3 năm (36 tháng)** đối với ngạch yêu cầu trình độ Đại học (KTS, Kỹ sư, Cử nhân); và **2 năm (24 tháng)** đối với trình độ Thạc sĩ, Tiến sĩ.\n- **Nâng lương trước thời hạn**: CBGV đạt danh hiệu Chiến sĩ thi đua cơ sở hoặc đạt **KPI Xuất sắc (Loại A)** trong 02 năm liên tiếp được xét nâng lương trước thời hạn **tối đa 06 tháng**.`;
      } else if (top.category === "KPI") {
        customAnswer = `Theo **Quyết định số 210/QĐ-ĐHKT** về Quy chế Đánh giá KPI & Thi đua khen thưởng hàng năm:\n- **Thang điểm chuẩn**: 100 điểm, chia làm 2 bộ mẫu tiêu chí phân hóa rõ rệt cho Giảng viên (Giảng dạy, NCKH, Phục vụ cộng đồng) và Chuyên viên (Khối lượng, Chất lượng, Phục vụ).\n- **Khống chế tỷ lệ Loại A**: Tỷ lệ xếp loại Hoàn thành xuất sắc nhiệm vụ (Loại A, từ 90đ trở lên) **không vượt quá 20%** tổng số CBGV của toàn đơn vị.\n- **Nguyên tắc Anti-Self-Approval**: Trưởng đơn vị không được tự duyệt đánh giá của chính mình mà phải do Hội đồng Ban Giám hiệu phê duyệt.`;
      } else if (top.category === "TRAINING") {
        customAnswer = `Theo **Quy định số 15/QyĐ-ĐHKT** về tiêu chuẩn chức danh và chứng chỉ hành nghề DAU:\n- Giảng viên trực tiếp giảng dạy khối chuyên ngành Kiến trúc, Quy hoạch, Xây dựng bắt buộc phải có **Chứng chỉ hành nghề Kiến trúc sư / Kỹ sư Xây dựng** còn thời hạn hợp lệ.\n- Tiêu chuẩn bổ nhiệm **Giảng viên chính (Hạng II)**: Yêu cầu có bằng Thạc sĩ trở lên và Chứng chỉ bồi dưỡng tiêu chuẩn chức danh nghề nghiệp Giảng viên đại học Hạng II.`;
      } else {
        customAnswer = `Theo văn bản pháp quy **${top.documentNo}** (${top.title}):\n${top.excerpt}`;
      }

      return {
        reply: customAnswer,
        sources: sources.slice(0, 3),
      };
    }

    // 6. Trả lời chung nếu không tìm thấy văn bản cụ thể
    return {
      reply: `Tôi là **Trợ lý ảo AI Quản trị Nhân sự BAHAU** của Trường Đại học Kiến trúc Đà Nẵng.\n\nTôi có thể hỗ trợ Thầy/Cô các tác vụ sau:\n1. **Tra cứu Quy chế & Định mức**: Định mức giờ chuẩn giảng viên KTS (QĐ 128), chế độ nghỉ hè và nghỉ phép thường niên (QĐ 45), quy định nâng lương (QyĐ 89), quy chế KPI (QĐ 210).\n2. **Tra cứu Số dư Cá nhân**: Kiểm tra số dư phép thường niên năm hiện tại, kiểm tra hạn hợp đồng và hạn chứng chỉ.\n3. **Hỗ trợ Soạn đơn Thông minh**: Soạn thảo đơn xin nghỉ phép, đề xuất cử đi bồi dưỡng chuyên môn kèm bước xác nhận trước khi gửi.\n\nThầy/Cô vui lòng đặt câu hỏi chi tiết hơn để tôi có thể hỗ trợ tốt nhất!`,
      sources: this.defaultPolicies.slice(0, 2).map((p) => ({
        documentNo: p.documentNo,
        title: p.title,
        category: p.category,
        excerpt: p.chunkText.slice(0, 150) + "...",
      })),
    };
  }

  /**
   * Lấy danh sách các chính sách quy chế DAU có trong cơ sở tri thức
   */
  static async getPolicies(): Promise<PolicyKnowledgeDto[]> {
    const mapDefaultPolicies = (): PolicyKnowledgeDto[] =>
      this.defaultPolicies.map((p, idx) => ({
        id: `00000000-0000-0000-0000-00000000000${idx + 1}`,
        documentNo: p.documentNo,
        title: p.title,
        category: p.category,
        chunkText: p.chunkText,
        keywords: p.keywords,
        createdAt: new Date().toISOString(),
      }));

    try {
      const list = await prisma.policyKnowledge.findMany({
        orderBy: { documentNo: "asc" },
      });

      if (list.length === 0) {
        return mapDefaultPolicies();
      }

      return list.map((p) => ({
        id: p.id,
        documentNo: p.documentNo,
        title: p.title,
        category: p.category,
        chunkText: p.chunkText,
        keywords: p.keywords,
        metadata: p.metadata as any,
        effectiveDate: p.effectiveDate ? p.effectiveDate.toISOString().split("T")[0] : null,
        createdAt: p.createdAt.toISOString(),
      }));
    } catch {
      return mapDefaultPolicies();
    }
  }
}
