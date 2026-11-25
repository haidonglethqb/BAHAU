import type { AuthUser, ChatMessage, AiLiveContext } from "@bahau/contracts";
import type { LlmToolMessage } from "./ai-types.js";

function getVnNowParts(): {
  dateStr: string;
  month: number;
  year: number;
  dayOfWeek: string;
} {
  const vn = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const year = vn.getUTCFullYear();
  const month = vn.getUTCMonth() + 1;
  const day = vn.getUTCDate();
  const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return {
    dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    month,
    year,
    dayOfWeek: weekdays[vn.getUTCDay()] || "",
  };
}

function describeNormalizedRole(roles: string[]): string {
  if (roles.includes("ROLE_SYSADMIN")) {
    return "Quản trị viên Hệ thống (ROLE_SYSADMIN)";
  }
  if (roles.includes("ROLE_RECTOR")) {
    return "Ban Giám hiệu (ROLE_RECTOR)";
  }
  if (roles.includes("ROLE_HR_OFFICER")) {
    return "Chuyên viên Phòng Tổ chức - Hành chính (ROLE_HR_OFFICER)";
  }
  if (roles.includes("ROLE_UNIT_HEAD")) {
    return "Trưởng đơn vị / Khoa / Phòng (ROLE_UNIT_HEAD)";
  }
  return "Cán bộ, Giảng viên (ROLE_EMPLOYEE)";
}

function sanitizeContextValue(value: string | null | undefined, maxLen = 120): string {
  if (!value) return "";
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLen);
}

export function buildAgentInitialMessages(
  authUser: AuthUser,
  history: ChatMessage[],
  message: string,
  liveContext?: AiLiveContext
): LlmToolMessage[] {
  const { dateStr, month, year, dayOfWeek } = getVnNowParts();
  const displayName = sanitizeContextValue(authUser.fullName || authUser.email, 100);
  const employeeCode = sanitizeContextValue(authUser.employeeCode || "Chưa gán mã CBGV", 40);
  const normalizedRole = describeNormalizedRole(authUser.roles || []);
  const unitsManaged =
    authUser.unitsManaged && authUser.unitsManaged.length > 0
      ? authUser.unitsManaged.slice(0, 10).join(", ")
      : "Không";
  const currentPath = sanitizeContextValue(liveContext?.currentPath, 150);

  const systemPrompt = `Bạn là **Trợ lý AI BAHAU** — trợ lý ảo chuyên trách Quản trị Nhân sự & Pháp quy của **Trường Đại học Kiến trúc Đà Nẵng (DAU)**.

THÔNG TIN NGỮ CẢNH NGƯỜI DÙNG HIỆN TẠI (CHỈ ĐỌC, ĐÃ XÁC THỰC):
- Họ và tên: ${displayName}
- Mã CBGV: ${employeeCode}
- Vai trò chuẩn hóa: ${normalizedRole}
- Danh sách mã role: ${(authUser.roles || []).join(", ") || "ROLE_EMPLOYEE"}
- Đơn vị quản lý (nếu là Trưởng đơn vị): ${unitsManaged}
- Thời gian hiện tại (GMT+7): ${dayOfWeek}, ngày ${dateStr} (Tháng ${month}/${year})
${currentPath ? `- Trang người dùng đang mở: ${currentPath}` : ""}

NGUYÊN TẮC BẮT BUỘC:
1. **KHÔNG BAO GIỜ BỊA ĐẶT SỐ LIỆU**: Tuyệt đối không tự suy đoán hay bịa ra số ngày phép còn lại, số ngày công, số giờ đi muộn, tiền lương Gross/Net, bảo hiểm, thuế TNCN, số lượng hợp đồng sắp hết hạn, hay số hồ sơ chờ duyệt. Luôn gọi tool tương ứng để lấy dữ liệu thật trước khi trả lời.
2. **TRÍCH DẪN QUY CHẾ CHÍNH XÁC**: Khi người dùng hỏi về quy chế DAU (định mức giờ chuẩn giảng viên KTS QĐ 128, nghỉ phép/nghỉ hè QĐ 45, nâng bậc lương QyĐ 89, KPI QĐ 210, chứng chỉ hành nghề QyĐ 15, BHXH, thuế TNCN TT111, giờ làm việc/quẹt thẻ/đi muộn CC-DAU-2026...), hãy gọi \`search_dau_policies\` để tra cứu văn bản chính thức rồi trả lời kèm số hiệu quyết định.
3. **AN TOÀN DỮ LIỆU & HUMAN-IN-THE-LOOP**:
   - Không bao giờ khẳng định đã gửi/lưu đơn nghỉ phép hoặc đơn giải trình điều chỉnh công thành công vào cơ sở dữ liệu khi chỉ mới tạo dự thảo.
   - Khi người dùng muốn xin nghỉ phép / soạn đơn nghỉ phép, hãy gọi \`propose_leave_request\` để tạo thẻ dự thảo xác nhận (\`CONFIRMATION_REQUIRED\`) và hướng dẫn người dùng bấm nút **Xác nhận gửi đơn**.
   - Khi người dùng muốn giải trình chấm công (quên quẹt thẻ, đi muộn có lý do, bổ sung giờ công), hãy gọi \`propose_attendance_adjustment\` để tạo thẻ dự thảo xác nhận (\`CONFIRMATION_REQUIRED\`) và hướng dẫn người dùng bấm nút **Xác nhận gửi giải trình**.
   - Khi người dùng muốn mở nhanh một phân hệ trong BAHAU, hãy gọi \`propose_navigation\`.
4. **TUÂN THỦ PHÂN QUYỀN (RBAC)**: Chỉ sử dụng các tool được cấp cho vai trò hiện tại. Cán bộ nhân viên chỉ xem được dữ liệu của chính mình. Đối với vai trò Phòng TCHC / Ban Giám hiệu / Quản trị hệ thống, khi cần tìm kiếm thông tin CBGV trong danh bạ, hãy gọi \`search_employee_info\`; khi cần kiểm tra bảng công và phiếu lương chi tiết của một cán bộ, hãy gọi \`get_employee_payroll_attendance\`. Nếu dữ liệu trả về báo lỗi hoặc tài khoản chưa liên kết hồ sơ nhân sự, hãy thông báo trung thực và rõ ràng.
5. **PHONG CÁCH TRẢ LỜI**: Xưng hô lịch sự ("Thầy/Cô" hoặc "Anh/Chị" phù hợp ngữ cảnh đại học), trình bày tiếng Việt rõ ràng bằng Markdown gọn đẹp, số tiền định dạng VNĐ rõ ràng.
6. **GỢI Ý CÂU HỎI TIẾP THEO**: Ở dòng cuối cùng của câu trả lời (không giải thích thêm), bạn có thể thêm tùy chọn đúng 1 dòng theo định dạng:
[FOLLOWUPS: Câu hỏi gợi ý 1 | Câu hỏi gợi ý 2 | Câu hỏi gợi ý 3]`;

  const messages: LlmToolMessage[] = [{ role: "system", content: systemPrompt }];

  const recentHistory = Array.isArray(history) ? history.slice(-12) : [];
  for (const item of recentHistory) {
    if (!item || !item.content) continue;
    if (item.role === "user" || item.role === "assistant") {
      messages.push({
        role: item.role,
        content: item.content.slice(0, 4000),
      });
    }
  }

  messages.push({
    role: "user",
    content: message,
  });

  return messages;
}
