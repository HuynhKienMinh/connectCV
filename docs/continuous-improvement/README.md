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

Cycle10 (14/10/2026 16:39VN): commit05fc9e9 live BE, scoped native PDF Be Vietnam Pro normal-weight word extraction fix. 77tests local đạt; geometry/text đạt trên Windows local và Linux CI, 7-page local pixel comparison exact; source assets SHA/livecanary verified. Full148export matrix/authenticated download E2E chưa đạt. Nhật ký runs/2026-10-14-cycle-0010.md. OPS004 capacity gần đầy cần xử lý trước backup/deploy tiếp.

Cycle11 (14/10/2026): [Chuyển backup và dọn dung lượng](runs/2026-10-14-cycle-0011.md). 10 bundles và gói build/manifest trên Google Drive riêng đã đối chiếu đầy đủ checksum; xóa 4,769,220,897 bytes backup/restore copies trên máy và dọn staging. OPS004 đã xác minh; các đợt deploy sau dùng cloud backup và staging tạm có giới hạn. Code/build backup không thay thế database backup.

Cycle12 (14/10/2026): [Ma trận văn bản PDF](runs/2026-10-14-cycle-0012.md). 148 exports local bằng profile ngắn giả/A4; 82cases giữ đủ tám facts theo pypdf, 58cases split-word và 8cases thiếu title trong template gốc. Giữ report/ảnh nhỏ, dọn24.43MB PDF temp; không runtime change/deploy. CV002 mở, tiếp theo prototype Roboto/font khác và review layout; chưa chứng nhận ATS hoặc toàn bộ UX.

Cycle13 (14/10/2026): [Prototype Roboto và delivery](runs/2026-10-14-cycle-0013.md). Phương án static merge đọc6/6facts nhưng failpixel/geometry; officialv3.015 full source giữ metrics/glyph vẫn failmarker/geometry. Không phát hành hai prototype, giữCV002mở; dọn staging và giữ report nhỏ. Push review đã khôi phục khi chọn rõ credential.username=HuynhKienMinh; không đổi globalconfig/credential.

Cycle14 (14/10/2026): [Phản chứng hinting/Type3](runs/2026-10-14-cycle-0014.md). Restorehintbytecode không làm pixelgate đạt; Type3unitsnormalize đạt pixel0 một case nhưng text vẫnfail. Hai giả thuyết bị bác bỏ, không runtimechange/deploy; CIcc7e27e đạt. Tiếp tụcglyphrepresentation/variation với evidence, không nới gate chỉ để báo sửa xong.

Cycle15 hoàn tất (15/10/2026): [API production và phục hồi xuất PDF](runs/2026-10-15-cycle-0015.md). Frontend gọi đúng Render, build từ chối cấu hình localhost; backend phục hồi readiness qua canary tin cậy và client kiểm tra lại trạng thái khi nhấn tải PDF thiết kế. Backend94e4418 đã live, CI84 tests và các cổng PDF đạt; source live khớp Git, canary đã xác minh, API không đăng nhập vẫn trả401. Bốn ca browser fixture trước/sau/unverified/timeout đạt, dùng API và lưu file giả. Backup Drive có checksum/restore proof; đã dọn staging, không giữ bundle/build/restore clone trên máy. Chưa xác minh tải PDF production có đăng nhập, toàn bộ ma trận mẫu hoặc khôi phục database. Tiếp theo CV002: tám ca thiếu tiêu đề, không lặp lại các prototype hinting đã bác bỏ.


Cycle16 hoàn tất (15/10/2026): [Giữ chức danh trong bốn mẫu CV](runs/2026-10-15-cycle-0016.md). Bốn layout thiếu slot chức danh ở VI/EN đã được thêm dòng editable dưới tên; giá trị rỗng không thêm dòng, dữ liệu được escape.87 unit tests, tám PDF đủ tám facts và bốn ca wrap dài đạt local/LinuxCI. Backendb1a2279 live, sourceVersion/canary/auth và frontend không đổi được xác minh. Chưa authenticated cloud generation/download hoặc tự cập nhật CV đã lưu. Backup Drive delta17KB có restore proof; đã xóa239.59MB restore staging, không giữ backup local. Tiếp theo chuyển vòng phỏng vấn ngoài IT; CV002 và các cổng thương mại còn mở.


Cycle17 hoàn tất (15/10/2026): [Báo cáo phỏng vấn đúng lượt và điểm](runs/2026-10-15-cycle-0017.md). Giữ nguyên câu/phủ định, không mượn thành tích lượt khác, bỏ model prose chưa kiểm; điểm0/null hiển thị đúng. Tab cũ nhận409 trước quota và giữ transcript qua reportVersion2.93tests, review/mainCI đạt; b3ca417 live, source/static/auth/canary và FEhash xác minh. Drive backup baseline884 có checksum/restore proof; staging240.49MB đã xóa, không giữ backup local. Chưa authenticated production AI/microphone/human pilot; INT001 và commercial gates mở. Tiếp theo SOCIAL001 local privacy/reward retry.


Cycle18 hoàn tất (15/10/2026): [Avatar, căn giữa và job giả](runs/2026-10-15-cycle-0018.md). Yêu cầu trực tiếp chủ dự án: mặc định giữ toànảnh, tùy chọn cover/zoom; preview căn giữa và thu vừa desktop/mobile, export giữ A4; savedCV không companion tự nạp helper.100job giả/10ngành với nhãn rõ, điểm từkeyword/role, khôngfloor85.96unit+UI/PDF/CI đạt; f438d16 live, source/helpers/catalog100/auth/canary/version kiểm chứng. Candidatea276 hủy trước live để sửa saved-CVcompatibility. BackupDriveb3 córestoreproof; xóa240.71MB staging, không backup local lớn. Chưa authenticated production matching/generation/export hoặc toàn148avatar/layoutmatrix. Tiếp theo SOCIAL001local.


Cycle19 (15/10/2026): [Google login từ Zalo/iPhone](runs/2026-10-15-cycle-0019.md). Chủ dự án xác nhận Zalo/web.app. WebView có hướng dẫn mở Safari/Chrome/copylink; mobile chuyển tới existing Firebaseapp same-origin để redirect, desktop giữ popup.104units+10mockbrowser+review/mainCI đạt; Hostingaa53702/version7cca55f6a3f836b9 live9checks hash/guard/handoff/auth401/CORS, BE giữf438. Drive code/build checksum+restore verified, dọn mọi staging/build trênC. Actual iPhone/Google OAuth chưa replay; AUTH002 originalincident cònOPEN tới userconfirmation.


Cycle20 (16/10/2026): [Lưu hồ sơ có ảnh lớn](runs/2026-10-16-cycle-0020.md). Upload3MB nhưng field350k/body900KiB và duplicatebase64 gây413. Nén toànảnh768px/≤240kchars, mộtavatar, xử lý draftcũ và lỗi giữdraft/If-Match/race. Synthetic1.85MBJPEG: JSON4.94MB413→165KBsavePASS;108units+6integrationphases LinuxCI đạt. BE1bf75b9/dep-db8h2lu89jmc73dol4rg live7source/auth/canary/FEhashchecks; FEHostingaa không đổi. Drivechecksum/restore verified, dọn241.9MB staging, không giữ backup/buildlocal. ActualuserproductionSave chưa thử; giữDATA002 pendinguserretry và các commercialgates OPEN.


Cycle21 (16/10/2026): [Lỗi giao dịch và retry cộng đồng](runs/2026-10-16-cycle-0021.md). Năm regression test mới kiểm tra rollback trước commit, response mất sau commit, callback replay, cooldown giữa draft/owner và metadata public. Local/review/main CI đạt trên83f82f8; mô hình in-memory không chứng minh Firestore cloud isolation. Retry sau response mất trả409 nhưng không thưởng lặp; ghiSOCIAL003P2 về receipt recovery, SOCIAL001 HTTP/moderation vẫnOPEN. Chỉ test/workflow/docs; không đổi production, không ghi cộng đồng/account thật hoặc tạo backup/build lớn.


Cycle22 (16/10/2026): [HTTP cộng đồng](runs/2026-10-16-cycle-0022.md). Sáu scenario localHTTP mới, review/mainCIea36649 đạt; tái hiện mất socket sau commit và retry409, không thưởng lặp. Không đổi production.

Cycle23 (16/10/2026): [Report API và read compatibility](runs/2026-10-16-cycle-0023.md). Candidate1c597a1 trên reviewCI đạt125tests cùng PDF/UI gates: receipt dedupe/privateadmin GET/HEAD/no-store, filterhidden, fallbackrestart; không thưởng/auto-hide. Chưa main/deploy: thiếu reportUI/browser và schema encryptedDBrestore gate. Phải có reader-compatible rollbackbaseline trước actionhide/reinstate; production giữ1bf/FEaa, không tạo backup/buildlocal lớn.


Cycle24 (16/10/2026): [Giao diện báo cáo và lỗi mạng](runs/2026-10-16-cycle-0024.md). Candidate6d6831a reviewCI đạt125units+12browserphases mới: requiredreason, safeerrors, retain/retry/dedupreceipt, timeout, logoutlate-result, keyboard/mobilebounds. Chưa main/deploy vì DBschema encryptedbackup/restore và candidatebackup gates; production giữ1bf/FEaa. Ảnh/report giả nhỏ trong output/playwright/community-report; không backup/build/restoreclone lớn.


Cycle25 (16/10/2026): [Snapshot mã hóa offline](runs/2026-10-16-cycle-0025.md). Prototype74d8931 reviewCI đạt132units vàgateshiệncó;7tests mới vềtype/scope/nonce/tamper/key/capacity. Chỉenvelope+Mapsynthetic, chưaDBsnapshot/Firestoreemulatorrestore; databaseVerified=false. Phươngán DATABASE-RESTORE-PLAN.md đã lưu, chờownerchọnnơigiữkhóariêng; tiếpcollectorfixtures. Main/livekhôngđổi, khôngtạokey/backup/buildlớn.


Cycle26 (16/10/2026): [Collector snapshot chỉ đọc](runs/2026-10-16-cycle-0026.md). Candidateacbdbd1 reviewCI đạt149units/gates;17tests mới kiểm fixedreadTime/pagination/missingparent/caps/timeout/failclosed và scopedstreamtransport quafakeFetch. Chưa CLIcredential/timeacquisition/emulator/realDBrestore; chờkeycustody từcâu hỏi cũ, không nhắc lại. Main/livekhôngđổi, không đọccloudPII hay tạo backup lớn.


Cycle27/28 (16/10/2026): [Restore emulator thật](runs/2026-10-16-cycle-0027.md) đạt sáu pha synthetic local/CI a4d366d; staging/JAR đã dọn. [Probe readTime cố định](runs/2026-10-16-cycle-0028.md) thêm tám test fake HTTP, cùng mốc qua collector, chặn query widening và token treo. Candidate0accbf5 review-only; chưa database backup thật, credential/provider proof hoặc custody khóa. Main/live giữ nguyên.


Cycle29 (16/10/2026): [Phiên credential được cấp tường minh](runs/2026-10-16-cycle-0029.md), candidate55a7f2b reviewCI đạt164units và gate hiện có; bảy test mới về TTL/deadline/dedupe/cancel/late token và composition với readTime/collector. Không đọc credential thật hoặc cloud; custody và database backup thực vẫn chờ, main/live không đổi.


Cycle30 (16/10/2026): [Pipeline snapshot mã hóa trong RAM](runs/2026-10-16-cycle-0030.md), candidatec7ecc5b reviewCI đạt171units/gate hiện có. Bảy test mới về preflight custody/key trước I/O, chuỗi typed readback, partial failure và cancel/late token. Chỉ fake provider; chưa custody thật, cloud snapshot/Drive hoặc wrapper-to-emulator proof, main/live không đổi.


Cycle31 (16/10/2026): [Archive wrapper phục hồi emulator thật](runs/2026-10-16-cycle-0031.md), candidate26227e1 reviewCI đạt; ba pha mới real zero-query/typed export→restore archive wrapper→re-export, tổng chín pha synthetic. JAR/staging dọn ngay. Provider/cloud/key custody thực chưa kiểm chứng; SOCIAL001/OPS002 vẫn deferred/chặn deploy, tiếp CHAT001 local theo rotation. Main/live không đổi.


Cycle32 (16/10/2026): [Chatbot reset/late-response](runs/2026-10-16-cycle-0032.md), CHAT003P2 baseline6fail/1pass trên actual controller VM→7/7 sau generation/abort/deadline60s. Candidate1ec65f3 reviewCI đạt178units/gates; chưa browser lifecycle/auth E2E hoặc deploy. CHAT001 tiếp HTTP/provider-stub eval; main/live và gate backup không đổi.


Cycle33 (16/10/2026): [HTTP chatbot và privacy route log](runs/2026-10-16-cycle-0033.md), candidate83826b8 reviewCI đạt184units/gates. Sáu scenario actual mount/auth/quota/owned facts/projection với stub; raw provider error sentinel từng vào route log, đã thay fixed diagnostic. Chưa model/upstream-log/browser E2E hoặc deploy; main/live và gate backup giữ nguyên.
