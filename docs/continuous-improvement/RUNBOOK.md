# Runbook kiểm thử, phản biện, deploy và khôi phục

## Phạm vi được phép

Repo riêng HuynhKienMinh/connectCV; FE connect-cv.web.app; BE connectcv-api-minh.onrender.com; Firebase connect-cv. Không thao tác repo đội khác, domain connectcv.id.vn hay tài sản nhà cung cấp ngoài chức năng quản trị đã được giao.

Public: kiểm thử nhẹ các thao tác hợp lệ, tài nguyên tĩnh, health, lỗi auth/CORS. Các phép thử injection, upload nguy hiểm, quota abuse, tải và cách ly dữ liệu chạy local/staging, với fixture. Không brute-force login, gây DoS, lấy dữ liệu tài khoản khác hoặc persist payload nguy hiểm lên production.

## Chu kỳ 15 phút

1. **Khôi phục bối cảnh**: đọc state, backlog, run trước và quyền mới từ chủ dự án. Ghi start và commit; git status; fetch remote nếu có thể. Nếu có thay đổi ngoài phiên, đọc diff và bảo toàn; không reset/stash/delete để lấy workspace sạch.
2. **Chọn một tác vụ khách hàng**: persona, mục tiêu, tiền điều kiện, dữ liệu giả, bước, kỳ vọng. Ưu tiên bug đang mở trước rotation. Không điền dữ liệu giả vào profile thật vì autosave.
3. **Thử và ghi bằng chứng**: dùng UI cho trải nghiệm; dùng test/API cho kỹ thuật. Đo thời gian và số thao tác có cách đo. Ảnh có dữ liệu người thật không đưa vào Git; redact hoặc chỉ chụp fixture.
4. **Đánh giá khách hàng**: điều gì hữu ích, điểm gây bỏ cuộc, độ tin cậy, kết quả có dùng được không, có đáng trả tiền với phạm vi đã thử không. Nếu chưa thử, ghi chưa đánh giá, không tự chấm điểm.
5. **Kỹ thuật/DevOps/pentest**: tái hiện; phân biệt code/config/provider; root cause và impact; chọn sửa nhỏ nhất giải quyết nguyên nhân. Ghi giả thuyết và phản chứng.
6. **Quản lý phản biện**: câu hỏi → phản hồi kỹ thuật → bằng chứng → kết luận và điều kiện chưa đạt. Không đánh đồng test xanh với UX tốt, không đóng ticket bằng lời hứa.
7. **Sửa và kiểm thử**: trên nhánh riêng nếu cần. Test regression lỗi thật, thử before/after. Full CI khi thay code; chỉ chạy lại phạm vi có lý do.
8. **Backup và deploy**: theo checklist dưới. Không đổi dữ liệu khi backup/restore chưa đạt. Deployment nhỏ, tương thích; giữ app đang dùng ổn định.
9. **Checkpoint**: ghi run markdown, liên kết evidence và test logs; cập nhật issue/state/decision. Nếu chưa xong, giữ activeIssue cho lượt sau. Không bắt đầu phiên chồng để chạy cho đủ lịch.

Rotation: auth/profile → CV/ATS → interview → community → chatbot → portfolio. Trong mỗi module luân phiên happy-path, empty/invalid, mạng chậm/offline, mobile/accessibility, bảo mật và export/permission. Phần cần micro do người thử thực hiện; thiếu micro ghi chưa nghiệm thu, dùng văn bản để tiếp tục.

## Điều kiện test và chi phí

- Có dedicated synthetic accounts trước test cloud writes. Nếu thiếu, test local/staging và ghi hạn chế; vẫn tiến hành các công việc độc lập.
- Không gọi AI chỉ để chứng minh cron đang chạy. Mỗi chu kỳ tối đa một scenario AI nếu cần; giới hạn tạm tối đa 12 lượt scenario AI/ngày trong state, giảm hơn khi hết quota. Chưa có account test thì live AI writes bị chặn.
- Không trả tiền/nâng gói, đổi IAM, xoay credential hoặc chấp nhận điều khoản để vượt blocker. Chuẩn bị cấu hình/ước tính và đề nghị quyết định cụ thể khi thật sự cần.
- Có thể sửa/deploy ứng dụng theo quyền mới; không được giảm xác thực, sandbox, CSP hoặc kiểm tra certificate để làm demo hoạt động.

## Checklist trước deploy

1. Có issue + reproduction + acceptance rõ; diff không đụng file người khác.
2. Remote đã kiểm tra, merge không force. Phát hành trên main chỉ bằng fast-forward/merge có lịch sử, không thử lỗi trực tiếp trên main.
3. Backup code/build ngoài Git: git bundle, verify, SHA256, commit đang live; package lock và build được ghi.
4. Backup thay đổi cấu hình cần giữ được giá trị cũ trong kho riêng; không copy secrets vào tài liệu public.
5. Nếu schema/migration/bulk data: encrypted snapshot đầy đủ collections/subcollections, inventory/count/checksum và restore drill trên staging. Backup code không thay thế bước này. Chưa được thì không migrate.
6. Test phù hợp + full CI đạt, dependency audit/secret check tương ứng; không có P0/P1 mới đã xác nhận. Với API đổi kiểu/nullability/ý nghĩa điểm, replay client cũ→server mới và client mới→server cũ trước deploy; nếu cần version gate, chặn trước quota/provider và giữ nội dung người dùng, không tự reload.
7. Có rollback target cho BE và FE, flags/config và các thay đổi dữ liệu tương thích ngược. Chưa có quyền/phiên hosting thì không ghi “deployed”.
8. Deploy BE/FE theo thứ tự tương thích API. Xác minh đúng commit và version assets.
9. Smoke auth/profile và module bị ảnh hưởng; kiểm tra errors/latency. Fail thì rollback theo target, ghi incident, không lặp redeploy mò.

## Backup đã khởi tạo

Baseline ngoài repo: `work/private/connectcv-backups/2026-10-13-baseline/` trong workspace của chat. `repository.bundle` là mã nguồn/lịch sử Git; `frontend-dist/` là build FE. Checksum và kết quả xác minh ghi trong manifest/run. Không có Firestore snapshot hoặc Firebase Auth credential export trong bản này.

Không ghi secret/hash mật khẩu/user data vào repo. Khi tạo backup database sau này: dùng secret nằm ngoài Git; mã hóa bằng key lưu riêng, ACL giới hạn; không tự upload sang Drive/GitHub hoặc cloud mới. Record chỉ chứa inventory và checksum. Có kế hoạch retention và diễn tập mất key; mã hóa không giúp phục hồi nếu mất key.

## Khôi phục mã nguồn để kiểm chứng

Ở thư mục mới ngoài repo đang làm việc:

```powershell
git clone --no-checkout "<backup>/repository.bundle" "<fresh-restore-dir>"
git -C "<fresh-restore-dir>" rev-parse HEAD
git -C "<fresh-restore-dir>" fsck --full
```

Đối chiếu commit/checksum manifest. Để rollback deployment, ưu tiên rollback release cũ của Render/Firebase đã ghi; hoặc tạo revert commit có kiểm thử và deploy. Không dùng reset --hard/force push trên repo thành viên.

## Khôi phục dữ liệu (chưa nghiệm thu)

Chỉ thực hiện sau khi có snapshot và restore drill. Tạm khóa mutation cần thiết bằng maintenance mode tương thích; chụp pre-restore snapshot; phục hồi vào staging trước; đối chiếu docs/subcollections/count và invariants owner/credits/ledger. Quyết định phạm vi khôi phục để tránh ghi đè giao dịch mới hợp lệ. Database restore khác auth restore; không tự xóa/tái tạo người dùng Firebase.

## Nội dung bắt buộc của nhật ký

Run ID; giờ VN và UTC; commit/branch; persona/module; bằng chứng pass/fail/unverified; bước tái hiện; severity/confidence; câu hỏi phản biện và trả lời có evidence; file/diff/commit; kiểm thử cụ thể; backup id/checksum; deploy/live check; rollback; remaining risks; bước tiếp theo. Không ghi chuỗi suy luận nội bộ, chỉ ghi quyết định và lý do có thể review.

## Cổng xác nhận “đủ bán”

Theo bảng release gates trong ROADMAP. Các đầu ra của AI được đánh giá hữu ích bởi người thử thật. Trợ lý có thể đề xuất pilot; không tự thông báo đã có khách hàng, doanh thu hoặc kiểm toán độc lập.

## Capacity và restore mã nguồn — cycle10

Kiểm tra dung lượng trước tạo bundle/restore/build. Full restore checkout có thể cần nhiều hơn bundle vì ảnh lớn; không tiếp tục cho đầy disk. Bare clone từ verified bundle với --branch main, fsck toàn object và git archive critical source là bằng chứng phục hồi object/code, không phải full working-tree hoặc database restore. Với Windows đặt core.autocrlf=false riêng cho archive để đối chiếu byte Git blobs; không sửa global Git config. Nếu thiếu chỗ, chỉ dọn partial restore do chính lượt đang chạy tạo sau khi xác minh path nằm trong backup root và bundle vẫn còn. Không xóa backup cũ/user files; phải xử lý OPS004 trước khi dung lượng không còn đủ backup kế tiếp.

## Chính sách backup cloud — có hiệu lực sau yêu cầu 14/10/2026

Backup mã nguồn/build hiện lưu tại Drive theo backup-transfer/catalog.json. Khôi phục: tải bundle mốc phù hợp và ZIP companion về thư mục tạm; kiểm checksum, clone/ref/SHA/fsck; giải nén frontend-dist và firebase-rollback.json đúng mốc. Chỉ giữ catalog nhỏ trên máy. Dọn bundle/build/restore temp sau khi cloud xác minh được; nếu fail, giữ bản duy nhất và chặn deploy. Mỗi đợt mới cần baseline hiện đang live, không dùng bundle cũ sai SHA. Native Google Drive for Desktop stream có thể đọc trực tiếp để so hash, không cần thêm credentials/API permissions. Không xóa cache của provider hoặc dữ liệu người dùng.

## Git account selector — cycle13

GCM có nhiều account nên command không-interactive có thể fail dù account đã đăng nhập. Repo này phải dùng per-command `git -c credential.username=HuynhKienMinh -c credential.interactive=false push origin <review-branch>`; credential lookup cho API cùng username. Không log credential, không đổi global config hoặc force-push. Chỉ yêu cầu chủ dự án đăng nhập lại sau khi selector đúng vẫn thiếu credential; không suy diễn lỗi account chooser là Render/billing/code.


## Mobile Google login — cycle19

Repro triage: hỏi browser/app và exact domain, không kết luận redirect chỉ từ helper error; source trước cycle19 dùng popup. Trong Zalo/WebView hướng dẫn menu mở Safari/Chrome hoặc copy fixed https://connect-cv.firebaseapp.com/login; anchor tự mở không được hứa là sẽ thoát WebView. Existing Firebaseapp domain là same-origin với authDomain; account persistence theo từng origin, giữ signed-in app ở domain đó. Không thêm callback/IAM hay yêu cầu tắt browser privacy. Không clear session/localStorage hay tự lặp redirect. UA không luôn nhận diện app nên mobile hint luôn hiện. Test browser có SDK giả chỉ chứng minh flow/UI; đóng AUTH002 sau user xác nhận iPhone thực.

Hosting-only rollback cycle19: baseline versioncaed1696d4a4fa98, exact command ở backup-transfer/cycle0019-firebase-rollback.json. Nếu provider version không còn, restore verified FE15ZIP từ Drive, kiểm CRC/tất cả memberSHA, giữ firebase.json đúng mốc và deploy hosting-only; xác minh index-BVFhznbg.js SHA trong cycle0015-frontend.json. Đường rollback code/build đã kiểm; chưa thực hiện live rollback vì không có deployment failure. Code backup không phải DB backup. Latest restore chain candidateaa có cả baselinef438/be7/aa; exclude candidateCommit khi tạo delta kế tiếp, không dùng baselineCommitf438 làm current FE source.


## Hồ sơ/ảnh lớn413 — cycle20

Tái hiện tại local bằng syntheticJPEG≤3MB có entropy cao; trướcfix2alias tạo~4.94MBJSON vượt900KiB. Không tăng parser/field limit hoặc chạy testghi trên accountthật. Nén client trước upload, keeponecanonicalavatar, kiểmUTF8≤850KiB trướcPUT; readonlypublic smoke chỉ sourcehash/auth401/CORS/startupcanary saudeploy. ProfileJSON không phải backupdatabase. Khi yêu cầu user nạp bản mới, nhắc giữ/sao chép nội dung nháp trước tải lại trang; không hứa autosave đã thành công khi nhận413. Sau reload user chọn lại ảnh gốc vàlưu; ảnhgốc trênmáy không thay đổi. Original incident chỉ đóng sau xác nhận phạmvi hiệuquả; authenticated production save và matrixformat/iOS vẫn cần user/dedicatedtestaccount. Rollback Renderf438/dep-db87nqqvcj2c738hi8pg, cloudchaincatalogcycle0020-candidate-1bf75b9.json.


## Receipt release —cycle46/47

CurrentRender0bf51ec/dep-dbar56u7bikc73akq250; rollback dùng retained release391fdc3/dep-db9khkjrjlhs73f60aeg qua Render khi có incident, kiểm exactSHA/source/auth/canary saurollback. FEHosting9b4f9bcd010b4645 không đổi. Nếu provider không giữrelease, restore17bundle chain từ catalogcycle0046-candidate-0bf51ec.json vào bounded freshbare, verify SHA/fsck/43critical, lấy391 làm exactrollbackcommit; currentFEZIP/memberSHA cùngcatalog. Dọn ownstage sau verifiedprivatecloud, không xóa bản duy nhất. Không rollbackdatabase bằng codebundle. Receipt newfields additive; tab cũ có thể còn logic clearform/cooldown cũ nên không hứa thay mọi tab, không force-reload làm mất nháp. Tránh publicwrite smoke khi chưa có dedicatedtestaccount.
