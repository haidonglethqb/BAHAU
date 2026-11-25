import type { AuthUser } from "@bahau/contracts";

export interface OpenAiToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const BAHAU_AGENT_TOOL_LABELS: Record<string, string> = {
  search_dau_policies: "Tra cứu quy chế & văn bản DAU",
  get_my_leave_balance: "Kiểm tra số dư ngày phép năm",
  get_my_attendance_summary: "Tra cứu bảng chấm công cá nhân",
  get_my_payslip: "Tra cứu phiếu lương cá nhân",
  get_my_profile_summary: "Xem tóm tắt hồ sơ nhân sự",
  get_hr_overview_alerts: "Tổng hợp cảnh báo điều hành nhân sự",
  get_payroll_period_summary: "Tổng hợp quỹ lương kỳ hiện tại",
  get_pending_approvals: "Kiểm tra hồ sơ đang chờ phê duyệt",
  propose_leave_request: "Lập dự thảo đơn xin nghỉ phép",
  propose_navigation: "Đề xuất mở trang nghiệp vụ",
  propose_attendance_adjustment: "Lập dự thảo đơn giải trình điều chỉnh công",
  search_employee_info: "Tìm kiếm thông tin nhân sự danh bạ DAU",
  get_employee_payroll_attendance: "Tra cứu bảng công & phiếu lương nhân sự",
};

const HR_ADMIN_ONLY_TOOLS = new Set([
  "get_hr_overview_alerts",
  "get_payroll_period_summary",
  "get_pending_approvals",
  "search_employee_info",
  "get_employee_payroll_attendance",
]);

const HR_ADMIN_ROLES = new Set(["ROLE_HR_OFFICER", "ROLE_SYSADMIN", "ROLE_RECTOR"]);

export const ALL_AGENT_TOOLS: OpenAiToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_dau_policies",
      description:
        "Tra cứu văn bản quy chế nội bộ Trường ĐH Kiến trúc Đà Nẵng (Định mức giờ chuẩn QĐ 128, Nghỉ phép/nghỉ hè QĐ 45, Nâng bậc lương QyĐ 89, KPI QĐ 210, Chứng chỉ hành nghề QyĐ 15, BHXH).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Từ khóa hoặc nội dung câu hỏi về quy chế cần tìm kiếm.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_leave_balance",
      description: "Lấy số dư ngày phép thường niên hiện tại của chính người dùng đang đăng nhập.",
      parameters: {
        type: "object",
        properties: {
          year: {
            type: "integer",
            description: "Năm cần tra cứu (mặc định là năm hiện tại theo giờ Việt Nam).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_attendance_summary",
      description:
        "Lấy tóm tắt bảng công theo tháng (ngày công chuẩn, công thực tế, đi muộn, về sớm, nghỉ phép, trạng thái hôm nay) của chính người dùng.",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "integer",
            description: "Tháng từ 1 đến 12 (mặc định tháng hiện tại).",
          },
          year: {
            type: "integer",
            description: "Năm (mặc định năm hiện tại).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_payslip",
      description:
        "Lấy phiếu lương cá nhân theo tháng/năm (lương ngạch bậc, phụ cấp, thu nhập tăng thêm KPI, giờ vượt chuẩn, BHXH 10.5%, thuế TNCN, thực lĩnh Net) của chính người dùng.",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "integer",
            description: "Tháng từ 1 đến 12 (mặc định tháng hiện tại).",
          },
          year: {
            type: "integer",
            description: "Năm (mặc định năm hiện tại).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_profile_summary",
      description:
        "Lấy thông tin tóm tắt hồ sơ cán bộ/giảng viên của chính người dùng (mã CBGV, họ tên, đơn vị công tác, chức vụ, học hàm/học vị, ngày tiếp nhận).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_hr_overview_alerts",
      description:
        "Chỉ dành cho Phòng TCHC, Ban Giám hiệu, Quản trị hệ thống: Lấy tổng quan nhân sự toàn trường và cảnh báo hợp đồng sắp hết hạn, chứng chỉ sắp hết hạn, yêu cầu chờ duyệt.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_payroll_period_summary",
      description:
        "Chỉ dành cho Phòng TCHC, Ban Giám hiệu, Quản trị hệ thống: Lấy tổng hợp quỹ lương toàn trường theo tháng/năm (tổng nhân sự, tổng Gross, tổng Net, tổng BHXH, thuế TNCN, trạng thái kỳ lương).",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "integer",
            description: "Tháng từ 1 đến 12 (mặc định tháng hiện tại).",
          },
          year: {
            type: "integer",
            description: "Năm (mặc định năm hiện tại).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pending_approvals",
      description:
        "Chỉ dành cho Phòng TCHC, Ban Giám hiệu, Quản trị hệ thống: Lấy danh sách hồ sơ/đơn từ đang chờ phê duyệt.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_leave_request",
      description:
        "Lập thẻ dự thảo đơn xin nghỉ phép để người dùng kiểm tra và bấm nút xác nhận gửi (KHÔNG tự ý ghi vào cơ sở dữ liệu).",
      parameters: {
        type: "object",
        properties: {
          leaveType: {
            type: "string",
            enum: ["ANNUAL", "SICK", "MATERNITY", "UNPAID", "BEREAVEMENT", "WEDDING", "ACADEMIC"],
            description: "Loại nghỉ phép (mặc định ANNUAL).",
          },
          startDate: {
            type: "string",
            description: "Ngày bắt đầu nghỉ theo định dạng YYYY-MM-DD (mặc định ngày mai).",
          },
          endDate: {
            type: "string",
            description: "Ngày kết thúc nghỉ theo định dạng YYYY-MM-DD.",
          },
          totalDays: {
            type: "number",
            description: "Tổng số ngày nghỉ, bội số của 0.5 và >= 0.5 (mặc định 1).",
          },
          reason: {
            type: "string",
            description: "Lý do xin nghỉ phép (tối thiểu 5 ký tự).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_navigation",
      description: "Đề xuất nút điều hướng nhanh tới một phân hệ hợp lệ trên giao diện BAHAU.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            enum: [
              "/dashboard",
              "/attendance",
              "/checkin",
              "/leave",
              "/payroll",
              "/employees",
              "/contracts",
              "/approvals",
              "/profile",
              "/admin/system",
            ],
            description: "Đường dẫn nội bộ hợp lệ trên BAHAU.",
          },
          title: {
            type: "string",
            description: "Tiêu đề hiển thị trên nút mở trang.",
          },
          subtitle: {
            type: "string",
            description: "Mô tả ngắn gọn chức năng của trang đích.",
          },
        },
        required: ["path", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_attendance_adjustment",
      description:
        "Lập thẻ dự thảo đơn giải trình điều chỉnh giờ chấm công (quên quẹt thẻ, đi muộn có lý do công vụ) để người dùng xác nhận gửi (KHÔNG tự ý ghi vào cơ sở dữ liệu).",
      parameters: {
        type: "object",
        properties: {
          workDate: {
            type: "string",
            description: "Ngày làm việc cần giải trình theo định dạng YYYY-MM-DD (mặc định hôm nay theo giờ Việt Nam).",
          },
          requestedCheckIn: {
            type: "string",
            description: "Giờ vào đề xuất (HH:mm như '08:00' hoặc chuỗi ISO).",
          },
          requestedCheckOut: {
            type: "string",
            description: "Giờ ra đề xuất (HH:mm như '17:00' hoặc chuỗi ISO).",
          },
          reason: {
            type: "string",
            description: "Lý do giải trình điều chỉnh giờ công (tối thiểu 5 ký tự).",
          },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_employee_info",
      description:
        "Chỉ dành cho Phòng TCHC, Ban Giám hiệu, Quản trị hệ thống: Tìm kiếm thông tin cán bộ, giảng viên trong danh bạ trường theo tên, mã CBGV hoặc email.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Tên, mã CBGV hoặc từ khóa tìm kiếm nhân sự.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_employee_payroll_attendance",
      description:
        "Chỉ dành cho Phòng TCHC, Ban Giám hiệu, Quản trị hệ thống: Tra cứu thông tin bảng chấm công và phiếu lương chi tiết của một cán bộ, giảng viên cụ thể theo mã hoặc họ tên.",
      parameters: {
        type: "object",
        properties: {
          employeeCode: {
            type: "string",
            description: "Mã CBGV của nhân sự cần tra cứu (ví dụ 'DAU260001').",
          },
          employeeName: {
            type: "string",
            description: "Họ và tên hoặc tên của nhân sự cần tra cứu.",
          },
          month: {
            type: "integer",
            description: "Tháng từ 1 đến 12 (mặc định tháng hiện tại).",
          },
          year: {
            type: "integer",
            description: "Năm (mặc định năm hiện tại).",
          },
        },
      },
    },
  },
];

export function isHrOrAdminUser(authUser: AuthUser): boolean {
  return (authUser.roles || []).some((role) => HR_ADMIN_ROLES.has(role));
}

export function getToolsForUser(authUser: AuthUser): OpenAiToolDefinition[] {
  const canUseHrAdminTools = isHrOrAdminUser(authUser);
  if (canUseHrAdminTools) {
    return ALL_AGENT_TOOLS;
  }
  return ALL_AGENT_TOOLS.filter((tool) => !HR_ADMIN_ONLY_TOOLS.has(tool.function.name));
}
