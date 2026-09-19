"use client";

import React, { useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: Array<{
    documentNo: string;
    title: string;
    excerpt: string;
  }>;
  draftProposal?: {
    type: "LEAVE" | "TRAINING";
    summary: string;
    payload: Record<string, any>;
    status: "CONFIRMATION_REQUIRED" | "SUBMITTED";
  };
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Xin chào Thầy/Cô! Tôi là **Trợ lý ảo AI Quản trị Nhân sự BAHAU** của Trường Đại học Kiến trúc Đà Nẵng.\n\nTôi được huấn luyện trên hệ thống văn bản pháp quy, quy chế nội bộ của Nhà trường và có thể kết nối dữ liệu hồ sơ nhân sự của Thầy/Cô. Tôi có thể hỗ trợ Thầy/Cô:\n1. 🔍 **Tra cứu Quy chế & Định mức**: Giờ chuẩn giảng dạy KTS, nghỉ hè & nghỉ phép thường niên, nâng bậc lương định kỳ, tiêu chuẩn KPI.\n2. 📊 **Kiểm tra Số dư Cá nhân**: Số ngày phép năm còn lại, thời hạn hợp đồng, thời hạn chứng chỉ hành nghề.\n3. ✍️ **Soạn Thảo Đơn Nháp**: Tự động tạo đơn nghỉ phép, công tác có hộp xác nhận an toàn trước khi nộp.\n\nThầy/Cô có thể bấm vào các câu hỏi gợi ý bên dưới hoặc nhập câu hỏi trực tiếp!",
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const quickPrompts = [
    "Tôi còn bao nhiêu ngày phép trong năm nay?",
    "Định mức giờ chuẩn giảng viên kiến trúc sư (QĐ 128)?",
    "Điều kiện nâng lương trước hạn cho CBGV (QyĐ 89)?",
    "Quy chế đánh giá KPI khống chế 20% Loại A (QĐ 210)?",
    "Soạn đơn xin nghỉ phép 2 ngày đi việc gia đình",
  ];

  const handleSend = (queryToSend?: string) => {
    const q = queryToSend || inputQuery;
    if (!q.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsTyping(true);

    // Mô phỏng AI Assistant xử lý RAG thông minh
    setTimeout(() => {
      const qLower = q.toLowerCase();
      let reply = "";
      let sources: any[] | undefined = undefined;
      let draftProposal: any | undefined = undefined;

      if (qLower.includes("phép của tôi") || qLower.includes("số dư phép") || qLower.includes("ngày phép")) {
        reply =
          "Chào Thầy/Cô **ThS. Đỗ Tuấn Kiệt** (DAU240001),\n\nTheo dữ liệu Sổ cái Phép năm **2026** của Trường ĐH Kiến trúc Đà Nẵng:\n- Số dư ngày phép hiện tại của Thầy/Cô là: **10 ngày** (Đã tạm giữ 2 ngày cho đơn đang chờ duyệt).\n- Hạn ngạch cấp chuẩn đầu năm: **12 ngày**.\n- Thâm niên công tác: Chưa đủ 5 năm để cộng thêm ngày thâm niên.\n\nThầy/Cô có muốn tôi hỗ trợ khởi tạo đơn xin nghỉ phép không?";
        sources = [
          {
            documentNo: "45/QĐ-ĐHKT",
            title: "Quy định chế độ Nghỉ phép thường niên và Nghỉ hè của CBGV",
            excerpt:
              "Điều 3: CBGV được nghỉ phép 12 ngày làm việc hưởng nguyên lương; cứ đủ 5 năm công tác được cộng thêm 1 ngày phép thâm niên.",
          },
        ];
      } else if (qLower.includes("giờ chuẩn") || qLower.includes("128")) {
        reply =
          "Theo **Quyết định số 128/QĐ-ĐHKT** về Quy chế làm việc và Định mức giờ chuẩn Giảng viên DAU:\n\n1. **Định mức chuẩn**: Giảng viên tiêu chuẩn trực tiếp giảng dạy là **270 giờ chuẩn** trong năm học.\n2. **Giảm trừ kiêm nhiệm**: Giảng viên kiêm nhiệm Trưởng khoa được giảm **50%**, Trưởng bộ môn được giảm **30%** định mức giờ chuẩn.\n3. **Quy đổi đồ án chuyên ngành**:\n   - Hướng dẫn 1 đồ án tốt nghiệp Kiến trúc sư = **25 giờ chuẩn**.\n   - Hướng dẫn 1 đồ án môn học Kiến trúc = **3 giờ chuẩn/sinh viên**.";
        sources = [
          {
            documentNo: "128/QĐ-ĐHKT",
            title: "Quy chế làm việc và Định mức giờ chuẩn Giảng viên DAU",
            excerpt:
              "Điều 4: Định mức giờ chuẩn giảng dạy trong năm học đối với Giảng viên tiêu chuẩn là 270 giờ chuẩn giảng dạy trực tiếp...",
          },
        ];
      } else if (qLower.includes("nâng lương") || qLower.includes("89")) {
        reply =
          "Theo **Quy định số 89/QyĐ-ĐHKT** về chế độ nâng bậc lương của Trường ĐH Kiến trúc Đà Nẵng:\n\n- **Nâng lương thường xuyên**:\n  + Giữ bậc **3 năm (36 tháng)** đối với ngạch yêu cầu trình độ Đại học (Cử nhân, Kỹ sư, Kiến trúc sư).\n  + Giữ bậc **2 năm (24 tháng)** đối với chức danh có trình độ Thạc sĩ, Tiến sĩ.\n- **Nâng lương trước thời hạn**:\n  + CBGV đạt danh hiệu Chiến sĩ thi đua cơ sở hoặc đạt **KPI Xuất sắc (Loại A)** 02 năm liên tiếp được xét nâng bậc lương trước thời hạn **tối đa 06 tháng**.";
        sources = [
          {
            documentNo: "89/QyĐ-ĐHKT",
            title: "Quy định chế độ Nâng bậc lương thường xuyên và Nâng lương trước thời hạn",
            excerpt:
              "Điều 6: Thời gian giữ bậc để xét nâng bậc lương thường xuyên là 3 năm với cử nhân, 2 năm với thạc sĩ/tiến sĩ; nâng sớm tối đa 6 tháng...",
          },
        ];
      } else if (qLower.includes("kpi") || qLower.includes("210") || qLower.includes("loại a")) {
        reply =
          "Theo **Quyết định số 210/QĐ-ĐHKT** về Quy chế Đánh giá KPI & Thi đua khen thưởng hàng năm:\n\n- **Thang điểm chuẩn**: 100 điểm, chia làm 2 bộ tiêu chí phân hóa cho Giảng viên (Giảng dạy, NCKH, Phục vụ) và Chuyên viên.\n- **Khống chế tỷ lệ Loại A**: Xếp loại Hoàn thành xuất sắc nhiệm vụ (Loại A, từ 90 đến 100 điểm) **không vượt quá 20%** tổng số CBGV của toàn đơn vị.\n- **Nguyên tắc Anti-Self-Approval**: Trưởng đơn vị không được tự duyệt đánh giá của chính mình mà phải do Hội đồng Ban Giám hiệu phê duyệt.";
        sources = [
          {
            documentNo: "210/QĐ-ĐHKT",
            title: "Quy chế Đánh giá KPI, Đánh giá hiệu quả công việc và Thi đua khen thưởng",
            excerpt:
              "Điều 8: Thang điểm chuẩn 100 điểm. Loại A đạt từ 90-100đ, khống chế tỷ lệ tối đa không vượt quá 20% tổng số CBGV đơn vị...",
          },
        ];
      } else if (qLower.includes("soạn") || qLower.includes("đơn") || qLower.includes("nghỉ")) {
        reply =
          "Tôi đã khởi tạo bản dự thảo đơn xin nghỉ phép theo đúng thể thức hành chính của Trường Đại học Kiến trúc Đà Nẵng.\n\nVui lòng xem xét các thông tin trong hộp đề xuất bên dưới. Để đảm bảo an toàn, đơn chỉ được gửi chính thức khi Thầy/Cô bấm nút **Xác nhận gửi đơn**.";
        draftProposal = {
          type: "LEAVE",
          summary: "Đơn xin nghỉ phép thường niên: 2 ngày từ 2026-10-15 đến 2026-10-16",
          payload: {
            leaveType: "ANNUAL",
            startDate: "2026-10-15",
            endDate: "2026-10-16",
            totalDays: 2,
            reason: q,
          },
          status: "CONFIRMATION_REQUIRED",
        };
        sources = [
          {
            documentNo: "45/QĐ-ĐHKT",
            title: "Quy định chế độ Nghỉ phép thường niên",
            excerpt: "Điều 3: Nghỉ phép thường niên được trừ trực tiếp vào sổ cái phép năm.",
          },
        ];
      } else {
        reply =
          "Tôi đã ghi nhận câu hỏi của Thầy/Cô. Dựa trên cơ sở tri thức pháp quy DAU, Thầy/Cô có thể tham khảo các quyết định số 128/QĐ-ĐHKT (Giờ chuẩn), 45/QĐ-ĐHKT (Nghỉ phép), 89/QyĐ-ĐHKT (Nâng lương), hoặc 210/QĐ-ĐHKT (KPI thi đua).\n\nThầy/Cô có thể đặt câu hỏi cụ thể hơn về quyền lợi hoặc định mức công tác để tôi phục vụ tốt nhất!";
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        sources,
        draftProposal,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleConfirmDraft = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.draftProposal) {
          return {
            ...m,
            draftProposal: {
              ...m.draftProposal,
              status: "SUBMITTED",
            },
          };
        }
        return m;
      })
    );
    alert("🎉 Đơn xin nghỉ phép đã được nộp thành công vào luồng phê duyệt của Trưởng khoa!");
  };

  return (
    <AuthGuard moduleName="Trợ lý Ảo AI Quy chế DAU">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[750px]">
      {/* Sidebar: Cơ sở Tri thức Quy chế DAU */}
      <div className="lg:col-span-1 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <span className="text-base">📚</span>
            <h3 className="text-sm font-bold text-slate-900">Cơ Sở Tri Thức DAU</h3>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Các văn bản quy chế pháp quy nội bộ phục vụ bộ máy RAG AI:
          </p>

          <div className="mt-3 space-y-2.5">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-900">
                128/QĐ-ĐHKT
              </span>
              <p className="mt-1 text-xs font-semibold text-slate-800">
                Quy chế làm việc & Giờ chuẩn KTS
              </p>
              <p className="text-[11px] text-slate-500">270 giờ chuẩn, quy đổi đồ án 25h</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                45/QĐ-ĐHKT
              </span>
              <p className="mt-1 text-xs font-semibold text-slate-800">
                Nghỉ phép thường niên & Nghỉ hè
              </p>
              <p className="text-[11px] text-slate-500">12 ngày phép, 5 năm thâm niên +1</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-900">
                89/QyĐ-ĐHKT
              </span>
              <p className="mt-1 text-xs font-semibold text-slate-800">
                Nâng bậc lương định kỳ & trước hạn
              </p>
              <p className="text-[11px] text-slate-500">3 năm cử nhân, 2 năm thạc sĩ/tiến sĩ</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                210/QĐ-ĐHKT
              </span>
              <p className="mt-1 text-xs font-semibold text-slate-800">
                Đánh giá KPI & Thi đua khen thưởng
              </p>
              <p className="text-[11px] text-slate-500">Thang 100đ, tối đa 20% Loại A</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-900">
                15/QyĐ-ĐHKT
              </span>
              <p className="mt-1 text-xs font-semibold text-slate-800">
                Tiêu chuẩn CCHN Kiến trúc sư
              </p>
              <p className="text-[11px] text-slate-500">Điều kiện giảng dạy & chủ trì thiết kế</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-purple-900">
          🔒 <b>Bảo mật thông tin:</b> AI Assistant hoạt động trong mạng nội bộ DAU, không chia sẻ dữ liệu nhân sự ra các dịch vụ ngoài trường.
        </div>
      </div>

      {/* Main Chatbox: Giao diện Trò chuyện 2 chiều */}
      <div className="lg:col-span-3 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-xl font-bold">
              🤖
            </div>
            <div>
              <h2 className="text-base font-bold">Trợ Lý Ảo AI Quản Trị Nhân Sự DAU</h2>
              <p className="text-xs text-blue-200">
                Hỗ trợ tra cứu quy chế, số dư cá nhân và hỗ trợ soạn thảo đơn nháp 24/7
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/20 border border-emerald-400 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sẵn sàng</span>
          </span>
        </div>

        {/* Chat Messages Stream */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[500px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1 px-1">
                <span>{m.role === "user" ? "ThS. Đỗ Tuấn Kiệt" : "Trợ lý AI BAHAU"}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-900 text-white rounded-br-none shadow-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60"
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>

                {/* Thẻ trích dẫn văn bản pháp quy DAU */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs">
                    <p className="font-semibold text-slate-700 flex items-center space-x-1 mb-1.5">
                      <span>📌</span>
                      <span>Văn bản trích dẫn đối chiếu:</span>
                    </p>
                    <div className="space-y-1.5">
                      {m.sources.map((src, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-white/80 p-2 border border-slate-200 text-slate-600"
                        >
                          <span className="font-bold text-blue-900">{src.documentNo}</span>:{" "}
                          <span className="font-medium text-slate-800">{src.title}</span>
                          <p className="mt-0.5 text-[11px] text-slate-500 italic">
                            &quot;{src.excerpt}&quot;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hộp xem trước đơn nháp với nút Xác nhận gửi đơn */}
                {m.draftProposal && (
                  <div className="mt-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <span className="font-bold flex items-center space-x-1 text-sm">
                        <span>📝</span>
                        <span>Đề Xuất Đơn Nháp Chờ Xác Nhận</span>
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          m.draftProposal.status === "SUBMITTED"
                            ? "bg-emerald-200 text-emerald-900"
                            : "bg-amber-200 text-amber-900"
                        }`}
                      >
                        {m.draftProposal.status === "SUBMITTED" ? "ĐÃ NỘP" : "CHỜ XÁC NHẬN"}
                      </span>
                    </div>

                    <p className="mt-2 text-slate-800 font-medium">
                      {m.draftProposal.summary}
                    </p>

                    <div className="mt-3 flex items-center justify-end space-x-2">
                      {m.draftProposal.status === "CONFIRMATION_REQUIRED" ? (
                        <>
                          <button
                            onClick={() => alert("Đã hủy đơn nháp")}
                            className="rounded px-3 py-1.5 text-xs text-slate-600 hover:bg-amber-100"
                          >
                            Hủy bỏ
                          </button>
                          <button
                            onClick={() => handleConfirmDraft(m.id)}
                            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-800 transition"
                          >
                            ✅ Xác Nhận Gửi Đơn
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
                          <span>✔</span>
                          <span>Đã ghi vào hàng đợi phê duyệt</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 italic">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>Trợ lý AI đang tra cứu văn bản quy chế DAU...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts Suggestions */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-2.5">
          <div className="flex items-center space-x-1 text-xs text-slate-500 mb-1.5">
            <span>💡</span>
            <span>Gợi ý câu hỏi nhanh:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-blue-900 hover:text-blue-900 transition shadow-2xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-200 p-4 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Đặt câu hỏi về quy chế, số dư phép, hoặc yêu cầu soạn đơn..."
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50 transition flex items-center space-x-1.5"
            >
              <span>Gửi</span>
              <span>&rarr;</span>
            </button>
          </form>
        </div>
      </div>
      </div>
    </AuthGuard>
  );
}
