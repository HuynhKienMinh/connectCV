# Kế hoạch nâng cấp ConnectCV

Ngày lập: 13/10/2026. Các mốc dưới đây là đợt ưu tiên dự kiến, không phải cam kết hoàn thành theo giờ hay theo số chu kỳ. Chỉ chuyển đợt khi tiêu chí nghiệm thu đạt.

## 1. Sản phẩm phải giải quyết việc gì?

Người dùng trả tiền cần một hồ sơ ứng tuyển đúng sự thật, hợp vị trí, dễ sửa và xuất được; hoặc một buổi luyện phỏng vấn giúp họ trả lời tốt hơn. Số lượng mẫu, tab và điểm số không tự tạo ra giá trị đó.

| Nhóm | Nhu cầu thực tế | Điều kiện nghiệm thu riêng |
|---|---|---|
| Sinh viên/new graduate | Chưa có kinh nghiệm; biến dự án học tập thành nội dung có ích | Không bịa công ty/seniority; tạo CV từ dự án; hướng dẫn điền chỗ thiếu |
| Người có kinh nghiệm | Hồ sơ dài, nhiều việc làm, cần CV song ngữ | Giữ đầy đủ mốc thời gian/thành tích; nhiều trang không tràn; bản dịch có nguồn đối chiếu |
| Người chuyển nghề | Trình bày kỹ năng chuyển đổi | Tách kỹ năng đã có khỏi yêu cầu JD; không biến mục tiêu thành kinh nghiệm |
| Freelancer | Portfolio/dự án, giới thiệu năng lực | Bản nháp riêng tư, preview trước publish, link ổn định, kiểm soát thông tin liên hệ |
| Recruiter/đơn vị đào tạo | Quản lý nhiều hồ sơ hoặc hướng dẫn ứng viên | Thiết kế quyền theo tổ chức, consent và audit trước khi hỗ trợ dữ liệu đa người dùng; không dùng tài khoản cá nhân chung |

Hai ngôn ngữ VI/EN hiện có là phạm vi kiểm thử ban đầu. Những ngành hoặc thị trường chưa có bộ dữ liệu đánh giá phải ghi chưa kiểm chứng, không quảng cáo “phù hợp mọi ngành”.

## 2. Đợt A — nền tảng đáng tin cậy (ưu tiên 1, dự kiến 1–2 tuần làm việc)

### A1. Hoàn thiện hợp đồng API và lỗi

- Chuẩn hóa phản hồi gồm code, message dễ hiểu, fieldErrors, retryAfter khi thích hợp, requestId.
- Form đánh dấu trường sai trước khi gửi; backend kiểm tra độc lập và không trả lại dữ liệu người dùng trong lỗi.
- Phân biệt lỗi nhập liệu, hết phiên, thiếu credits, giới hạn người dùng, provider AI quá tải và lỗi hệ thống.
- Không retry tự động thao tác có thể ghi dữ liệu/trừ tiền nếu chưa có idempotency.
- Tiêu chí: JD trống/ngắn/dài và JSON sai đều có hướng dẫn cụ thể; request sai không gọi AI hay tiêu quota AI; mất mạng không làm mất profile.

### A2. Hồ sơ và dự án CV

- Lưu trạng thái dirty/saving/saved/error chính xác; retry có backoff/jitter và giới hạn.
- Có revision để phát hiện ghi đè giữa nhiều tab/thiết bị; khi conflict cho người dùng chọn, không lặng lẽ ghi đè.
- Lưu lịch sử phiên bản CV, mẫu, ngôn ngữ và crop ảnh; dữ liệu hồ sơ và nội dung AI khác nhau, có cách quay lại.
- Thêm import PDF/DOCX sau khi có validation file và màn hình xác nhận dữ liệu trích xuất; tài liệu là dữ liệu, không phải chỉ dẫn cho AI.
- Tiêu chí: refresh, mở lại, offline/reconnect và conflict có E2E; dữ liệu không trộn giữa hai tài khoản test.

### A3. Vận hành và backup

- Môi trường staging với fixture và tài khoản test riêng; không thử ghi vào tài khoản chủ dự án mỗi 15 phút.
- Snapshot code/build trước deploy; secret chỉ lưu trong kho riêng, không nằm trong Git/log.
- Backup dữ liệu ứng dụng mã hóa trước migration; inventory cả subcollections; kiểm tra checksum; chạy restore drill trên staging.
- RequestId và structured logs có redaction; dashboard lỗi, độ trễ, quota, lỗi provider; readiness riêng với liveness.
- Tiêu chí mục tiêu: rollback ứng dụng ≤15 phút trong diễn tập; RPO dữ liệu ≤24 giờ sau khi thiết lập backup phù hợp; ghi kết quả diễn tập thay vì tự nhận đạt.

## 3. Đợt B — CV/ATS có giá trị trả tiền (ưu tiên 2, dự kiến 2–4 tuần)

### B1. Luồng hoàn thành CV

- Onboarding ngắn theo mục tiêu, ví dụ gắn nhãn rõ, checklist thiếu thông tin.
- Một thao tác tạo chính với trạng thái tiến trình rõ; không bắt người dùng hiểu AI mode/JSON/backend.
- Template gallery có shortlist theo mục tiêu, tìm kiếm/tag, zoom tốt và bàn phím dùng được.
- Editor và fullscreen cùng nguồn dữ liệu; kết quả chỉnh text/ảnh phải được lưu và được xuất y hệt.
- Tiêu chí mục tiêu: ít nhất 8/10 người test hoàn thành CV đầu tiên không cần hướng dẫn trực tiếp; đo thời gian thay vì phỏng đoán.

### B2. PDF/DOCX

- Renderer PDF sandbox, giới hạn mạng/tài nguyên, queue có timeout và xử lý lỗi; không dùng --no-sandbox để làm nhanh.
- Phép thử so ảnh trên 74×2 mẫu, nhiều độ dài profile, font Việt/Anh, crop ảnh và ngắt trang.
- Kiểm tra lớp văn bản/thứ tự đọc của PDF; screenshot đẹp không đủ chứng minh ATS đọc được.
- DOCX chỉnh sửa nội dung và DOCX giữ thiết kế phải được mô tả đúng khả năng; không hứa đồng nhất nếu chưa chứng minh.
- Xác minh quyền sử dụng/phân phối mẫu, ảnh và font để thương mại; thay watermark không chứng minh có quyền.
- Tiêu chí: không cắt mất nội dung; PDF không lộ profile người khác; Word không có dữ kiện mặc định/bịa; có backup phiên bản thiết kế.

### B3. AI và ATS minh bạch

- Evidence map: mỗi nội dung được tối ưu có nguồn từ profile; bản dịch giữ định danh, mốc, số liệu.
- Bộ eval gồm ít kinh nghiệm, nhiều công ty, ngành ngoài IT, dữ liệu thiếu, prompt injection, tiếng Việt có dấu và profile dài.
- “Khớp kỹ năng” khác “được ATS chấp nhận”; giải thích cách tính, kỹ năng còn thiếu, không thêm kỹ năng chỉ để nâng điểm.
- Đánh giá hữu ích bằng reviewer người thật trên bộ đã ẩn danh; test chọn ID không chứng minh văn phong hay và thuyết phục.
- Tiêu chí cứng: không có dữ kiện bịa trong bộ eval; mọi thay đổi metric có diff/evidence. Mục tiêu p95 tạo CV lúc dịch vụ sẵn sàng ≤45 giây, đo ít nhất 30 mẫu trước khi xác nhận.

## 4. Đợt C — phỏng vấn và chatbot (ưu tiên 3)

- Phỏng vấn theo seniority/ngành/JD; một buổi có chủ đề, câu hỏi tiếp nối đúng câu trả lời, lịch sử và mục tiêu luyện tập.
- Rubric STAR tách situation/task/action/result, nêu trích dẫn hỗ trợ; “cần bổ sung” khác “người dùng đã làm”.
- So sánh tiến bộ qua các buổi, bài tập sửa một điểm yếu và đánh giá lại; không chỉ xuất điểm số.
- Mất micro/không cấp quyền có đường chuyển văn bản; transcribe/TTS có trạng thái, hủy và retry hữu ích.
- Chatbot biết khả năng thật của app, trích nguồn hướng dẫn, không tiết lộ secret/profile của người khác và không tự thao tác publish/thu tiền.
- Tiêu chí: đánh giá không gán câu trả lời chưa nói; tổng kết không thêm số liệu; có test người không dùng được micro; score nhất quán trên cùng fixture.

## 5. Đợt D — cộng đồng, portfolio, mở rộng tổ chức

- Cộng đồng: rõ công khai/riêng tư, preview/redact trước chia sẻ, report/moderation, spam/reward abuse, quyền sửa/xóa và quy trình hỗ trợ.
- Portfolio: dự án có cấu trúc, ảnh/file được kiểm soát, link an toàn, publish/unpublish rõ ràng, kiểm tra quyền owner/visitor.
- Đơn vị đào tạo/recruiter: thiết kế tenant/role trước khi ghi tính năng đa hồ sơ; kiểm thử cách ly dữ liệu, lịch sử truy cập và export có consent.
- Không coi bộ việc làm minh họa trên homepage là nguồn việc làm thật; nếu tích hợp nguồn tuyển dụng, đánh giá dữ liệu, quyền sử dụng, freshness và cảnh báo tin giả.
- Tiêu chí: không lấy được dữ liệu riêng giữa hai tài khoản/tenant; retry chia sẻ không thưởng hai lần; xóa/unpublish có tác dụng ở mọi cache/link.

## 6. Đợt E — mở bán có kiểm soát

- Pricing dựa trên chi phí AI/render/storage đã đo; phân biệt free quota, credits và gói sản phẩm. Hiện accountStore.consume có cost mặc định 0, chưa có bằng chứng luồng thu credits tương ứng với dịch vụ.
- Ledger/idempotency cho thanh toán, webhook signature, reconciliation, refund; sandbox trước giao dịch thật. Không tự mở tài khoản thanh toán hay chấp nhận điều khoản thay chủ dự án.
- Chính sách riêng tư, lưu/xóa/export dữ liệu, consent gửi AI và quy trình hỗ trợ tương ứng với hành vi thực tế.
- Pilot có người dùng thật thuộc từng nhóm; theo dõi hoàn thành tác vụ, lỗi, yêu cầu hỗ trợ, kết quả hữu ích và sẵn lòng trả tiền.
- Chỉ mở bán rộng khi qua checklist dưới đây; không dùng đánh giá của trợ lý làm bằng chứng nhu cầu thị trường.

## 7. Điều kiện phát hành thương mại

| Điều kiện | Mức đạt cần có | Hiện tại |
|---|---|---|
| Bảo mật dữ liệu | Không còn P0/P1 đã xác nhận; test cách ly account/tenant và redaction | Có baseline; cycle48 AUTH004 iframe/session local9cases fixed, CI/release còn chờ; actualFirebase/tenant/iOS thiếu kiểm chứng |
| Kết quả AI | Không bịa dữ kiện trong bộ eval; review văn phong/hữu ích riêng | Cycle17 giữ phủ định/đúng lượt, điểm0/null và legacy client gate (local+CI, source live); thiếu authenticated AI/pilot và bộ eval rộng |
| Export | PDF/Word đúng mô tả, nhiều trang, Unicode, crop/text sửa | Renderer live canary đạt; cycle16 sửa tám ca thiếu chức danh; cycle41 ATS optional translation projection fixed/local+CI/live exactsource; còn58split-word, Word visual và long/crop/authenticated E2E chưa đủ |
| Backup/restore | Backup code + dữ liệu phù hợp, diễn tập rollback/restore | Cycle46 candidate0bf: code17bundle chain/currentFE/rollback391 Drive verified, bare fsck43critical files và ZIP restore đạt, staging đã dọn; dữ liệu thật chưa diễn tập |
| Vận hành | Quan sát ≥7 ngày, lỗi được giải thích; có incident runbook | Chưa có chuỗi đo |
| UX thực tế | Nhiều nhóm khách hoàn thành tác vụ, tối thiểu 10 người pilot | Chưa có user study |
| Thương mại | Chi phí/unit và ledger nhất quán; thanh toán sandbox đạt | Chưa kiểm chứng |
| Quyền phân phối | Nguồn/quyền mẫu, ảnh/font có hồ sơ | Chưa có bằng chứng trong lượt audit này |

## 8. Quy tắc ưu tiên và đo hiệu quả

P0: mất/lộ dữ liệu, thực thi mã trái phép, sai tiền nghiêm trọng — dừng release, khống chế và thông báo. P1: không hoàn thành tác vụ chính, backup không dùng được, nhận định gây hiểu sai khi trả tiền — sửa trước tính năng mới. P2: giảm ma sát, tiếp cận, hiệu suất. P3: tiện ích/đẹp hơn.

Mỗi item cần owner-góc nhìn, evidence, effort, tác động, test xác nhận, metric trước/sau, rollback và rủi ro còn lại. Độ ưu tiên không thay đổi chỉ để làm đẹp số ticket đóng. Không tối ưu p95 từ một mẫu đo hay tăng điểm UX bằng nhận xét không có kịch bản.
