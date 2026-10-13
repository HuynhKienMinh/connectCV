# Backlog có bằng chứng

Trạng thái: OPEN → IN_PROGRESS → VERIFIED_LOCAL → DEPLOYED → VERIFIED_LIVE. BLOCKED ghi điều kiện thiếu; không đổi sang DONE nếu chưa có nghiệm thu. P là ưu tiên công việc, không tự nhận là mức CVSS của lỗ hổng.

| ID | P | Vấn đề / tác động | Bằng chứng ban đầu | Nghiệm thu | Trạng thái |
|---|---|---|---|---|---|
| UX001 | P1 | Lỗi JD/profile chỉ hiện “dữ liệu không hợp lệ”; khách không biết sửa gì | Chu kỳ 2 tái hiện và sửa; bằng chứng runs/2026-10-13-cycle-0002.md | Lỗi rõ trường, preflight trên form, backend độc lập; dữ liệu sai không tiêu AI quota | VERIFIED_LIVE |
| DATA001 | P1 | Profile nhiều tab/thiết bị có thể ghi đè | accountStore.saveProfile update không revision | Test conflict hai client, revision/409 và recovery UI | OPEN |
| OPS001 | P1 | PDF server không hoạt động; khách phải tự chọn tùy chọn in | Public capabilities browserConfigured=false ngày 13/10 | Renderer sandbox/queue đạt; export nhiều trang/crop/text có bằng chứng | OPEN |
| OPS002 | P1 | Chưa có restore drill dữ liệu | Chưa tìm thấy bằng chứng phục hồi trong audit này | Backup mã hóa/inventory/subcollections; phục hồi và đối chiếu trên staging | OPEN |
| OPS003 | P1 | Thiếu staging và account test cho ghi dữ liệu liên tục | Lịch mới chưa có fixture account chuyên dụng | Hai account giả, reset staging, không chạm profile thật | OPEN |
| BIZ001 | P1 | Credits không chứng minh mô hình chi phí/thu tiền | consume mặc định cost=0; chưa thấy caller truyền cost trong lượt tìm kiếm | Feature pricing/cost mapping, atomic debit/refund, idempotency và sandbox | OPEN |
| BIZ002 | P1 | Quyền thương mại mẫu/ảnh/font chưa được xác minh | Không có hồ sơ license được cung cấp trong audit | Inventory nguồn/quyền; thay tài sản chưa được phép nếu cần | OPEN |
| UX002 | P2 | Trạng thái chờ/mất mạng không thống nhất | api.js fetch không timeout; Studio nhiều fetch riêng | Contract retry/cancel/timeout; test provider down và mạng chậm | OPEN |
| UX003 | P2 | Tên kỹ thuật cv.js/interview.js/backend lộ trong luồng khách | Browser UI chu kỳ 1 | Nội dung dễ hiểu, không mất định hướng; so sánh trước/sau | OPEN |
| UX004 | P2 | “AI” được dùng cho gợi ý chạy heuristic, có thể gây hiểu sai | auto-match-jobs và template matcher dùng dữ liệu/heuristic | Giải thích nguồn gợi ý, không hứa kết quả chưa kiểm chứng | OPEN |
| CV001 | P1 | Thiếu bộ eval chất lượng rộng ngoài regression grounding | 22 feature tests chủ yếu invariants | Fixture nhiều ngành/seniority; đánh giá trung thực và hữu ích riêng | OPEN |
| CV002 | P1 | Export chưa có visual/text regression đầy đủ | Asset test kiểm tra file và HTML, không so toàn bộ PDF export | Matrix 74×2 + profile dài/ngắn; không clipping/đổi font/mất text | OPEN |
| CV003 | P2 | Cần import/tóm tắt/profile hỗ trợ người thiếu dữ liệu | Chưa nghiệm thu | File validation, extraction preview, sửa trước lưu, nguồn facts | OPEN |
| INT001 | P1 | Giá trị luyện tập chưa có pilot người dùng | Chưa có user study được cung cấp | Buổi có follow-up/rubric/evidence và bài tập cải thiện | OPEN |
| INT003 | P1 | Chấm STAR riêng lẻ cắt câu trả lời và trả rewrite AI chưa ground | Chu kỳ 3: 2.422 ký tự được nhận nhưng tail bị cắt ở 2.000; output trả raw model | Full input, khung trích dẫn toàn câu, không bịa tool/số liệu, score chưa xác minh không hiển thị, có bước luyện tiếp | VERIFIED_LIVE |
| INT002 | P2 | Micro lỗi cần đường thay thế tốt | Phản ánh micro lỗi từ lịch sử | Test denied/no-device/lost-stream và tiếp tục bằng văn bản | OPEN |
| SOCIAL001 | P1 | Cần moderation/report và kiểm soát PII/reward abuse | Chưa nghiệm thu toàn luồng | Preview công khai, report, role actions, idempotency/cooldown | OPEN |
| CHAT001 | P1 | Cần eval hướng dẫn sản phẩm/prompt injection/PII | Chưa nghiệm thu adversarial bộ riêng | Không bịa capability, không lộ dữ liệu/secret, safe tool boundaries | OPEN |
| PORT001 | P1 | Cần kiểm chứng publish/private/owner từ hai account | Account tests chưa bao phủ mọi route portfolio | Matrix owner/visitor/second-account và cache invalidation | OPEN |
| SEC001 | P1 | Threat model và test tenant/account chưa đầy đủ | Có auth/CORS baseline, chưa có pentest toàn hệ thống | Ma trận actor/resource/action; negative tests trên local/staging | OPEN |
| SEC002 | P1 | Upload/render/URL fetch cần audit tài nguyên và egress | Chưa nghiệm thu audit sâu | MIME/magic/size, timeout, deny private URLs, renderer sandbox | OPEN |
| SEC003 | P2 | Log/redaction/rate limit cần diễn tập đa instance | Limit in-memory; socket bucket dùng địa chỉ proxy | Rate store phù hợp và test không ảnh hưởng tài khoản khác | OPEN |
| SEC004 | P1 | Lifecycle dữ liệu và backup chưa có end-to-end | Chưa tìm bằng chứng export/delete/restore | Consent, export/xóa có xác nhận, retention/cache/backup theo chính sách | OPEN |
| OBS001 | P2 | Chưa đo conversion, thời gian hoàn thành và lỗi thật | Health sample không có chuỗi metric | Events không PII, dashboard theo persona, funnel hoàn thành | OPEN |
| ACCESS001 | P2 | Keyboard/label/contrast/mobile chưa được nghiệm thu | Chưa có suite accessibility | Kiểm tra 360/390/768/1366, focus/modal/labels/contrast | OPEN |
| ORG001 | P2 | Recruiter/training cần tenant/roles riêng | Sản phẩm hiện thiên về tài khoản cá nhân | Thiết kế consent/role trước khi mở đa hồ sơ; isolation tests | OPEN |

## Chính sách chọn việc

Ưu tiên lỗi làm khách không hoàn thành tác vụ hoặc có nguy cơ mất/lộ dữ liệu. Mỗi chu kỳ chọn một issue chính; nếu không sửa được, phải tạo test/tái hiện/thiết kế/backup có giá trị cho lượt kế tiếp. Không thêm tính năng để tránh xử lý vấn đề đã xác nhận. Chủ dự án có thể đổi ưu tiên qua chat; ghi quyết định vào DECISIONS.md.
