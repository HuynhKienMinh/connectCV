# ConnectCV — nâng cấp liên tục và nhật ký review

Khởi tạo: 13/10/2026, múi giờ Asia/Saigon. Đích: sản phẩm có thể phục vụ người dùng trả tiền, với kết quả hữu ích, dữ liệu tin cậy và khả năng vận hành/khôi phục có bằng chứng.

**Kết luận ban đầu: chưa đủ bằng chứng để mở bán rộng rãi.** 36 kiểm thử hiện có đạt nhưng chưa chứng minh trải nghiệm toàn bộ hành trình, chất lượng AI ngoài bộ mẫu, khả năng khôi phục database hay vận hành khi có sự cố.

## Đọc nhanh khi chủ dự án rảnh

1. [ROADMAP.md](ROADMAP.md): kế hoạch nâng cấp, mục tiêu và điều kiện nghiệm thu.
2. [BACKLOG.md](BACKLOG.md): vấn đề được ưu tiên; trạng thái và bằng chứng.
3. [RUNBOOK.md](RUNBOOK.md): cách mỗi chu kỳ 15 phút làm việc, triển khai và rollback.
4. [DECISIONS.md](DECISIONS.md): quyết định của chủ dự án và lý do kỹ thuật.
5. [runs/2026-10-13-cycle-0001.md](runs/2026-10-13-cycle-0001.md): đánh giá/đối thoại phản biện đầu tiên.
6. [state.json](state.json): bước tiếp theo, lịch luân phiên, chính sách deploy và giới hạn hiện tại.

## Cách hoạt động

Mỗi lần lịch kích hoạt, tiếp tục vấn đề đang làm hoặc chọn một kịch bản kế tiếp: đăng nhập/profile → CV/ATS → phỏng vấn → cộng đồng → chatbot → hồ sơ năng lực. Không chạy sáu cuộc kiểm toán đầy đủ trong một phiên ngắn. Không chạy chồng phiên; công việc dài được tiếp tục ở chu kỳ sau.

Trong một phiên có ba góc nhìn: khách hàng đánh giá kết quả thực tế; kỹ thuật/DevOps/bảo mật tìm nguyên nhân và sửa; quản lý phản biện bằng chứng, phạm vi và hiệu quả. Đây là phản biện do cùng một trợ lý thực hiện, không phải ba người kiểm toán độc lập hay ý kiến khách hàng thật.

Mọi phiên ghi: thời điểm, phiên bản, persona, thao tác, kỳ vọng/thực tế, tác động, mức độ chắc chắn, đối thoại phản biện, thay đổi, kiểm thử, backup, commit/deploy, rollback và phần chưa làm. Nhật ký không ghi API key, token, mật khẩu, ảnh hoặc thông tin liên hệ người dùng thật.

## Quyền đã được giao

- Chủ dự án cho phép tự sửa và tự deploy để hoàn thiện sản phẩm, với backup và đường khôi phục trước khi deploy.
- Phục vụ tất cả nhóm khách hàng; nghiệm thu riêng từng nhóm thay vì tự suy diễn rằng một luồng đáp ứng tất cả.
- Giữ Firebase Auth và Google Sign-in. Chỉ thao tác repo `HuynhKienMinh/connectCV` và hạ tầng ConnectCV độc lập.
- Không sửa repo của nhóm khác. Không force push, ghi đè thay đổi thành viên khác hoặc hạ bảo mật để vượt qua kiểm thử.
- Không tự mua gói dịch vụ, chấp nhận hợp đồng hay mở rộng quyền truy cập. Nếu cần, chuẩn bị phương án cụ thể để chủ dự án quyết định.

## Giới hạn của lịch

Lịch trong chat là lịch của ứng dụng Codex trên máy, không phải daemon 24/7 trên Render. Máy và ứng dụng cần hoạt động, thư mục cần còn truy cập được. Lịch có thể bị chậm khi máy ngủ, mất mạng, hết hạn mức hoặc đang có phiên chạy. Không coi chu kỳ 15 phút là cam kết SLA.

Nguồn: [tài liệu chính thức về scheduled tasks](https://learn.chatgpt.com/docs/automations?surface=app).

## Trạng thái đầu tiên

- Baseline ngày 13/10: 22 feature tests + 10 account tests + 4 auth tests đạt; kiểm tra CSS đạt.
- Public: FE/BE trả 200; API profile/tạo CV không đăng nhập bị từ chối 401; origin không tin cậy bị từ chối 403.
- Public báo `browserConfigured=false`: chưa có renderer PDF phía server hoạt động. Browser Print là phương án hiện có.
- Chu kỳ đầu đã thử tìm và mở chi tiết mẫu Harvard. Chưa tuyên bố kiểm thử E2E AI/phỏng vấn/thu tiền hoàn tất.

## Cập nhật chu kỳ 0002 — 13/10/2026

[Nhật ký và phản biện UX001](runs/2026-10-13-cycle-0002.md): lỗi CV có field rõ, frontend preflight và server validation trước AI quota đã deploy/verified public tại c9cc05a. 39 tests + build/CI đạt, backup code/build đã thử restore. Không dùng live AI write hay thay profile thật. Mục tiếp theo: đánh giá phỏng vấn trên transcript giả. Kết luận thương mại vẫn chưa sẵn sàng; các release gates chưa thay đổi.
