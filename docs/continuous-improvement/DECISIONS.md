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
