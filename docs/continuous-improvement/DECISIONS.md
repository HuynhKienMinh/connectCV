# Nhật ký quyết định

## D001 — 13/10/2026: tự triển khai, có đường quay lại

Chủ dự án: cho toàn quyền phát triển/deploy nhanh để phục vụ người dùng thật; phải backup để khôi phục khi lỗi hoặc đổi ý.

Thực hiện: mỗi đợt triển khai nhỏ có commit rõ ràng, snapshot mã nguồn/build, kiểm thử phù hợp, kiểm tra live và ghi cách rollback. Thay đổi dữ liệu phải có backup dữ liệu được kiểm tra và phương án phục hồi trước khi chạy. Không dùng quyền này để tự mua dịch vụ hoặc bỏ qua hạn chế bảo mật.

## D002 — 13/10/2026: tất cả nhóm khách hàng

Chủ dự án không chọn một nhóm duy nhất. Phân nhóm kiểm thử: sinh viên/người mới đi làm; người có kinh nghiệm; người chuyển nghề; freelancer; nhà tuyển dụng/đơn vị đào tạo. Triển khai theo đợt, với tiêu chí cụ thể từng nhóm. Giao diện tuyển dụng minh họa chưa được coi là một marketplace thật.

## D003 — giữ kiến trúc đã xác nhận

Giữ Firebase Auth/Google, Firebase Hosting, API backend và Firestore. Không chuyển lại Supabase/demo JWT. Nếu đề xuất đổi hạ tầng, phải có phép đo, chi phí, migration và rollback để so sánh; không đổi vì công nghệ mới hơn.

## D004 — tính trung thực của bằng chứng

Không dùng đánh giá tự nhập vai để thay thế nghiên cứu người dùng thật hoặc kiểm toán độc lập. Phát hiện ở mã nguồn ghi là source finding; kiểm thử local không ghi là production pass. Điểm trải nghiệm chỉ áp dụng cho kịch bản đã chạy. Một lần health 200 không chứng minh uptime.

## D005 — ưu tiên đợt đầu

Khôi phục niềm tin vào thao tác cơ bản trước: lỗi đầu vào dễ hiểu, không làm mất hồ sơ, không trừ quota vì dữ liệu sai, tạo/xuất CV nhất quán. Tiếp đó là trải nghiệm phỏng vấn và chất lượng nội dung; thương mại hóa sau khi qua các điều kiện nghiệm thu.

## D006 — 14/10/2026: profile version contract

PUT hồ sơ phải mang If-Match của GET account/me. Client cũ nhận428 và cần tải lại; không hỗ trợ ghi vô điều kiện vì nguy cơ mất dữ liệu. Nội dung trùng được retry idempotent, nội dung khác từ client cũ nhận409. ETag là content version account-bound, không phải lịch sử revision đơn điệu; không migration. Sau conflict không tự retry hoặc force overwrite, giữ draft để download/nạp mới. Rollback FE/BE cùng baseline. CI review branch được bật để kiểm chứng trước main.

## D007 — 14/10/2026: readiness PDF cần output có bằng chứng

Mở Chromium không đủ để báo có thể xuất PDF. Startup render mẫu fixed synthetic, xác minh buffer/PDF one-pageA4/source marker, không AI/profile/database. Health chỉ đọcstate/no-store, không thêm public trigger render. Disconnect hoặc fail thu hồi ready; chưa có automatic recovery/backoff, còn trongOPS001. Readiness engine không chứng nhận mẫu/phông/thứ tự đọc ATS hoặc hành trình authenticated download. Journal-only pushes bỏ CI lặp, source/workflow vẫn fullgates.

## D008 — 14/10/2026: export font giữ nguyên glyph và metric

Ghép subset của đúng font gốc đã kiểm tra license/metadata; không thay family để né lỗi parser. Asset immutable có tên hash mới, source fonts/CSS giữ nguyên, runtime chỉ thay known rules khi render isolated. CI kiểm tra geometry/crop/pagination và pypdf nguyên từ (casefold được, không nối khoảng trắng để che lỗi). Scoped font fix không chứng nhận mọi ATS hoặc toàn148templates; BIZ002 vẫn mở ngoài bốn Be Vietnam Pro weights/OFL.

## D009 — 14/10/2026: chủ dự án yêu cầu backup cloud, dọn local

Lưu bundle/build trên Google Drive riêng, xác minh checksum/khôi phục rồi xóa local, không giữ restore clones lâu dài. Giữ catalog/hướng dẫn nhỏ trong repo; staging upload/download/restore tạm có giới hạn dung lượng và dọn sau xác minh. Drive for Desktop đã có thể dùng để đọc byte file cloud khi browser download lỗi HTTP. Không cấu hình quyền/credential mới, không xóa Drive cache/tài liệu khác, không chia sẻ công khai. Yêu cầu này thay thế quy tắc giữ backup local của các lượt trước.

## D010 — 15/10/2026: production API origin và renderer recovery

Build FE phải khai báo public HTTPS origin; không dùng localhost fallback trong production. Runtime validation độc lập tránh artefact sai env; dev vẫn local. Renderer readiness sau recreate chỉ phục hồi qua fixed trusted PDF canary sau khi user slot được nhả; concurrent callers chia sẻ probe. Không dùng user PDF làm capability proof, không bỏ sandbox/capacity/auth. Lazy recovery qua successful PDF export chưa phải background retry hoặc DOCX-alone recovery.
