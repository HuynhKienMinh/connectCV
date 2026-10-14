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

## Cập nhật chu kỳ 0003 — 13/10/2026

[Nhật ký STAR và phản biện](runs/2026-10-13-cycle-0003.md): đọc đủ câu trả lời 3.000 ký tự, khung STAR theo câu/dòng nguồn, gợi ý luyện tiếp và không hiển thị điểm khi trích dẫn chưa khớp. 44 tests + build/CI đạt; một Gemini canary từ local với dữ liệu giả đạt; deploy 8bcf1eb/public smoke đạt. Chất lượng rubric đa ngành vẫn chưa nghiệm thu. Mục tiếp theo: cộng đồng/privacy/reward.

## Cập nhật chu kỳ 0004 — 13/10/2026

[Nhật ký cộng đồng/privacy](runs/2026-10-13-cycle-0004.md): preview và consent công khai, chặn contact rõ, không gửi profile thừa, không tính chia sẻ vào AI quota. 48 tests/build/CI đạt; deploy0f28096/live static/UI/auth smoke đạt. Không post public, moderation và data restore chưa đóng. Mục tiếp theo chatbot.

## Cập nhật chu kỳ 0005 — 13/10/2026

[Nhật ký chatbot](runs/2026-10-13-cycle-0005.md): hướng dẫn theo capability có nhãn nguồn, context allowlist, escape tên và giữ câu hỏi khi provider lỗi. 54 tests/build/CI đạt; deploy1fae1bf/live FAQ/static/UI/auth smoke xác nhận. Không có provider call thực trong cycle; CHAT001/eval và copy gói Pro còn cần rà, PDF/backup dữ liệu chưa đóng. Mục kế tiếp portfolio owner/visitor.

## Cập nhật chu kỳ 0006 — 13/10/2026

[Nhật ký portfolio](runs/2026-10-13-cycle-0006.md): scope/race guard, không giữ nội dung cũ khi tải lỗi, public no-store và matrix actor/owner. 62 tests/build/CI đạt, FE/BE926b49f đã verify live/asset checksum. Backup code/build/rollback cả FE và BE đã chuẩn bị; không có DB restore drill hoặc E2E hai Firebase accounts. Mục kế tiếp auth-profile/DATA001.

## Cập nhật chu kỳ 0007 — 14/10/2026

[Nhật ký profile conflict](runs/2026-10-14-cycle-0007.md): chống stale-tab overwrite bằng content version/If-Match trong transaction, giữ draft và recovery ở CV/Account;67 tests/build/CI đạt; FE/BEab9f9b3 verified live với backup code/build926b49f. Cloud two-account E2E, database restore và full revision history vẫn chưa nghiệm thu. Tiếp theo CV/PDF OPS001.

## Cập nhật chu kỳ 0008 — 14/10/2026

[Nhật ký PDF](runs/2026-10-14-cycle-0008.md): sửa pinned Chromium build/runtime, CI69 tests +3 production PDF scenarios đạt trên runner tương thích sandbox. Renderdd35955 live/rendererReady=true; auth export401 giữ nguyên; FE không đổi. Backupab9f9b3/rollback đã verify. Chưa cloud download E2E hoặc matrix148; phát hiện pypdf tách từ tiếng Việt ở native font subsets, giữ CV002 mở. OPS001 tiếp tục synthetic startup canary, không kết luận chuẩn mọi ATS.

## Cập nhật chu kỳ 0009 — 14/10/2026

[Nhật ký startup PDF canary](runs/2026-10-14-cycle-0009.md): readiness chỉ true sau PDF A4/source-text verifier, thu hồi khi disconnect; public health no-store và không kích hoạt render.74 tests +production QA/CI đạt. Render00a7804 actual canary verified1page26980bytes, smokeauth401 giữ nguyên; FE không đổi. Backupdd35955/rollbackverify. Tiếp theoCV002font extraction; downloadE2E/queue/recovery/database restore còn mở.
