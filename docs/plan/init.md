KẾ HOẠCH TRIỂN KHAI
Xây dựng hệ thống quản trị nhân sự thông minh cho Trường Đại học Kiến trúc Đà Nẵng tích hợp AI Assistant và DevOps
Công nghệ chính: Next.js, Express, Prisma, PostgreSQL.
Định hướng sản phẩm: Lấy cảm hứng từ cách HR Cloud kết nối các nghiệp vụ nhân sự trong một hệ thống, nhưng thiết kế quy trình và dữ liệu phù hợp với trường đại học.
Bản kế hoạch này đã kết hợp toàn bộ các phân hệ t yêu cầu. Những thông tin chưa được xác nhận—deadline, số người thực hiện, quy chế của trường, nguồn chấm công, ngân sách và hạ tầng—được ghi thành giả định để tiếp tục lập kế hoạch, không coi là yêu cầu đã chốt.
1. Định hướng và mục tiêu dự án
1.1. Định hướng sản phẩm
Xây dựng một hệ thống quản trị nhân sự tập trung, trong đó:
Hồ sơ nhân sự là dữ liệu nền; các nghiệp vụ được kết nối bằng workflow; thông báo tự động hỗ trợ xử lý công việc; AI Assistant giúp tra cứu và thực hiện yêu cầu có kiểm soát; DevOps bảo đảm hệ thống triển khai, kiểm thử và khôi phục được.

HR Cloud công khai mô hình nền tảng kết nối hồ sơ nhân sự, onboarding, quản lý thời gian, đánh giá, workflow, khảo sát và AI automation. Dự án tham khảo cách tổ chức và liên kết chức năng, không sao chép nguyên quy trình hay chính sách của sản phẩm này. HR Cloud
Trang giới thiệu chức năng Phòng Tổ chức – Nhân sự của trường có đề cập quản lý hồ sơ, hợp đồng, bồi dưỡng đội ngũ, phối hợp đánh giá và tổng hợp số liệu. Đây là nguồn tham khảo ban đầu; chưa thay thế việc khảo sát quy trình thực tế và xác nhận quy định hiện hành. Dau University
1.2. Mục tiêu cần đạt
Mục tiêu	Kết quả mong muốn
Tập trung dữ liệu	Mỗi nhân sự có một hồ sơ thống nhất, liên kết được hợp đồng, quá trình công tác, nghỉ phép, chấm công và đánh giá
Số hóa quy trình	Yêu cầu được gửi, duyệt, theo dõi và lưu lịch sử ngay trong hệ thống
Tự phục vụ	Cán bộ, giảng viên, nhân viên tự xem thông tin và thực hiện những thao tác được cấp quyền
Hỗ trợ quản lý	Trưởng đơn vị và nhân sự có danh sách công việc, dashboard và báo cáo theo phạm vi phụ trách
Ứng dụng AI thực chất	AI trả lời dựa trên nguồn được duyệt, tra dữ liệu đúng quyền và hỗ trợ thao tác có xác nhận
Vận hành có kiểm soát	Có CI/CD, kiểm thử tự động, theo dõi lỗi, sao lưu, khôi phục và quy trình phát hành


Không đặt mục tiêu AI thay thế phòng nhân sự hoặc tự quyết định kết quả đánh giá, phê duyệt và thay đổi hợp đồng.
2. Phạm vi và giả định lập kế hoạch
2.1. Phạm vi phiên bản chính
Phiên bản chính bao gồm:
Nhóm	Các phân hệ
Nhân sự nền tảng	Hồ sơ cán bộ/giảng viên/nhân viên; khoa, phòng ban và chức vụ; hợp đồng; quá trình công tác
Nghiệp vụ hằng ngày	Nghỉ phép; công tác; chấm công và điều chỉnh công
Phát triển và đánh giá	KPI/đánh giá; đào tạo, bồi dưỡng và chứng chỉ
Điều hành	Dashboard; báo cáo; workflow phê duyệt; công việc cần xử lý; thông báo tự động
Nền tảng thông minh	Kho tài liệu; AI Assistant hỏi đáp, tra cứu và hỗ trợ tạo yêu cầu
Kỹ thuật	Tài khoản, phân quyền, nhật ký; kiểm thử; CI/CD; giám sát; sao lưu và khôi phục


Onboarding và surveys nằm trong lộ trình mở rộng, tái sử dụng nền tảng đã có, không bị bỏ khỏi định hướng tổng thể.
2.2. Giả định dùng để xây dựng kế hoạch
Nội dung chưa chốt	Giả định tạm thời
Phạm vi tổ chức	Một trường; chưa xây nền tảng phục vụ nhiều trường độc lập
Giao diện	Web responsive, tiếng Việt; ưu tiên desktop cho quản trị
Tài khoản	Tài khoản nội bộ của ứng dụng; thiết kế sẵn điểm tích hợp SSO
Dữ liệu phát triển	Dữ liệu giả lập hoặc dữ liệu đã được xử lý và cho phép sử dụng
Chấm công	Bản đầu nhập/import theo mẫu thống nhất và duyệt điều chỉnh; chưa kết nối thiết bị
KPI	Bộ tiêu chí cấu hình theo nhóm nhân sự, có điểm và minh chứng; chưa lấy tự động từ hệ thống đào tạo
Workflow	Phê duyệt tuần tự, cấu hình theo loại yêu cầu và đơn vị
AI	Thử nghiệm trên dữ liệu giả lập; nhà cung cấp và việc xử lý dữ liệu thật cần được phê duyệt
Nhân lực để lập lịch	Hai lập trình viên làm toàn thời gian, có hỗ trợ QA/BA bán thời gian và đầu mối nghiệp vụ
Thời gian minh họa	24 tuần cho phiên bản chính; chưa phải cam kết tiến độ


Không đưa vào phiên bản chính: tính lương và thuế đầy đủ, quyết toán chi phí công tác, sinh trắc học, ký số chuyên dụng, quản lý thời khóa biểu, hệ thống nghiên cứu khoa học toàn diện hoặc AI tự chấm điểm nhân sự.
3. Người dùng và mô hình phân quyền
3.1. Nhóm người dùng
Nhóm	Quyền nghiệp vụ dự kiến
Cán bộ/giảng viên/nhân viên	Xem hồ sơ cá nhân, gửi yêu cầu, xem bảng công, tự đánh giá, cập nhật chứng chỉ, dùng AI
Trưởng khoa/phòng/bộ phận	Xem thông tin thuộc phạm vi được cấp, duyệt yêu cầu, đánh giá và xem báo cáo đơn vị
Phòng nhân sự	Quản lý hồ sơ, hợp đồng, quy trình, kỳ đánh giá, đào tạo, bảng công và báo cáo
Lãnh đạo	Xem báo cáo và xử lý những việc được phân công; không mặc định được sửa mọi dữ liệu
Quản trị kỹ thuật	Quản lý tài khoản, cấu hình và vận hành; không tự động được cấp toàn bộ quyền nghiệp vụ nhạy cảm


3.2. Nguyên tắc phân quyền
Quyền được xác định bằng:
Vai trò + phạm vi đơn vị + quan hệ với bản ghi + loại thông tin + trạng thái nghiệp vụ.

Ví dụ, trưởng khoa có thể xem danh sách giảng viên trong khoa nhưng chưa chắc được xem mọi trường thông tin trong hợp đồng. Nhân viên được sửa số điện thoại cá nhân nhưng thay đổi bằng cấp phải gửi yêu cầu xác nhận.
Backend phải kiểm tra quyền ở mỗi thao tác quan trọng, bao gồm tải file, xuất báo cáo, phê duyệt và gọi công cụ qua AI. Ẩn nút trên giao diện chỉ là hỗ trợ trải nghiệm.
Quyền quản trị ứng dụng và quyền quản trị hạ tầng cũng cần được phân biệt: người có đặc quyền database/server vẫn có khả năng truy cập kỹ thuật, nên cần kiểm soát truy cập, ghi nhận và quy trình sử dụng đặc quyền.
4. Thiết kế các phân hệ nghiệp vụ
4.1. Quản lý hồ sơ cán bộ, giảng viên, nhân viên
Chức năng: tạo và cập nhật hồ sơ; tìm kiếm, lọc; phân loại nhân sự; quản lý thông tin liên hệ, chuyên môn, học vị/học hàm nếu cần, trạng thái làm việc và tài liệu.
Hồ sơ liên kết tới đơn vị công tác, hợp đồng, quá trình công tác, nghỉ phép, chấm công, đánh giá và đào tạo.
Quy tắc thiết kế:
Tách tài khoản đăng nhập khỏi hồ sơ nhân sự. Khóa tài khoản không xóa hồ sơ và lịch sử. Các trường quan trọng phải lưu người sửa, thời điểm và nội dung thay đổi; không ghi toàn bộ dữ liệu nhạy cảm vào log kỹ thuật.
Import cần có bước kiểm tra, xem trước và báo lỗi theo dòng. Không ghi đè hàng loạt khi chưa xác định quy tắc xử lý trùng mã nhân sự.
Nghiệm thu: nhập dữ liệu mẫu, tìm được hồ sơ, xem lịch sử và kiểm chứng người không có quyền không đọc được thông tin hạn chế.
4.2. Quản lý khoa, phòng ban và chức vụ
Quản lý cây đơn vị, mã đơn vị, tên, cấp quản lý, người phụ trách và thời gian hoạt động.
Tách chức danh chuyên môn, chức vụ quản lý và phân công công tác. Một người có thể có đơn vị chính và các phân công kiêm nhiệm có thời hạn.
Việc thay đổi người phụ trách đơn vị phải được xem xét cùng workflow đang chạy; không tự động chuyển mọi đơn cũ mà không có lịch sử.
Nghiệm thu: điều chuyển hoặc kiêm nhiệm không làm mất lịch sử, không tạo thêm hồ sơ người và không đếm trùng trong báo cáo số lượng nhân sự.
4.3. Quản lý hợp đồng lao động
Quản lý số hợp đồng, loại hợp đồng, ngày ký, ngày hiệu lực, ngày kết thúc nếu có, phụ lục, file đính kèm và lịch sử gia hạn.
Hỗ trợ nhắc hợp đồng sắp hết hạn theo mốc cấu hình. Hợp đồng không có ngày kết thúc không đi vào cùng cơ chế nhắc hết hạn.
Quy tắc: không ghi đè bản hợp đồng cũ khi gia hạn; không cho AI tự thay đổi điều khoản; tài liệu hợp đồng phải được kiểm tra quyền khi truy cập.
Nghiệm thu: theo dõi được chuỗi hợp đồng/phụ lục, xác định đúng hợp đồng đang áp dụng và không gửi nhắc theo ngày hết hạn cũ sau khi đã gia hạn.
4.4. Quản lý nghỉ phép và công tác
Hai nghiệp vụ dùng chung hạ tầng phê duyệt nhưng có dữ liệu và cách xử lý khác nhau.
Nghỉ phép	Công tác
Loại phép, thời gian, số lượng phép, lý do, tài liệu	Mục đích, địa điểm, thời gian, nhiệm vụ, tài liệu/quyết định
Liên quan số dư và cách tính phép	Liên quan việc được cử đi và ghi nhận công
Có quy tắc cấp, sử dụng, điều chỉnh và hoàn phép	Không mặc định trừ vào số dư nghỉ phép


Cách tính ngày nghỉ, nửa ngày, ngày lễ, lịch làm việc và hạn mức phải được cấu hình theo chính sách đã xác nhận.
Thiết kế số dư: lưu các giao dịch cấp phép, điều chỉnh, giữ chỗ nếu áp dụng, sử dụng và hoàn phép; không chỉ lưu một con số rồi cộng/trừ tùy ý.
Chỉ khi hoàn thành bước duyệt cuối mới ghi nhận kết quả cuối cùng. Việc hủy đơn đã duyệt cần có quy trình hoàn trả và lịch sử tương ứng.
Nghiệm thu: gửi lại cùng yêu cầu hoặc duyệt đồng thời không làm trừ phép hai lần; sửa thời gian quan trọng phải được kiểm tra hoặc duyệt lại.
4.5. Quản lý chấm công
Bản đầu hỗ trợ nhập/import dữ liệu công, bảng công theo kỳ, phát hiện dữ liệu thiếu, yêu cầu điều chỉnh, phê duyệt và khóa kỳ công.
Tách ba lớp dữ liệu: dữ liệu đầu vào, dữ liệu điều chỉnh có phê duyệt và kết quả bảng công. Không sửa đè bản ghi gốc để che mất lịch sử.
Đối chiếu với nghỉ phép và công tác đã duyệt. Kỳ đã chốt chỉ được mở lại hoặc điều chỉnh qua thao tác có quyền và lý do.
Chấm công hành chính không đồng nghĩa với khối lượng giảng dạy. Không tự kết luận giảng viên vắng làm việc chỉ vì không có check-in. Giờ giảng, hướng dẫn và nhiệm vụ chuyên môn là nhóm dữ liệu riêng nếu triển khai sau.
Nghiệm thu: import trùng không tăng công; điều chỉnh có lịch sử; dữ liệu nghỉ/công tác được đối chiếu đúng; người không có quyền không mở được kỳ đã khóa.
4.6. Quản lý KPI và đánh giá
Quản lý kỳ đánh giá, đối tượng tham gia, mẫu tiêu chí, trọng số, tự đánh giá, minh chứng, người đánh giá, phản hồi và công bố kết quả.
Mẫu giảng viên và mẫu nhân viên cần tách biệt. Các nhóm tiêu chí như giảng dạy, nghiên cứu, nhiệm vụ chuyên môn hoặc chất lượng xử lý công việc chỉ là gợi ý, chưa phải quy định của trường.
Luồng đề xuất:
Mở kỳ → giao mẫu → tự đánh giá → người quản lý đánh giá → xác nhận kết quả → công bố.

Bộ tiêu chí, trọng số và cách tính được lưu theo phiên bản của kỳ. Tổng trọng số phải hợp lệ; tiêu chí thiếu dữ liệu không tự động được xem là đạt hoặc bằng không nếu chưa có quy tắc.
AI chỉ hỗ trợ tổng hợp minh chứng và soạn nhận xét để con người xem lại. Điểm cuối cùng và quyết định nhân sự không được giao cho AI tự thực hiện.
Nghiệm thu: sửa mẫu cho kỳ sau không làm thay đổi kỳ đã chốt; người được đánh giá chỉ xem kết quả theo trạng thái công bố và quyền được cấp.
4.7. Quản lý quá trình công tác
Lưu lịch sử nhận việc, điều chuyển, bổ nhiệm, kiêm nhiệm, kết thúc phân công và nghỉ việc.
Mỗi thay đổi có ngày hiệu lực, đơn vị/chức vụ liên quan, quyết định, tài liệu và người xác nhận.
Hệ thống phải trả lời được hai câu hỏi khác nhau: “Hiện tại người này thuộc đơn vị nào?” và “Tại thời điểm trước đây người này công tác ở đâu?”
Nghiệm thu: hiển thị đúng dòng thời gian và trạng thái tại một mốc thời gian; điều chuyển không xóa lịch sử hợp đồng, đánh giá hoặc yêu cầu cũ.
4.8. Quản lý đào tạo và chứng chỉ
Quản lý khóa bồi dưỡng, người đăng ký/được cử đi, phê duyệt, thời gian, kết quả và minh chứng.
Chứng chỉ có đơn vị cấp, ngày cấp, thời hạn nếu có, file đính kèm và trạng thái xác minh. Không mặc định mọi chứng chỉ đều hết hạn.
Hồ sơ chuyên môn chỉ cập nhật trạng thái “đã xác nhận” sau khi người có trách nhiệm kiểm tra.
Nghiệm thu: theo dõi được từ đăng ký đến hoàn thành; chứng chỉ chưa xác minh không bị hiển thị như đã xác minh; nhắc hết hạn đúng đối tượng và thời điểm.
4.9. Dashboard và báo cáo nhân sự
Dashboard theo vai trò, gồm số lượng nhân sự, phân bố theo đơn vị/trình độ/trạng thái, biến động công tác, hợp đồng sắp hết hạn, yêu cầu chờ xử lý, tiến độ đánh giá và đào tạo.
Mỗi chỉ số cần định nghĩa rõ cách tính, thời điểm dữ liệu và bộ lọc.
Số người khác số vị trí được đảm nhiệm. Một người kiêm nhiệm hai đơn vị không được đếm thành hai nhân sự trong tổng headcount.
Số liệu được tính bằng truy vấn và quy tắc xác định. AI chỉ giải thích kết quả, không tự ước lượng từ đoạn văn.
Nghiệm thu: đối chiếu được số tổng với danh sách chi tiết; xuất báo cáo vẫn tuân theo quyền và có nhật ký.
5. Workflow phê duyệt dùng chung
5.1. Phạm vi
Xây một cơ chế workflow phục vụ nghỉ phép, công tác, điều chỉnh công, đào tạo và thay đổi hồ sơ cần xác nhận.
Bản đầu hỗ trợ phê duyệt tuần tự, người duyệt theo vai trò/đơn vị, hạn xử lý, trả bổ sung, từ chối, hủy và phân công lại có kiểm soát. Chưa làm trình thiết kế kéo-thả tổng quát.
5.2. Quy trình nghỉ phép mẫu
Người gửi → Trưởng bộ phận → Phòng nhân sự → Hoàn tất.

Đây là mẫu theo yêu cầu t đã đưa, cần được đầu mối nghiệp vụ xác nhận trước khi dùng thật.
Trạng thái yêu cầu gồm: Nháp, Đang duyệt, Cần bổ sung, Đã duyệt, Từ chối, Đã hủy. Bước hiện tại và người xử lý được lưu riêng.
5.3. Quy tắc bắt buộc
Không tự duyệt: đơn của người quản lý phải có tuyến thay thế.
Không có người duyệt: báo cần phân công; không tự bỏ qua bước.
Quyền thay đổi: kiểm tra lại khi bấm duyệt, không tin dữ liệu quyền đã tải từ trước.
Đổi quy trình: yêu cầu đang chạy giữ phiên bản đã áp dụng; chuyển sang quy trình mới phải là thao tác có kiểm soát.
Duyệt đồng thời: chỉ một chuyển trạng thái hợp lệ được ghi nhận. Thay đổi trạng thái, cập nhật số dư và ghi sự kiện liên quan phải nhất quán.
Trả bổ sung: chỉnh trường quan trọng phải được xác định có cần chạy lại các bước duyệt trước hay không.
6. Công việc cần xử lý và thông báo tự động
6.1. Tách công việc khỏi thông báo
Công việc cần xử lý thể hiện trách nhiệm còn mở: duyệt đơn, đánh giá nhân sự, xác minh chứng chỉ.
Thông báo thể hiện một sự kiện: có đơn mới, đơn bị từ chối, hợp đồng sắp hết hạn.
Đọc thông báo không đồng nghĩa hoàn thành công việc.
6.2. Các nhóm thông báo
Sự kiện	Người nhận dự kiến
Có yêu cầu chờ duyệt	Người duyệt ở bước hiện tại
Duyệt, từ chối, trả bổ sung	Người gửi
Hợp đồng sắp hết hạn	Nhân sự và người phụ trách được cấu hình
Thiếu dữ liệu công/đến hạn xác nhận công	Người liên quan và người quản lý theo quyền
Mở kỳ đánh giá/sắp hết hạn	Người được đánh giá và người đánh giá
Chứng chỉ sắp hết hạn	Người sở hữu và nhân sự phụ trách
Công việc quá hạn	Người được giao; cấp tiếp theo nếu quy tắc cho phép


Bản đầu dùng thông báo trong ứng dụng và email. Có mẫu nội dung, ngôn ngữ, mốc nhắc, giới hạn lặp và cấu hình người nhận.
Email không chứa toàn bộ dữ liệu nhạy cảm; ưu tiên nội dung tối thiểu và dẫn người dùng đăng nhập để xem.
6.3. Cơ chế gửi
Áp dụng thiết kế:
Lưu thay đổi nghiệp vụ và sự kiện trong cùng giao dịch → worker xử lý → tạo thông báo/gửi email → ghi kết quả và thử lại khi cần.

Đây là cách áp dụng transactional outbox, nhằm tránh mất sự kiện khi cập nhật database thành công nhưng bước gửi thông điệp thất bại. Việc xử lý vẫn cần chống trùng vì thông điệp có thể được giao lại. AWS Documentation
Mỗi lần xử lý có khóa chống trùng, số lần thử, lịch thử lại và trạng thái cần can thiệp. Không cam kết email tuyệt đối chỉ được giao một lần nếu nhà cung cấp không hỗ trợ cơ chế bảo đảm tương ứng.
Trước khi gửi nhắc theo lịch, worker kiểm tra lại điều kiện và người nhận: hợp đồng đã gia hạn hoặc quyền đã bị thu hồi thì không tiếp tục gửi theo dữ liệu cũ.
7. Thiết kế AI Assistant
7.1. Ba năng lực chính
Năng lực	Ví dụ	Cách thực hiện
Hỏi đáp tài liệu	“Thủ tục bổ sung bằng cấp là gì?”	Tìm tài liệu được phép truy cập, trả lời kèm nguồn
Tra cứu dữ liệu nghiệp vụ	“Tôi còn bao nhiêu ngày phép?”	Gọi công cụ nghiệp vụ đã giới hạn quyền
Hỗ trợ thao tác	“Tạo giúp tôi đơn công tác.”	Thu thập thông tin, tạo bản nháp, yêu cầu xác nhận


Không bắt đầu bằng nhiều agent tự phối hợp phức tạp. Bản đầu dùng một bộ điều phối với các nhóm công cụ rõ ràng, dễ kiểm thử.
7.2. Hỏi đáp dựa trên tài liệu
Quy trình xử lý:
Tải tài liệu → kiểm tra và phê duyệt → trích xuất → chia đoạn → lập chỉ mục → tìm kiếm theo quyền và hiệu lực → tạo câu trả lời có nguồn.

Mỗi tài liệu cần có chủ sở hữu, loại tài liệu, phiên bản, ngày hiệu lực, đối tượng áp dụng, quyền truy cập và trạng thái xuất bản.
Nguồn trả lời là tài liệu của trường đã được duyệt, không phải chính sách HR Cloud.
Không đơn giản chọn văn bản mới nhất cho mọi trường hợp: phải xét thời điểm và đối tượng áp dụng. Khi hai nguồn mâu thuẫn hoặc chưa đủ thông tin, AI phải nêu điểm chưa rõ thay vì tự chọn một quy định.
Tài liệu hết hiệu lực, bị thu hồi hoặc thay đổi quyền phải được loại khỏi kết quả phù hợp. Bộ lọc quyền phải hoạt động trước khi nội dung đi vào mô hình; đây là điểm kiểm soát quan trọng đối với kho vector dùng chung. OWASP Gen AI Security Project
7.3. Tra cứu qua công cụ nghiệp vụ
Các công cụ dự kiến:
Công cụ	Phạm vi
getMyProfile	Thông tin cá nhân được phép xem
getMyLeaveBalance	Số dư phép của người đăng nhập
listMyPendingApprovals	Công việc người dùng được giao xử lý
listExpiringContracts	Hợp đồng thuộc phạm vi được cấp
getMyAttendanceSummary	Tổng hợp công cá nhân
getMyReviewProgress	Tiến độ đánh giá cá nhân
searchApprovedPolicies	Tài liệu được duyệt và đúng quyền


Danh tính người gọi lấy từ phiên đăng nhập. Các tham số do AI tạo không được dùng để tự nâng quyền hoặc giả mạo người khác.
Không cho AI chạy SQL tùy ý. Truy vấn, phép tính, phân trang và giới hạn dữ liệu nằm trong backend.
7.4. Thao tác có xác nhận
Bản đầu mở tạo đơn nghỉ phép hoặc công tác, không mở mọi thao tác ghi.
Yêu cầu → hỏi phần còn thiếu → bản nháp → người dùng xác nhận → backend kiểm tra lại → gửi → trả mã yêu cầu và trạng thái.

Xác nhận phải gắn với đúng nội dung bản nháp; thay đổi ngày hoặc loại đơn cần xác nhận lại. Retry không tạo đơn thứ hai.
AI chỉ báo “đã gửi” sau khi backend xác nhận thành công. Timeout chưa rõ kết quả phải kiểm tra trạng thái, không tự gửi lại vô điều kiện.
Việc giới hạn chức năng, quyền công cụ và tính tự chủ phù hợp với hướng kiểm soát rủi ro Excessive Agency của OWASP. OWASP Gen AI Security Project
7.5. An toàn và khả năng vận hành
Không đưa toàn bộ database nhân sự vào prompt. Giới hạn dữ liệu trả về, số lần gọi công cụ, thời gian xử lý và ngân sách.
Lịch sử hội thoại phải được bảo vệ như dữ liệu nghiệp vụ. Nội dung nguồn vừa bị thu hồi quyền không được tiếp tục đưa vào các lượt trả lời mới; dữ liệu đã được người dùng đọc trước đó không thể “thu hồi” khỏi nhận thức của họ.
RAG không tự loại bỏ prompt injection. Cần kiểm thử tài liệu chứa chỉ dẫn độc hại, nội dung ẩn và yêu cầu vượt quyền. OWASP Gen AI Security Project
Khi AI không khả dụng, các chức năng nhân sự thông thường vẫn phải hoạt động.
8. Kiến trúc kỹ thuật
8.1. Stack đề xuất
Thành phần	Lựa chọn
Frontend	Next.js App Router, TypeScript
Backend	Express, TypeScript
ORM	Prisma
Database	PostgreSQL
Tìm kiếm ngữ nghĩa	pgvector trong PostgreSQL
Tác vụ nền	Worker riêng, dùng chung thư viện nghiệp vụ
Tài liệu	Kho file riêng tư; database lưu metadata
Triển khai	Docker, Docker Compose, reverse proxy
CI/CD	GitHub Actions
Kiểm thử trình duyệt	Playwright


Baseline phiên bản tại thời điểm lập kế hoạch: Next.js 16, Express 5, Prisma 7 và PostgreSQL 18; khóa phiên bản sau thử nghiệm tương thích, cập nhật bản vá theo quy trình. Next.js 16 hiện thuộc Active LTS; Express có nhánh API 5.x; PostgreSQL 18 thuộc nhánh được hỗ trợ. Next.js
Tài liệu Prisma hiện ghi Prisma 8 còn là release candidate và Prisma 7 vẫn được hỗ trợ. Vì vậy, kế hoạch chọn Prisma 7; không cài CLI latest rồi mặc định dùng lệnh của phiên bản 7. Prisma
8.2. Phân chia trách nhiệm
Người dùng
    |
HTTPS / Reverse proxy
    |
    +-- Next.js: giao diện, biểu mẫu, dashboard, chat
    |
    +-- Express: API, phân quyền, nghiệp vụ, workflow, AI
             |
             +-- Prisma --> PostgreSQL
             +-- Kho file riêng tư
             +-- Nhà cung cấp AI đã được chọn
             |
             +-- Outbox / tác vụ --> Worker
                                      |
                                      +-- Email, nhắc hạn
                                      +-- Import, xử lý tài liệu
Express giữ logic nghiệp vụ thống nhất. Next.js không truy cập database để tự thực hiện một quy trình duyệt khác; AI cũng không có đường riêng bỏ qua dịch vụ nghiệp vụ.
Đặt reverse proxy trước dịch vụ Next.js khi tự host; cấu hình giới hạn request và kiểm tra streaming cho chat. Tài liệu Next.js có hướng dẫn riêng cho reverse proxy và việc tránh buffering khi streaming. Next.js
8.3. Cấu trúc mã nguồn
apps/
  web/
  api/
  worker/

packages/
  contracts/
  domain/
  database/
  shared/

infra/
  docker/
  proxy/
  scripts/

tests/
  integration/
  e2e/
  ai-evaluation/

docs/
  requirements/
  architecture/
  operations/
contracts chứa định nghĩa request/response; không xuất toàn bộ model database ra frontend. domain chứa quy tắc nghiệp vụ dùng chung cho API và worker.
API cần có tài liệu OpenAPI, validation, phân trang, định dạng lỗi thống nhất và mã truy vết.
9. Thiết kế dữ liệu và quản lý tài liệu
9.1. Các nhóm thực thể chính
Nhóm	Thực thể dự kiến
Danh tính và quyền	User, Session, Role, Permission, RoleAssignment
Nhân sự	Employee, OrganizationalUnit, Position, EmploymentAssignment
Hợp đồng và lịch sử	EmploymentContract, ContractAmendment, EmploymentEvent
Nghỉ phép/công tác	LeavePolicy, LeaveLedger, LeaveRequest, BusinessTripRequest
Chấm công	AttendanceImport, AttendanceRecord, AttendanceAdjustment, AttendancePeriod
Đánh giá	ReviewCycle, ReviewTemplateVersion, Review, CriterionResult, Evidence
Đào tạo	TrainingCourse, TrainingEnrollment, Certificate
Quy trình	WorkflowDefinitionVersion, WorkflowInstance, ApprovalStep, ApprovalAction, Task
Hạ tầng dùng chung	FileAsset, Notification, DeliveryAttempt, OutboxEvent, AuditEvent
AI và tri thức	KnowledgeDocumentVersion, KnowledgeChunk, Conversation, Message, ToolExecution


Đây là mô hình khái niệm, chưa phải schema cuối cùng. Các liên kết nghiệp vụ cần có ràng buộc rõ; tránh dùng các ID tùy ý không được kiểm chứng.
9.2. Nguyên tắc dữ liệu
Lưu lịch sử có ngày hiệu lực; tách dữ liệu gốc khỏi điều chỉnh; sử dụng ràng buộc duy nhất và giao dịch để chống ghi trùng.
Thời điểm sự kiện lưu nhất quán; ngày nghiệp vụ và lịch làm việc xử lý theo múi giờ cấu hình của trường.
Không lưu file lớn trực tiếp vào các bảng nghiệp vụ. File có giới hạn định dạng/dung lượng, trạng thái kiểm tra, checksum và chính sách truy cập.
Với pgvector, Prisma chưa hỗ trợ trực tiếp mọi kiểu dữ liệu extension; cần thử migration tùy chỉnh và truy vấn tham số hóa bằng raw SQL/TypedSQL trước khi chốt triển khai. Prisma
10. Thiết kế trải nghiệm người dùng
Một ứng dụng, ba không gian theo quyền:
Không gian	Màn hình chính
Cá nhân	Trang chủ, hồ sơ của tôi, đơn từ, bảng công, đánh giá, đào tạo, công việc, AI
Quản lý đơn vị	Nhân sự đơn vị, phê duyệt, đánh giá, bảng công và báo cáo
Nhân sự/quản trị	Quản lý dữ liệu, cấu hình chính sách, workflow, tài liệu, dashboard và nhật ký


Mọi trang chi tiết yêu cầu cần hiển thị trạng thái, bước đang chờ, người xử lý, lịch sử và hành động hiện có.
Biểu mẫu có lưu nháp, cảnh báo dữ liệu chưa lưu, lỗi tại trường tương ứng và trạng thái gửi rõ ràng. Thao tác không thành công phải giữ lại dữ liệu người dùng đã nhập.
AI trả câu trả lời đi kèm đường dẫn nội bộ hoặc thẻ dữ liệu phù hợp; không bắt người dùng phải dùng chat để làm các việc vốn có thể thực hiện trực tiếp.
11. Bảo mật và quản trị dữ liệu cá nhân
11.1. Kiểm soát kỹ thuật
Thiết kế đăng nhập với phiên có thể thu hồi, cookie bảo vệ phù hợp, HTTPS, chống CSRF cho thao tác dùng cookie, giới hạn thử đăng nhập và kiểm tra đầu vào. Các yêu cầu về TLS, cookie an toàn, bảo vệ đăng nhập và dependency cũng được nhấn mạnh trong hướng dẫn Express. Express.js
Bổ sung kiểm tra quyền đối tượng và trường dữ liệu; bảo vệ upload/download; hạn chế xuất hàng loạt; không đưa secrets vào frontend hoặc repository.
MFA cho tài khoản đặc quyền là tiêu chí trước khi dùng thật. Cache phải được phân biệt theo người dùng/phạm vi, tránh dùng chung phản hồi chứa dữ liệu cá nhân.
11.2. Quy trình quản trị
Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 có hiệu lực từ 01/01/2026. Trước khi vận hành bằng dữ liệu thật, cần rà soát phạm vi xử lý và yêu cầu áp dụng với người phụ trách của trường; không kết luận tuân thủ chỉ từ việc có đăng nhập và mã hóa. Vanban Chinhphu
Dự án cần xác định chủ sở hữu dữ liệu, mục đích xử lý, thời gian lưu giữ, người được truy cập, quy trình xử lý yêu cầu dữ liệu và ứng phó sự cố.
Nhà cung cấp AI, email, lưu trữ và giám sát phải được xem xét như các bên có thể tiếp nhận dữ liệu. Không mặc định được gửi hồ sơ thật ra ngoài hạ tầng trường.
Nhật ký có chính sách lưu giữ và che dữ liệu nhạy cảm; không lưu vô hạn toàn bộ prompt, file, token hoặc thông tin định danh.
12. Kế hoạch DevOps và vận hành
12.1. Môi trường
Tách local, staging và production/pilot về database, file, secrets và cấu hình.
Bản đầu dùng Docker Compose cho một máy chủ, có cấu hình production riêng. Docker có hướng dẫn triển khai Compose theo cách này, nhưng không nên đưa nguyên cấu hình phát triển vào production. Docker Documentation
Database và kho quản trị không mở trực tiếp ra Internet. Image được build trong CI, gắn mã commit và phát hành vào registry.
12.2. Pipeline
Pull Request
    ↓
Kiểm tra code, kiểu dữ liệu, unit test
    ↓
Integration test với PostgreSQL
    ↓
Kiểm tra secrets/dependency, build image
    ↓
Triển khai staging, chạy migration đã duyệt
    ↓
E2E và smoke test
    ↓
Phê duyệt phát hành
    ↓
Triển khai production/pilot
    ↓
Kiểm tra sau triển khai, theo dõi lỗi
Tính năng bảo vệ deployment của GitHub phụ thuộc loại repository và gói tài khoản. Cơ chế phê duyệt phải được kiểm tra khi thiết lập, không mặc định mọi repository riêng tư đều có required reviewers. GitHub Docs
Với baseline Prisma 7, pipeline gọi CLI đã khóa phiên bản để chạy migrate deploy. Thay đổi schema rủi ro cần thử trên dữ liệu đại diện và ưu tiên cách expand–contract: thêm cấu trúc mới, chuyển dữ liệu/ứng dụng, rồi mới loại bỏ cấu trúc cũ. Prisma
12.3. Triển khai và rollback
Phát hành phải xác định được image, migration, cấu hình và người phê duyệt.
Có thể bổ sung blue–green ở mức ứng dụng: dựng phiên bản mới, kiểm tra sức khỏe, chuyển lưu lượng và giữ phiên bản cũ trong thời gian quan sát.
Hai container trên cùng một máy không tạo khả năng chịu lỗi khi cả máy chủ hỏng. Không gọi đó là hệ thống sẵn sàng cao toàn diện.
Rollback ứng dụng phải xét khả năng tương thích database. Không dùng khôi phục toàn bộ database như thao tác rollback release thông thường vì có thể làm mất dữ liệu mới phát sinh.
12.4. Giám sát và khôi phục
Theo dõi lỗi API, thời gian phản hồi, kết nối database, hàng đợi tác vụ, email thất bại, dung lượng, tình trạng backup và chi phí AI.
Mỗi request, job và lần gọi công cụ AI có mã truy vết; không log nội dung nhạy cảm không cần thiết.
Sao lưu cả database, file và cấu hình cần thiết; lưu bản sao ngoài máy chủ chính, bảo vệ khóa và diễn tập phục hồi.
Mục tiêu thử nghiệm đề xuất: mức mất dữ liệu tối đa 24 giờ và thời gian khôi phục tối đa 4 giờ. Đây chưa phải SLA của trường. Nếu yêu cầu mất dữ liệu thấp hơn, cần cấu hình backup phù hợp, chẳng hạn base backup kết hợp WAL để phục hồi theo thời điểm; pg_dump không thay thế cơ chế đó. PostgreSQL
13. Kiểm thử và tiêu chí nghiệm thu
13.1. Các lớp kiểm thử
Lớp	Nội dung
Unit	Tính phép, trọng số KPI, thời hạn, chuyển trạng thái
Integration	Database, phân quyền, giao dịch, chống trùng, outbox
E2E	Các luồng theo vai trò từ giao diện đến kết quả
AI evaluation	Độ đúng, nguồn, lựa chọn công cụ, từ chối và xác nhận
Bảo mật	Vượt quyền, upload, session, prompt injection, truy cập tài liệu
Vận hành	Migration lỗi, worker khởi động lại, backup–restore, rollback


Playwright được đề xuất cho kiểm thử trình duyệt trong CI; tài liệu chính thức có cấu hình cho GitHub Actions và các môi trường CI khác. Playwright
13.2. Ca kiểm thử bắt buộc
Phải kiểm tra người duyệt vừa mất quyền; hai người duyệt đồng thời; gửi lại sau timeout; hủy đơn đã duyệt; import trùng; sửa kỳ đã khóa; thay mẫu KPI; điều chuyển đơn vị; hợp đồng đã gia hạn nhưng job nhắc cũ vẫn còn.
Với AI, kiểm tra hỏi dữ liệu người khác, tài liệu hết hiệu lực, không tìm thấy nguồn, nhiều yêu cầu trong một câu, ngày tháng chưa rõ, công cụ thất bại và tài liệu chứa chỉ dẫn độc hại.
Với vận hành, kiểm tra email lỗi không làm mất yêu cầu; worker chạy lại không tạo tác động nghiệp vụ trùng; khôi phục được cả metadata và file.
13.3. Mục tiêu nghiệm thu đề xuất
Các con số dưới đây là mục tiêu để kiểm chứng, không phải kết quả đã đạt.
Hạng mục	Điều kiện đề xuất
Luồng trọng yếu	Tất cả ca nghiệm thu đã thống nhất phải đạt
Lỗi nghiêm trọng	Không còn lỗi chặn vận hành hoặc lỗi vượt quyền chưa xử lý
Hiệu năng API thông thường	95% request dưới 1 giây trong bài tải đã định nghĩa; không tính AI và tác vụ lớn
Dataset hiệu năng	Dữ liệu giả lập khoảng 3.000 hồ sơ và lịch sử giao dịch đủ lớn; không phải quy mô thực của trường
AI hỏi đáp	Ít nhất 90% câu trả lời đạt rubric trên tập đánh giá độc lập, được người phụ trách chấm
AI phân quyền	Không phát hiện rò rỉ trong bộ kiểm thử đã xây; không suy diễn thành bảo đảm tuyệt đối
Khôi phục	Đạt mục tiêu đã chốt trong diễn tập và có biên bản đối chiếu dữ liệu


Bộ đánh giá AI nên có ít nhất 200 tình huống, tách phần dùng để cải tiến khỏi phần dùng nghiệm thu; lưu phiên bản tài liệu, model và prompt để so sánh.
14. Lộ trình triển khai minh họa 24 tuần
Giả định: hai lập trình viên toàn thời gian, có QA/BA hỗ trợ và đầu mối nghiệp vụ phản hồi đều đặn. Kết thúc giai đoạn khảo sát phải lập lại ước lượng theo backlog thực tế.
Sprint	Thời gian	Nội dung chính	Đầu ra
1	Tuần 1–2	Khảo sát, phạm vi, quy trình, quyền, dữ liệu, rủi ro	Đặc tả ban đầu, backlog, tiêu chí nghiệm thu
2	Tuần 3–4	Khung ứng dụng, đăng nhập, CI, Docker; thử Prisma/pgvector và AI	Luồng kỹ thuật chạy trên staging
3	Tuần 5–6	Hồ sơ, cơ cấu đơn vị, phân công, import	Quản lý được dữ liệu nhân sự mẫu
4	Tuần 7–8	Hợp đồng, quá trình công tác, file, kho tài liệu; RAG thử nghiệm	Dữ liệu có lịch sử và tài liệu có phiên bản
5	Tuần 9–10	Workflow, công việc, audit, outbox	Quy trình dùng chung được kiểm thử
6	Tuần 11–12	Nghỉ phép, công tác, số dư và thông báo	Luồng gửi–duyệt–cập nhật hoàn chỉnh
7	Tuần 13–14	Chấm công, import, điều chỉnh, khóa kỳ	Bảng công đối chiếu được
8	Tuần 15–16	Đào tạo, chứng chỉ, xác minh và nhắc hạn	Quy trình đào tạo hoàn chỉnh
9	Tuần 17–18	KPI, bộ mẫu, kỳ đánh giá, minh chứng	Một kỳ đánh giá chạy từ đầu đến cuối
10	Tuần 19–20	Dashboard, báo cáo, AI tra dữ liệu theo quyền	Báo cáo đối chiếu được, AI dùng công cụ đọc
11	Tuần 21–22	AI tạo yêu cầu có xác nhận, kiểm thử bảo mật/tải, hoàn thiện vận hành	Bản ứng viên phát hành
12	Tuần 23–24	UAT, sửa lỗi, diễn tập khôi phục, đào tạo, bàn giao	Bản nghiệm thu và hồ sơ triển khai


Kiểm thử, bảo mật và DevOps thực hiện xuyên suốt, không chờ đến sprint cuối.
Nếu cần rút ngắn tiến độ, giảm độ sâu ở tích hợp thiết bị, tùy biến workflow hoặc mẫu báo cáo trước; không cắt kiểm tra quyền, chống ghi trùng và khôi phục dữ liệu.
15. Nhân lực, chi phí và quản lý rủi ro
15.1. Trách nhiệm dự án
Đầu mối trường xác nhận chính sách và dữ liệu. BA/lead quản lý phạm vi, quyết định thiết kế và tiêu chí nghiệm thu. Nhóm phát triển chia trách nhiệm frontend, backend, dữ liệu, AI và DevOps; QA kiểm thử độc lập các luồng quan trọng.
Đây là các trách nhiệm cần có, không nhất thiết tương ứng từng người riêng biệt. Nếu một người kiêm nhiều vai trò, lịch phải phản ánh năng lực thực tế.
15.2. Khung dự toán
Nhóm chi phí	Cách xác định
Nhân công	Công sức theo backlog, vai trò và thời gian
Hạ tầng	Staging, production/pilot, database, lưu file và backup
AI	Lượt gọi, token đầu vào/đầu ra, embedding và đánh giá
Email	Số lượng gửi, nhà cung cấp, cấu hình domain
Vận hành	Log, giám sát, lưu trữ báo cáo và duy trì
Dự phòng	Thay đổi phạm vi và phát sinh kỹ thuật được phê duyệt


Chưa chốt ngân sách bằng tiền khi chưa chọn hạ tầng và nhà cung cấp.
Ví dụ giả định 100 người × 5 lượt AI/ngày × 22 ngày = 11.000 lượt/tháng chỉ dùng để tính nhu cầu. Chi phí thực còn phụ thuộc số lần gọi model trong mỗi lượt, lượng tài liệu đưa vào và bảng giá được chọn.
15.3. Rủi ro và biện pháp
Rủi ro	Biện pháp
Quy trình thực tế chưa rõ	Chốt từng quy trình với người sở hữu trước khi triển khai
Phạm vi tăng liên tục	Tách yêu cầu thay đổi, đánh giá tác động rồi mới đưa vào sprint
Dữ liệu nguồn bẩn/trùng	Import thử, kiểm tra, đối chiếu và xác nhận trước khi nạp thật
KPI hoặc cách tính công chưa thống nhất	Cấu hình theo phiên bản; không tự tạo quy tắc thay trường
AI trả lời sai hoặc lộ dữ liệu	Nguồn được duyệt, quyền ở backend, bộ đánh giá và giới hạn thao tác
Dịch vụ ngoài lỗi hoặc vượt chi phí	Hạn mức, timeout, cảnh báo và luồng sử dụng không phụ thuộc AI
Mất dữ liệu hoặc phát hành lỗi	Backup ngoài máy chủ, diễn tập restore, migration tương thích và rollback


16. Pilot, bàn giao và mở rộng
16.1. Triển khai pilot
Chọn một khoa/phòng cùng nhóm nhân sự phụ trách. Xác nhận dữ liệu, tài khoản, quyền và quy trình trước khi nhập thật.
Import thử, đối chiếu và chạy UAT; đào tạo theo vai trò. Trong thời gian chuyển tiếp phải quy định hệ thống nào là nguồn chính thức, tránh hai bên cùng sửa dữ liệu mà không có cơ chế đối chiếu.
Chỉ mở rộng khi các lỗi nghiêm trọng đã xử lý, người phụ trách ký nghiệm thu và có người tiếp nhận vận hành. Khi sự cố, dùng quy trình tạm thời đã thống nhất và nhập đối chiếu lại, không để mất dấu yêu cầu.
16.2. Bộ sản phẩm bàn giao
Nhóm	Nội dung
Phần mềm	Frontend, backend, worker, cấu hình triển khai và dữ liệu mẫu
Nghiệp vụ	Đặc tả, workflow, ma trận quyền, định nghĩa chỉ số
Thiết kế	Kiến trúc, ERD, mô hình dữ liệu, API và các quyết định kỹ thuật
AI	Quy trình tài liệu, công cụ nghiệp vụ, prompt có phiên bản, bộ đánh giá
Kiểm thử	Test case, test tự động, báo cáo lỗi, kết quả tải và bảo mật
Vận hành	Pipeline, hướng dẫn phát hành, rollback, backup–restore, xử lý sự cố
Người dùng	Hướng dẫn theo vai trò, kịch bản demo và biên bản nghiệm thu


Nếu dùng làm khóa luận, các đầu ra trên là căn cứ cho các chương phân tích yêu cầu, thiết kế, triển khai, đánh giá và hướng phát triển; không chỉ trình bày ảnh giao diện.
16.3. Lộ trình mở rộng
Onboarding: tạo hồ sơ mới, giao checklist, thu thập tài liệu, xác nhận và theo dõi hoàn tất tiếp nhận.
Surveys: khảo sát nhu cầu đào tạo, phản hồi sau khóa học hoặc onboarding. Khảo sát ẩn danh phải có thiết kế bảo vệ dữ liệu và ngưỡng công bố kết quả; không chỉ ẩn tên trên giao diện.
Tích hợp: SSO trường, nguồn chấm công, dữ liệu giờ giảng và hệ thống liên quan khi có API, quyền truy cập và quy tắc đối chiếu.
Mở rộng vận hành: tách hạ tầng, tăng khả năng chịu lỗi và tối ưu tài nguyên khi có số liệu tải thực tế.
Kết luận phạm vi
Bản triển khai chính gồm đầy đủ hồ sơ nhân sự, tổ chức/chức vụ, hợp đồng, nghỉ phép/công tác, chấm công, KPI, quá trình công tác, đào tạo/chứng chỉ, dashboard, workflow và thông báo tự động, kết hợp AI Assistant và DevOps.
Thứ tự ưu tiên là: dữ liệu đúng → quyền đúng → quy trình đúng → tự động hóa ổn định → AI hỗ trợ → vận hành và mở rộng. Giá trị của đề tài nằm ở việc chứng minh các phần này hoạt động cùng nhau, có kiểm thử và có khả năng khôi phục, chứ không chỉ ở số lượng màn hình hoặc việc có một chatbot.