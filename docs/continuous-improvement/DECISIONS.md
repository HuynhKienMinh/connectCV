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


## D011 — 15/10/2026: chức danh là dữ kiện cần giữ khi dựng CV

Bốn layout classic_1, schoolarship_standard, senior_2, software_engineer không có slot title trong bản nguồn. CV render mới thêm dòng chức danh dưới tên khi có giá trị; editable, escape như các field khác, normal flow để wrap. Giữ template/font nguyên bản và gallery preview; chấp nhận thay đổi có chủ đích về chiều cao header thay vì pixel-exact với bản thiếu field. Không migration hoặc tự sửa HTML đã lưu. Nghiệm thu riêng tám PDF facts/long-title bounds và kiểm version live; không từ đó đóng toàn bộ CV002/ATS/licensing hay authenticated cloud E2E.


## D012 — 15/10/2026: hợp đồng báo cáo phỏng vấn phiên bản2

Live-summary yêu cầu reportVersion số2 trong JSON. Request thiếu/sai trả409 INTERVIEW_REPORT_CLIENT_OUTDATED trước action buckets/AI budget và trước provider; auth vẫn kiểm trước. Client mới hiểu score number/null, hiển thị0 đúng và Chưa xác minh cho null. Tab cũ phải lưu/sao chép hội thoại trước khi tải lại; không tự reload hoặc xóa liveInterviewHistory. Đây là version negotiation để tránh UI cũ tự chèn8, không thay thế auth hoặc kiểm dữ kiện server. Quote khớp chỉ chứng minh hiện diện nguyên câu trong đúng lượt, không chứng minh đúng semantic STAR, chất lượng rubric hay kết quả tuyển dụng.


## D013 — 15/10/2026: avatar, viewport và catalog job giả theo yêu cầu trực tiếp

Avatar mặc địnhcontain để giữ toàn ảnh; cover/zoom chỉ do người dùng chọn. Kích thước export dùng layoutoffset, không dùng boundingrect đã zoom. Preview căn giữa/thu vừa chỉ @media screen, loại style/scale khi export; PDF trustedrenderer dùng chung photo helper, không chạy JS từ HTML người dùng. Catalog100job hưcấu,10/ngành cho10nhóm chuyên môn hiện có; nhãn Đa ngành/Chuyên nghiệp là style, không tạo ngành giả. Không dùng doanhnghiệp/logo thật hoặc seedDB. Matcher70keyword+30role, ngưỡng40, không épmin85, không quảng cáo xác suất tuyển dụng/semantic AI. Bộpositive100profile là regression tựkhớp, không phải đánh giá thịtrường/laođộng.


## D014 — 15/10/2026: đăng nhập Google từ Zalo/iPhone

User xác nhận web.app mở trong Zalo. Không bắt đầu OAuth trong detected embeddedWebView; hướng dẫn Safari/Chrome và fixed clean project-ownedURL. Ordinary mobile chuyển từ web.app sang existing firebaseapp.com (đã phục vụ cùngapp, BE CORS đãallow), rồi user bấm Google lần nữa để same-origin redirect. Không đổi authDomain/OAuth callbacks/IAM, không thêm browserprivacy exceptions. Phiên Firebase ở mỗi origin riêng nên sau login giữ app tại firebaseapp.com. Desktop giữ popup; current user/onIdTokenChanged vẫn là authority, không session/JWT giả. Unit/browser với SDK giả không chứng nhận actual iPhone OAuth; original incident còn mở tới user replay.


## D015 — 16/10/2026: avatar lưu hồ sơ phải vừa hợp đồng account

Upload nhận tối đa3MB nhưng account field350kchars/body900KiB; giữ các giới hạn server. Client xuất ảnh toànkhung/proportional≤768px, JPEG≤240kchars, nền trắng cho transparency; original localfile không đổi. Chỉ lưu avatarUrl, vẫn đọc aliasavatarDataUrl để tương thích draftcũ; compact trước PUT và UTF8≤850KiB. Không âm thầm cắt nội dung hoặc bỏ ảnh khi lỗi; giữ draft/retry/If-Match. Đây là nén ảnh có mất chất lượng có chủ đích cho avatar, không phải nơi lưu ảnh gốc. Không migration/bulk rewrite account, không đưa ảnh vào AI.


## D016 — 16/10/2026: kế hoạch kỹ thuật report/kiểm duyệt theo hai bước

Đây là lựa chọn triển khai trong phạm vi tựsửa đã giao, không phải xác nhận mới của chủ dự án. Báo cáo dùng reason allowlist, một receipt/verified actor/post, không thưởng hoặc auto-hide. Private queue chỉ trusted verifiedadmin; không tự cấp adminclaim/IAM. Reader hiểu hidden trước khi có bất kỳ actionẩn: verify/backup release đọc tương thích làm rollbackbaseline trước release hide/reinstate/audit, vì rollback1bf sẽ lộ lại bàiẩn. Candidate1c597a1 ở review, không main/deploy. Schema report mới vẫn phải qua encryptedDBsnapshot/restore theo RUNBOOK; code/buildDrive không thay dữliệu backup. Không migration/bulkwrite để né gate. UI/retention/actualadmin/cloudactors còn mở.


## D017 —17/10/2026: dừng micro khác gửi bản ghi

Stop/cancel, gõ Gửi và AI playback phải discard PCM, detach recognizer callbacks, stop tracks/disconnect graph/close context; chỉ explicit recording completion/VAD finish được transcribe. getUserMedia late grant không được sống lại sau cancellation hoặc chiếm phiên mới. Permission denied/audio-capture/mất track đưa người dùng về ô gõ với draft giữ nguyên; không tự prompt engine khác sau denied hoặc hiển thị raw device exception. Service-not-allowed vẫn có fallback engine khi người dùng đã yêu cầu Mic. Không claim physical microphone/iOS/ASR correctness từ synthetic device tests. Những request transcribe/live-chat/TTS đang pending có lifecycle riêng chưa nằm trong scope này.


## D018 —18/10/2026: receipt retry cộng đồng phải dựa trên bằng chứng lưu thật

Coarse contenthash chỉ lookup, không idempotency proof. Chỉ cùng verifiedowner/fullpubliccontent và persisted post+reward event nhất quán mới trả receipt đã lưu; replayaward0 và timestamp gốc, không sửa balance/cooldown/schema. Crossactor/editedpayload/legacy thiếu evidence trả409 generic. File pending ledger không được hứa credited balance. UI phải refresh account từ server và giữ thời điểm xuất bản gốc; chưa browserverify thì chưa release dù service tests xanh. Không đưa report/ops schema deferred vào candidate.
