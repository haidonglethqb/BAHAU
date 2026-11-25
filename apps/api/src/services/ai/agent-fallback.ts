import { prisma } from "@bahau/database";
import type {
  AgentProposedAction,
  AiChatRequest,
  AiChatResponse,
  AuthUser,
  PolicyKnowledgeDto,
  PolicySourceCitation,
} from "@bahau/contracts";
import { LeaveLedgerService } from "../leave-ledger.service.js";
import type { AgentStreamEvent } from "./ai-types.js";
import { buildSmartFollowUps } from "./supervisor-guardrail.js";

export interface PolicyKnowledgeDefaultItem {
  documentNo: string;
  title: string;
  category: string;
  chunkText: string;
  keywords: string[];
}

export const POLICY_KNOWLEDGE_DEFAULTS: PolicyKnowledgeDefaultItem[] = [
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
  {
    documentNo: "BHXH-VN-2024",
    title: "Quy định tỷ lệ trích đóng Bảo hiểm xã hội, BHYT, BHTN bắt buộc tại Trường ĐH Kiến trúc Đà Nẵng",
    category: "SALARY",
    chunkText:
      "Theo Luật Bảo hiểm xã hội và quy định hiện hành: Tổng tỷ lệ đóng bảo hiểm bắt buộc là 32% trên quỹ lương đóng BHXH. Trong đó, Người lao động đóng 10.5% (gồm 8% BHXH, 1.5% BHYT, 1% BHTN); Đơn vị sử dụng lao động (Nhà trường) đóng 21.5% (gồm 17.5% BHXH vào quỹ hưu trí/tử tuất/ốm đau thai sản/TNLĐ-BNN, 3% BHYT, 1% BHTN). Mức trần đóng BHXH/BHYT bằng 20 lần mức lương cơ sở.",
    keywords: ["bhxh", "bhyt", "bhtn", "bảo hiểm", "10.5%", "21.5%", "32%", "8%", "1.5%", "1%"],
  },
  {
    documentNo: "CC-DAU-2026",
    title: "Quy định Chấm công, Giờ làm việc và Xử lý Đi muộn/Về sớm tại Trường ĐH Kiến trúc Đà Nẵng",
    category: "ATTENDANCE",
    chunkText:
      "Điều 2. Khung giờ làm việc tiêu chuẩn: Buổi sáng từ 08:00 đến 12:00, Buổi chiều từ 13:00 đến 17:00 (tổng 8 giờ/ngày, từ Thứ Hai đến Thứ Sáu). Cán bộ, Giảng viên quẹt thẻ check-in sau 08:00 bị tính đi muộn, check-out trước 17:00 bị tính về sớm. Trường hợp quên quẹt thẻ hoặc có lý do công vụ, CBGV phải gửi đơn giải trình điều chỉnh giờ công kèm minh chứng trong vòng 48 giờ để Trưởng đơn vị và Phòng TCHC phê duyệt.",
    keywords: [
      "chấm công",
      "giờ làm việc",
      "08:00",
      "17:00",
      "đi muộn",
      "về sớm",
      "quên quẹt thẻ",
      "giải trình",
      "điều chỉnh công",
      "quẹt thẻ",
      "bị trừ lương",
      "di tre",
      "ve som",
      "cham cong",
      "giai trinh",
    ],
  },
  {
    documentNo: "TNCN-TT111",
    title: "Quy định Biểu thuế Thu nhập cá nhân và Mức giảm trừ gia cảnh theo Thông tư 111/2013/TT-BTC",
    category: "SALARY",
    chunkText:
      "Theo Thông tư 111/2013/TT-BTC và Nghị quyết 954/2020/UBTVQH14: Mức giảm trừ gia cảnh cho bản thân người nộp thuế là 11.000.000 VNĐ/tháng (132 triệu VNĐ/năm); mức giảm trừ cho mỗi người phụ thuộc là 4.400.000 VNĐ/tháng. Biểu thuế suất lũy tiến từng phần áp dụng 7 bậc: Bậc 1 (đến 5 triệu: 5%), Bậc 2 (trên 5-10 triệu: 10%), Bậc 3 (trên 10-18 triệu: 15%), Bậc 4 (trên 18-32 triệu: 20%), Bậc 5 (trên 32-52 triệu: 25%), Bậc 6 (trên 52-80 triệu: 30%), Bậc 7 (trên 80 triệu: 35%).",
    keywords: [
      "thuế tncn",
      "thue tncn",
      "giảm trừ gia cảnh",
      "giam tru gia canh",
      "11.000.000",
      "4.400.000",
      "người phụ thuộc",
      "nguoi phu thuoc",
      "lũy tiến",
      "7 bậc",
      "thông tư 111",
      "tt111",
      "thuế",
      "thue",
    ],
  },
];

function getVnTodayDateStr(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().split("T")[0];
}

export function normalizeVietnamese(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function scorePolicies(
  listToSearch: PolicyKnowledgeDefaultItem[],
  query: string
): PolicySourceCitation[] {
  const qNorm = normalizeVietnamese(query);
  const qTokens = qNorm.split(/\s+/).filter((w) => w.length > 1);

  const scored = listToSearch.map((pol) => {
    let score = 0;
    const titleNorm = normalizeVietnamese(pol.title);
    const docNoNorm = normalizeVietnamese(pol.documentNo);
    const chunkNorm = normalizeVietnamese(pol.chunkText);
    const keywordsNorm = pol.keywords.map((kw) => normalizeVietnamese(kw));

    // 1. Kiểm tra từ khóa (keywords)
    for (const kw of keywordsNorm) {
      if (qNorm.includes(kw)) {
        score += 3;
      } else if (kw.includes(qNorm) && qNorm.length > 3) {
        score += 2;
      } else {
        const kwTokens = kw.split(/\s+/).filter((w) => w.length > 1);
        const matchTokens = kwTokens.filter((t) => qTokens.includes(t));
        if (matchTokens.length > 0) {
          score += matchTokens.length;
        }
      }
    }

    // 2. Khớp tiêu đề văn bản
    if (titleNorm.includes(qNorm)) {
      score += 4;
    } else {
      const titleWords = titleNorm.split(/\s+/).filter((w) => w.length > 2);
      for (const w of titleWords) {
        if (qTokens.includes(w)) {
          score += 1;
        }
      }
    }

    // 3. Khớp số hiệu văn bản (documentNo)
    if (docNoNorm && (qNorm.includes(docNoNorm) || docNoNorm.includes(qNorm))) {
      score += 5;
    }

    // 4. Khớp trích đoạn nội dung (chunkText)
    if (chunkNorm.includes(qNorm)) {
      score += 4;
    } else {
      for (const token of qTokens) {
        if (token.length >= 3 && chunkNorm.includes(token)) {
          score += 0.5;
        }
      }
    }

    return {
      documentNo: pol.documentNo,
      title: pol.title,
      category: pol.category,
      excerpt: pol.chunkText.slice(0, 220) + (pol.chunkText.length > 220 ? "..." : ""),
      relevanceScore: Math.round(score * 10) / 10,
    };
  });

  return scored
    .filter((s) => (s.relevanceScore ?? 0) > 0)
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
}

export async function searchPoliciesLocalAndDb(query: string): Promise<PolicySourceCitation[]> {
  try {
    const dbPolicies = await prisma.policyKnowledge.findMany();
    const combined =
      dbPolicies.length > 0
        ? [
            ...dbPolicies.map((p) => ({
              documentNo: p.documentNo,
              title: p.title,
              category: p.category,
              chunkText: p.chunkText,
              keywords: p.keywords,
            })),
            // Đảm bảo quy định BHXH luôn sẵn có nếu DB chưa seed
            ...POLICY_KNOWLEDGE_DEFAULTS.filter(
              (def) => !dbPolicies.some((dbp) => dbp.documentNo === def.documentNo)
            ),
          ]
        : POLICY_KNOWLEDGE_DEFAULTS;
    return scorePolicies(combined, query);
  } catch {
    return scorePolicies(POLICY_KNOWLEDGE_DEFAULTS, query);
  }
}

export async function getAllPolicies(): Promise<PolicyKnowledgeDto[]> {
  const mapDefaultPolicies = (): PolicyKnowledgeDto[] =>
    POLICY_KNOWLEDGE_DEFAULTS.map((p, idx) => ({
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
      metadata: p.metadata as Record<string, unknown> | null,
      effectiveDate: p.effectiveDate ? p.effectiveDate.toISOString().split("T")[0] : null,
      createdAt: p.createdAt.toISOString(),
    }));
  } catch {
    return mapDefaultPolicies();
  }
}

function emitDeltaChunks(reply: string, onEvent?: (event: AgentStreamEvent) => void): void {
  if (!onEvent || !reply) return;
  const chunkSize = 48;
  for (let i = 0; i < reply.length; i += chunkSize) {
    onEvent({ type: "delta", text: reply.slice(i, i + chunkSize) });
  }
}

export async function runAgentDeterministicFallback(
  authUser: AuthUser,
  input: AiChatRequest,
  latencyMs: number,
  onEvent?: (event: AgentStreamEvent) => void
): Promise<AiChatResponse> {
  const message = input.message.trim();
  const mLower = message.toLowerCase();

  const finalize = (
    partial: Omit<AiChatResponse, "meta" | "quickFollowUps">
  ): AiChatResponse => {
    const actions: AgentProposedAction[] = partial.proposedActions ?? [];
    const quickFollowUps = buildSmartFollowUps({
      inlineFollowUps: [],
      authUser,
      actions,
      lastUserMessage: message,
    });
    const response: AiChatResponse = {
      ...partial,
      quickFollowUps,
      meta: {
        modelUsed: "fallback/bahau-local",
        fallbackTier: 4,
        latencyMs: Math.max(1, latencyMs),
        provider: "LOCAL_ONLY",
      },
    };
    emitDeltaChunks(response.reply, onEvent);
    return response;
  };

  // 1. Tra cứu số dư phép cá nhân
  if (
    mLower.includes("số dư phép") ||
    mLower.includes("còn bao nhiêu ngày phép") ||
    mLower.includes("phép của tôi") ||
    mLower.includes("ngày phép còn lại")
  ) {
    if (!authUser.employeeId) {
      return finalize({
        reply:
          "Tài khoản của bạn chưa được liên kết với Hồ sơ Cán bộ, Giảng viên DAU để tra cứu số dư phép cá nhân.",
      });
    }

    const currentYear = Number(getVnTodayDateStr().slice(0, 4));
    try {
      const balance = await LeaveLedgerService.getBalance(authUser.employeeId, currentYear);
      const currentBalance = balance.remaining;
      const displayName = authUser.fullName || authUser.email;

      return finalize({
        reply: `Chào Thầy/Cô **${displayName}**,\n\nTheo dữ liệu Sổ cái Phép năm **${currentYear}** của Trường ĐH Kiến trúc Đà Nẵng:\n- Số dư ngày phép hiện tại của Thầy/Cô là: **${currentBalance} ngày**.\n- Định mức cấp hàng năm: **12 ngày** (kèm cộng dồn thâm niên 1 ngày/5 năm công tác theo Quyết định số 45/QĐ-ĐHKT).\n\nThầy/Cô có muốn tôi hỗ trợ khởi tạo đơn xin nghỉ phép ngay bây giờ không?`,
        profileData: {
          employeeCode: authUser.employeeCode,
          year: currentYear,
          remainingLeaveDays: currentBalance,
        },
        sources: [
          {
            documentNo: "45/QĐ-ĐHKT",
            title: "Quy định chế độ Nghỉ phép thường niên và Nghỉ hè của CBGV",
            category: "LEAVE",
            excerpt:
              "Điều 3: CBGV được nghỉ phép 12 ngày làm việc hưởng nguyên lương, đủ 5 năm thâm niên cộng 1 ngày...",
          },
        ],
      });
    } catch {
      return finalize({
        reply:
          "Hiện không thể kết nối tới Sổ cái Phép trên cơ sở dữ liệu. Vui lòng thử lại sau hoặc mở phân hệ **Nghỉ phép & Công tác** để kiểm tra trực tiếp.",
        proposedActions: [
          {
            type: "NAVIGATE",
            title: "Mở phân hệ Nghỉ phép & Công tác",
            subtitle: "Xem sổ cái phép và gửi đơn trực tiếp",
            href: "/leave",
          },
        ],
      });
    }
  }

  // 2. Phát hiện ý định SOẠN ĐƠN NHÁP (Draft Proposal Generation)
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
        return finalize({
          reply:
            "⚠️ Số ngày/buổi nghỉ phép phải lớn hơn 0 (tối thiểu 0.5 ngày hoặc 1 buổi). Vui lòng nhập lại số ngày nghỉ hợp lệ.",
        });
      }
      const unit = numericMatch[2].toLowerCase();
      days = unit === "buổi" ? rawQty * 0.5 : rawQty;
      days = Math.round(days * 2) / 2;
      if (days < 0.5) {
        return finalize({
          reply:
            "⚠️ Số ngày nghỉ phép tối thiểu là 0.5 ngày (1 buổi). Vui lòng nhập lại số ngày nghỉ hợp lệ.",
        });
      }
    } else if (/nửa\s*(ngày|buổi)/i.test(message)) {
      days = 0.5;
    }

    const startDateStr = addDaysToDateStr(getVnTodayDateStr(), 1);
    const calendarDaysSpan = Math.max(0, Math.ceil(days) - 1);
    const endDateStr = addDaysToDateStr(startDateStr, calendarDaysSpan);

    const draftPayload = {
      leaveType: "ANNUAL",
      startDate: startDateStr,
      endDate: endDateStr,
      totalDays: days,
      reason: message.length >= 5 ? message : `${message} (Tạo qua Trợ lý AI)`,
    };

    const summary = `Đơn xin nghỉ phép thường niên (${days} ngày): từ ${draftPayload.startDate} đến ${draftPayload.endDate}`;

    return finalize({
      reply: `Tôi đã lập dự thảo đơn xin nghỉ phép theo quy định của Trường Đại học Kiến trúc Đà Nẵng.\n\n**Thông tin dự thảo:**\n- Loại nghỉ: **Nghỉ phép thường niên**\n- Số ngày đăng ký: **${days} ngày**\n- Thời gian: Từ **${draftPayload.startDate}** đến **${draftPayload.endDate}**\n- Lý do: *${draftPayload.reason}*\n\n⚠️ **Lưu ý**: Để đảm bảo tính an toàn dữ liệu, đơn này sẽ **chỉ được gửi chính thức** khi Thầy/Cô nhấn nút **Xác nhận gửi đơn** bên dưới.`,
      draftProposal: {
        type: "LEAVE",
        summary,
        payload: draftPayload,
        status: "CONFIRMATION_REQUIRED",
      },
      proposedActions: [
        {
          type: "LEAVE_DRAFT",
          title: "Dự thảo đơn xin nghỉ phép",
          subtitle: `Nghỉ phép thường niên (${days} ngày)`,
          summary,
          payload: draftPayload,
          status: "CONFIRMATION_REQUIRED",
        },
      ],
      sources: [
        {
          documentNo: "45/QĐ-ĐHKT",
          title: "Quy định chế độ Nghỉ phép thường niên và Nghỉ hè của CBGV",
          category: "LEAVE",
          excerpt: "Điều 3: Nghỉ phép thường niên hưởng nguyên lương và trừ trực tiếp vào sổ cái phép năm.",
        },
      ],
    });
  }

  // 3. Tìm kiếm RAG trên cơ sở tri thức pháp quy DAU
  const sources = await searchPoliciesLocalAndDb(message);
  if (sources.length > 0) {
    const top = sources[0];
    let customAnswer = "";

    if (top.category === "ACADEMIC_HOURS") {
      customAnswer = `Theo **Quyết định số 128/QĐ-ĐHKT** về Quy chế làm việc và Định mức giờ chuẩn Giảng viên DAU:\n- **Định mức chuẩn**: Giảng viên tiêu chuẩn là **270 giờ chuẩn** giảng dạy trực tiếp trong năm học.\n- **Giảm trừ kiêm nhiệm**: CBGV kiêm nhiệm chức vụ quản lý (Trưởng khoa, Trưởng bộ môn) được giảm trừ từ **30% đến 50%** định mức giờ chuẩn.\n- **Quy đổi đồ án chuyên ngành**: Hướng dẫn 1 đồ án tốt nghiệp Kiến trúc sư = **18 giờ chuẩn**; hướng dẫn đồ án môn học Kiến trúc = **hệ số 1.25**.`;
    } else if (top.documentNo === "BHXH-VN-2024") {
      customAnswer = `Theo **Quy định đóng Bảo hiểm bắt buộc (BHXH, BHYT, BHTN)** áp dụng tại DAU:\n- **Người lao động đóng 10.5%**: 8% BHXH + 1.5% BHYT + 1% BHTN.\n- **Nhà trường đóng 21.5%**: 17.5% BHXH + 3% BHYT + 1% BHTN.\n- **Tổng tỷ lệ đóng**: 32% trên quỹ lương đóng bảo hiểm (trần đóng BHXH/BHYT bằng 20 lần mức lương cơ sở).`;
    } else if (top.category === "ATTENDANCE" || top.documentNo === "CC-DAU-2026") {
      customAnswer = `Theo **Quy định Chấm công, Giờ làm việc & Kỷ luật lao động CC-DAU-2026** của Trường ĐH Kiến trúc Đà Nẵng:\n- **Khung giờ làm việc tiêu chuẩn**: 08:00–12:00 và 13:00–17:00 (Thứ Hai đến Thứ Sáu).\n- **Đi muộn / Về sớm**: Quẹt thẻ sau 08:00 bị tính đi muộn, quẹt thẻ trước 17:00 bị tính về sớm.\n- **Quên quẹt thẻ & Giải trình**: Cán bộ, Giảng viên phải gửi đơn giải trình điều chỉnh giờ công kèm minh chứng trong vòng 48 giờ để Trưởng đơn vị và Phòng TCHC xem xét duyệt.`;
    } else if (
      top.documentNo === "TNCN-TT111" ||
      (top.category === "SALARY" &&
        (mLower.includes("thuế") ||
          mLower.includes("thue") ||
          mLower.includes("tncn") ||
          mLower.includes("gia cảnh") ||
          mLower.includes("gia canh") ||
          mLower.includes("phụ thuộc") ||
          mLower.includes("phu thuoc")))
    ) {
      customAnswer = `Theo **Quy định Biểu thuế Thu nhập cá nhân (Thông tư 111/2013/TT-BTC & NQ 954/2020/UBTVQH14)**:\n- **Mức giảm trừ gia cảnh cho bản thân**: **11.000.000 VNĐ/tháng** (132 triệu VNĐ/năm).\n- **Mức giảm trừ cho mỗi người phụ thuộc**: **4.400.000 VNĐ/tháng**.\n- **Biểu thuế suất lũy tiến từng phần 7 bậc**: từ 5% (thu nhập tính thuế đến 5 triệu) đến 35% (trên 80 triệu VNĐ/tháng).`;
    } else if (top.category === "SALARY") {
      customAnswer = `Theo **Quy định số 89/QyĐ-ĐHKT** về chế độ nâng bậc lương của Trường ĐH Kiến trúc Đà Nẵng:\n- **Nâng lương thường xuyên**: Thời gian giữ bậc là **3 năm (36 tháng)** đối với ngạch yêu cầu trình độ Đại học (KTS, Kỹ sư, Cử nhân); và **2 năm (24 tháng)** đối với trình độ Thạc sĩ, Tiến sĩ.\n- **Nâng lương trước thời hạn**: CBGV đạt danh hiệu Chiến sĩ thi đua cơ sở hoặc đạt **KPI Xuất sắc (Loại A)** trong 02 năm liên tiếp được xét nâng lương trước thời hạn **tối đa 06 tháng**.`;
    } else if (top.category === "KPI") {
      customAnswer = `Theo **Quyết định số 210/QĐ-ĐHKT** về Quy chế Đánh giá KPI & Thi đua khen thưởng hàng năm:\n- **Thang điểm chuẩn**: 100 điểm, chia làm 2 bộ mẫu tiêu chí phân hóa rõ rệt cho Giảng viên (Giảng dạy, NCKH, Phục vụ cộng đồng) và Chuyên viên (Khối lượng, Chất lượng, Phục vụ).\n- **Khống chế tỷ lệ Loại A**: Tỷ lệ xếp loại Hoàn thành xuất sắc nhiệm vụ (Loại A, từ 90đ trở lên) **không vượt quá 20%** tổng số CBGV của toàn đơn vị.\n- **Nguyên tắc Anti-Self-Approval**: Trưởng đơn vị không được tự duyệt đánh giá của chính mình mà phải do Hội đồng Ban Giám hiệu phê duyệt.`;
    } else if (top.category === "TRAINING") {
      customAnswer = `Theo **Quy định số 15/QyĐ-ĐHKT** về tiêu chuẩn chức danh và chứng chỉ hành nghề DAU:\n- Giảng viên trực tiếp giảng dạy khối chuyên ngành Kiến trúc, Quy hoạch, Xây dựng bắt buộc phải có **Chứng chỉ hành nghề Kiến trúc sư / Kỹ sư Xây dựng** còn thời hạn hợp lệ.\n- Tiêu chuẩn bổ nhiệm **Giảng viên chính (Hạng II)**: Yêu cầu có bằng Thạc sĩ trở lên và Chứng chỉ bồi dưỡng tiêu chuẩn chức danh nghề nghiệp Giảng viên đại học Hạng II.`;
    } else {
      customAnswer = `Theo văn bản pháp quy **${top.documentNo}** (${top.title}):\n${top.excerpt}`;
    }

    return finalize({
      reply: customAnswer,
      sources: sources.slice(0, 3),
    });
  }

  // 4. Trả lời mặc định
  return finalize({
    reply: `Tôi là **Trợ lý ảo AI Quản trị Nhân sự BAHAU** của Trường Đại học Kiến trúc Đà Nẵng.\n\nTôi có thể hỗ trợ Thầy/Cô các tác vụ sau:\n1. **Tra cứu Quy chế & Định mức**: Định mức giờ chuẩn giảng viên KTS (QĐ 128), chế độ nghỉ hè và nghỉ phép thường niên (QĐ 45), quy định nâng lương (QyĐ 89), quy chế KPI (QĐ 210), tỷ lệ BHXH (10.5% / 21.5%).\n2. **Tra cứu Số dư Cá nhân**: Kiểm tra số dư phép thường niên năm hiện tại, bảng công, phiếu lương và hồ sơ nhân sự.\n3. **Hỗ trợ Soạn đơn Thông minh**: Soạn thảo đơn xin nghỉ phép kèm bước xác nhận trước khi gửi.\n\nThầy/Cô vui lòng đặt câu hỏi chi tiết hơn để tôi có thể hỗ trợ tốt nhất!`,
    sources: POLICY_KNOWLEDGE_DEFAULTS.slice(0, 2).map((p) => ({
      documentNo: p.documentNo,
      title: p.title,
      category: p.category,
      excerpt: p.chunkText.slice(0, 150) + "...",
    })),
  });
}
