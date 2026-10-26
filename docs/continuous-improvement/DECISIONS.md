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


## D019 —19/10/2026: receipt giữ nháp mới và cooldown account mới nhất

Response thành công chỉ xóa form nếu cả6field còn giống snapshot trước await; có edit thì giữ nguyên toàn form và yêu cầu preview/consent lại. Recovery nhận award0, refresh balance từ accountGET, không tự cộng5 hoặc retry. publishedAt giữ ngày bài gốc; cooldownStartedAt=max(publishedAt, account.lastCommunityAt) để receipt cũ không bỏ qua bài mới hoặc đặt lại6giờ từ retry. Không thêm DBfield/schema; filefallback đọc latest ownerledger, không hứa balance đã credited. Receipt owner-sensitive no-store. Browser synthetic và actualHTTP/local transaction model không thay realFirebase/cloudactor E2E.


## D020 —19/10/2026: token iframe gắn phiên SDK và document

Quyết định kỹ thuật trong quyền tựsửa: FeaturePage dùng keyUID/module để nháp in-memory child không đi sang accountkhác. Message cần origin+source+strictrequestId đúng cảtrướclấy token; completion chỉ gửi nếu effect cònactive, cùngSDKuser đangverified, cùngframe và documentonLoadepoch. SDKfailure trảnull cho currentrequest, không rawerror. Không thayFirebase/Google/IAM/sandbox; invalidatecompletion không được hứa đã revoke token ởprovider. Mobile/actualFirebase cần replaythật, syntheticSDK/browser chỉnghiệmthu scope lifecycle. Đổiaccount cốý bỏnháp ởiframe cũ; không tựrefresh usertab hiện tại khi deploy.


## D021 —19/10/2026: AccountPage async action thuộc phiên và thao tác hiện tại

UID string không đủ khi quay A→B→A. Session object mới sau actor transition/effect cleanup và operation object khóa submit đồng bộ; completion chỉ đổi profile/version/conflict/message/busy khi còn ownership. Guard trước logout hoặc bước tiếp theo reload/token/browser reload, không hứa hủy request đã gửi hoặc revoke provider token. Nạp conflict có xác nhận vẫn giữ draft khi thất bại. API If-Match/auth/server không đổi; actual Firebase/account production E2E còn mở. Candidate workflow lấy main gates cộng AccountPage, không mang deferred ops/report checks chỉ có trên review.


## D022 —19/10/2026: parser contrast là chẩn đoán, không đổi cổng ATS

Ba dev_1 SourceCodePro cases đọc nguyênfacts bằngpypdf-layout/pdfplumber nhưngpypdfplain vẫnsplit4facts. Giữmọikếtquả vàexpectedfailure, khôngchuyểnmode/ghépwhitespace đểđóngCV002 hayngoạisuy58cases. Chưathayfont/normalizePDF; kiểmTf/Tm/Tj/width/geometry/raster vàactualATS riêng. PDF2trangtestgiả khôngchứngnhậnfullmatrix hoặcdownloadđăngnhập.


## D023 —19/10/2026: vị trí text là prototype riêng, không thay font hoặc parser gate

SameType3/glyphs/paint controls choCompany:perglyphBT/ET tựnóđọcđúng; Tmorigin+Tdoffset twostep cóthể khiếnpypdfplainthêmspaces dùảnhgiống. Localadjacentmatrixfold giữpaint/textfacts trên3dev_1cases, khôngfontreplacement; originalTTFcontrol vẫnbịloại pixelgate. Chưaappintegration: Nodeprototype phảiboundedlexicalparser/narrowknownChromeoperators, failclosedunsupportedstream, fullfont/long/crop/Linux/resourcegates trướcrelease. KhôngdeployPython hoặcđổi verifier sanglayout đểđóngticket.

## D024 —19/10/2026: giữ cổng thứ tự đọc khi prototype sửa split words

JavaScript narrow matrix fold trên7cases giữ full resource graph/glyphs/metadata và9rasterpages chính xác, pypdf plain facts đều đạt. Pdfplumber default vẫn thiếu nguyên tên ở4Ambitious do interleave hai cột, giống baseline. Giữ strict acceptance FAIL, không nối text/đổi mode/bỏ parser để phát hành. Prototype chỉ offline opt-in; unit được đưa vào npm test, native Python/Poppler chưa chạy CI. Phải kiểm reading order và fullmatrix/Linux/resource isolation trước runtime integration; không dùng kết quả local để chứng nhận ATS hoặc đủ bán.

## D025 —19/10/2026: giữ fulltext và numeric-resource gate cho experiment TJ

Same-native-font MATRIX control cho thấy adjustedTJ có thể giữ kerning/pixels và nguyên từ; absoluteTm/perglyphBT chưa đủ, single-naturalTj khác343pixels nên bị loại. Broad local grouping sau đó làm native summary `PDF.`→`PDF .` dù resource/glyph/raster giữ nguyên. Bác bỏ dùng chung prototype hiện tại, giữ full-summary regression trước mọi native/fullmatrix rerun. Pypdf whole-document writer làm tròn FontMatrix cũng bị loại; chỉ stream-plan+pdf-lib bridge giữ tài nguyên đúng. Structural comparator cho phép Tj/TJ representation khác nhưng phải giữ glyph bytes gắn font/size, other operators và independent raster; text parser không patch/whitespace join. Không tích hợp runtime hoặc deploy chỉ từ tinyword/eightfacts/CIbaseline.

## D026 —20/10/2026: không phá word-gap để chữa dấu câu

Pypdf local6.10.0 dùng abs(TJcorrection) cho space threshold nên positive tightening114.257813 tạo `PDF .`. Positive-only fragmentation giữ cùng displacement/pixels và native summary trong một scope; split cả dấu âm làm `PDF.PDF.` mất word-gap nên bị loại. Mode mới là parser-specific diagnostic, chưa universalATS/runtime acceptance. Giữ fullsummary/markers/heading/name/negativegap guards và exact resource/raster; default broadTJ vẫnREJECTED. Cần multi-font/space/continuation/resource proof trước genericintegration hoặc148rerun.

## D027 —20/10/2026: chỉ grouping khi text matrix ở line origin đã biết

Tj advances text matrix; Tf không reset line matrix. Grouping ở continuation chưa reset gây89pixel drift trên3syntheticcases dù text/resource gatePASS. Origin guard sửa cả3 thành0pixel, unsafe cases byte-identical; vẫn hỗ trợ subrun sauTd. Fontspace80 đồng thời bác bỏ generic cap50 (`AB .`), không được lấy Roboto59 để phát hành mọifont. Giữ expected failures và strict native/fulltext gates; còn cần native-domain/font-aware bounds và independent reader evidence, không đổi verifier hoặc nối whitespace.


## D028 —20/10/2026: reader thứ ba dùng để đối chiếu, không thay cổng nghiệm thu

PDF.js4.10.38 đã cài đọc đủ10facts trên cùng một native Ambitious VI ở cả bản gốc, matrix-fold và positive-TJ; text cả ba giống nhau. Pypdf vẫn thiếu heading, pdfplumber vẫn interleave tên. Hai phản chứng cap50/narrow-space và split âm mất word-gap vẫn FAIL ở pypdf dù PDF.js đọc đúng. Vì vậy giữ cả kết quả thuận và nghịch, không chọn reader thuận lợi hoặc spatial-sort/ghép từ để đóng CV002. Inventory một PDF có14Type3,7font không có encoded space; không suy ra generic threshold từ một mẫu hay đổi font/ToUnicode để ép parser. Harness mới chỉ opt-in, child timeout/output/V8-old-space không chứng minh totalRSS hoặc hostile-PDF isolation; không đưa public/runtime. Không chạy lại148matrix cho tới khi có intervention mới vượt local fulltext/resource/raster guards.


## D029 —20/10/2026: checkpoint heading tại font boundary, không phát hành recode toy

Native M có encoded space nhưng pypdf lookup decodedM lấy width542 tại raw77 thay width1793 của code49, rồi page fallback space200 tạo effectivehalfspace1.6pt. Hai font/BT/Tm tái hiện M ụ; đây không phải run Tj/Td để chữa bằng TJ cap. Đổi tên CharProcs/Encoding sang Adobe vẫnFAIL do ToUnicode identity override; recode toy mới đọc Mu, cùng pixels nhưng đổi FirstChar/LastChar/ToUnicode/show codes, bị loại khỏi runtime theo invariants hiện tại. Không chỉnh parser hoặc gọi resource equality giả. Giữ CV002 IN_PROGRESS/P1 và commercial verdict; checkpoint nghiên cứu để chuyển interview theo rotation, không yêu cầu owner hoặc hạ severity. Lượt sau ưu tiên transcribe/TTS late completion bằng fixture local. Khi quay lại CV002 cần causal control giữ resources/glyphs ở cross-font boundary, genuine word-gap/fulltext/raster guards trước matrix/integration.


## D030 —20/10/2026: voice completion thuộc operation; không thay thế session guard

Invalidate trước abort/pause/speech cancel; completion sau fetch/blob/play và delayed resume chỉ chạy khi còn ownership. Audio/URL/utterance/timers cùng owner, release không đụng audio mới. Fallback chỉ một lần, respect handsfree kể cả error; empty typed-submit không hủy voice. INT005 ghi TTS race mới vì ID INT003 bị trùng lịch sử. Không nhận guard TTS đã giải quyết pending transcribe/live-chat upstream, module/actor/session departure; kiểm tiếp trước scoped release và fresh exact private Drive backup. Test fake Audio/SpeechRecognition xác nhận lời gọi, không chứng minh mic thật đã bật hoặc fidelity trêniOS.


## D031 —20/10/2026: session/request ownership trước auto-send hoặc tạo voice mới

TTS guard không đủ nếu completion upstream tạo operation mới. Phiên dùng scope object, reply/transcribe có object riêng; đổi scope trước abort tại End/new session/practice/departure. Kiểm sau JSON và trước side effect; FileReader + draft snapshot/input cancellation bảo toàn nháp mới. New capture/typed-send/stop hủy transcription cũ; finally không clear operation mới. Local fake transport không tuân abort vẫn phải giữ guard. Không hứa abort đã hủy provider/refund quota, actualactor hay summary-modal lifecycle. Sau review CI tạo isolated runtime63/64 từ main, workflow từ main cộng đúng guards, rồi fresh exact privateDrive backup/restore trước deployment; không deploy aggregate review.


## D032 —20/10/2026: FAQ token phải phân biệt từ nghề nghiệp

CHAT006 cho thấy mic ở academic/economic, micro ở microbiology/microservices, print ở sprint/blueprint, credit ở accreditation, ats ở chats/stats chiếm sai route. Whole-word English product tokens và domain-context credit guard giữ11career requests ở provider. Các mẫu credit finance/education mới chỉ heuristic, chưa universal intent/language classifier; context.targetRole không được khiến câu hỏi Credits rõ ràng đổi đường. Giữ deterministic FAQ/capability/security precedence, auth/quota/throttle và generic errors. Chỉ claims routing từ local fake-provider/actualmount và Linux CI, không khẳng định semanticAI hoặc hiring outcomes. Main candidate phải giữ đúng4file và workflow hiện hữu, không đưa PDF/moderation/DB experiments vào deployment.


## D033 —20/10/2026: xóa portfolio không giữ ID chết hoặc làm sống lại completion cũ

DELETE và Save dùng cùng operationobject/ref khóa đồng bộ và invalidate khi scope/effect rời. Chỉ currentoperation được reloadlist/report/unlock; UIDstring A-B-A không đủ. Sau DELETEconfirmed, form đanggắn recordđó giữ latestdraftfields nhưng bỏID và mặc địnhprivate; Save tiếp là explicitPOST, không autorepublish. Nháp khác/cancel/failure không đổi; listreloadfail không đảo ngược DELETEđãthànhcông. Completionguard không hứa abortprovider/serverwriteđãgửi. Không chuyển syntheticcallback thành realcloud auth/delete proof hoặc tự đóng PORT001/003/P1. ScopedFEcandidate cần CI và freshDrive code+newbuild/currentrollback restore trướcHostingdeploy; BE d6a khôngredeploy.


## D034 —20/10/2026: signup SDK followups require current operation and current User instance

After create settles, only the owning route operation and exact current SDKUser may updateProfile. Recheck after profile before email and after email before navigation; suppress stale SDK-user errors while still letting current-operation finally release busy. Do not signOut/delete an abandoned account, retry emails, or promise cancellation of the create request/provider persistence already sent. InstalledFirebase12.19 sets currentUser before resolving create; regression mock follows that contract. Real actor/mobile/OAuth and SDK persistence races remain unverified; candidate must contain only4scoped paths and pass freshDrive/currentFE6ff rollback gate.


## D035 —20/10/2026: export phải thuộc CV và operation hiện tại

Click trước awaitreadiness nắm operationobject/snapshotCV/html/template/language/profile; recheck sau health/response/blob và trước save/print. Render/rời CV/pagehide/logout invalidate trướcabort. PDF/Word dùng một synchronouslock; finally chỉ clear chínhoperation/timer của mình. Deadline90s thảlock, cảnh báo thử lại nhưng không tự in/retry hoặc cam kết hủy render/quota phía server. Giữ currentdesignprintfallback, ATS/Word không tự đổi định dạng. Localfake transport phớt lờabort chứng minh guard, không xác nhận realrenderer/identity/layout/Wordvisual. CV005 không đóng trước isolatedCI/exactprivateDrivebackup/rollback/live; CV002 và commercialgate còn mở.


D035 bổsung heartbeat13:58: global latestRenderedHtml không đại diện realcontenteditableDOM hoặc fullscreen document. So canonical visible-document snapshot sau await; renderresultmới hủy và bỏ fullscreencũ, hiddenclose khôngcopyback. Emptyframe cần explicitretry khi ready. Không lấy green20cases/CI1513 thaybằngchứng6actualDOMcases;1513 bịsuperseded, candidate4609 cần exactgates mới. Không coi automatedheartbeat là xácnhận cho rejectedRenderlogin.


## D036 —20/10/2026: Worddesign không tự đổi sang nguồn ATS

ATS là phép dựng lại từ structuredprofile/verifiedtranslation, không phải import HTML vừa sửa; giữ grounding đó. Khi người dùng chọn Worddesign, không tự đổi format vì readiness=false. Recheck verifiedcanary có deadline và documentownership; recovered dùng editedHTML, unavailable chỉ cảnh báo giữ CV hiện tại/thử lại/In-LưuPDF, không tự print/POST/AI. ExplicitATS vẫn đi sourcecontract; không coi DOCX XML marker là Wordvisual hoặc realAuth proof. CV006 dùng actuallocalbinary contrast +wholeStudiofixture, candidatecombined1f294f phải có CI/freshDrive/main/live gates trước scopedrelease. Renderlogin vẫn cần quyết định đã hỏi, heartbeat không tự cấp quyền.

## D037 —20/10/2026: summary cũng thuộc session và modal hiện tại

Summary có operation/scope riêng, lock đồng bộ cho End đang chờ và deadline90s. Close/new session/continued answer/departure invalidate trước abort; xóa report DOM, giữ transcript. Guard sau JSON và trong catch/finally không cho response/error cũ ghi đè report hoặc loading/lock mới. Không tự retry hay hứa provider cancellation/refund. Giữ version2/grounding/zero-score; network error dùng lời báo chung. Review và isolated INT candidate không thay candidate CV đang chờ; nếu main thay đổi phải compose lại phạm vi INT và verify CI/fresh exact Drive/live. Whole-Studio fake transport không chứng minh real actor/device/provider; không đóng INT005 từ test xanh.

## D038 —20/10/2026: bài cộng đồng dùng cùng luồng luyện câu hỏi hiện có

Nút từng câu và luyện đề chuyển sang practice/live, điền int-title và gọi practiceQuestionLive với chính câu hỏi nguồn được encode. Không ghi vào eval-question/live-job-title đã bị bỏ; bỏ callback300ms và thông báo thành công sai. Empty question chỉ cảnh báo, giữ phiên/module/draft. Giữ JD/experience do người dùng nhập, không tự gán chúng là JD của công ty cộng đồng. History mới chỉ có lời mở đầu chứa nguyên câu hỏi đã chọn; typed reply dùng cùng history đó. Không đổi publication/reward/moderation/schema; synthetic TTS/chat chỉ chứng minh controller, không chất lượng giọng nói hay nghiệm thu real actor. Candidate cộng đồng riêng từ main, không supersede CV/INT đang chờ; đổi main thì compose lại và kiểm CI/backup chính xác trước phát hành.

## D039 —20/10/2026: proposal task khác hướng dẫn tính năng

FAQ không hướng tới màn hình Proposal khi DOM sản phẩm không có form đó. Giải thích khả năng góp ý/viết bản nháp trong chatbot, cần yêu cầu dự án và kinh nghiệm thật, không tự gửi khách hàng. Hỏi capability dùng owned guide/quotaAI0; yêu cầu viết/góp ý dùng advice và quota hiện có, kể cả yêu cầu ngắn có động từ cần hỏi thêm dữ kiện. Từ khóa ConnectCV trong tên dự án không tự biến career task thành FAQ. Security boundary chạy trước intent; không đổi auth/limits/budget/grounding prompt. Classifier vẫn là heuristic, không bằng chứng hiểu mọi ngôn ngữ hay kiểm chất lượng AI thật. Local actual HTTP/fakeprovider chứng minh routing/admission và prompt payload; không chứng minh mô hình sẽ luôn giữ facts. Candidate5paths tách khỏi CV/INT/community; main đổi thì compose lại/CI/exactDrive/rollback/live.


## 21/10/2026 — cycle70 portfolio read scope

PORT005 isolatescaf28d8 sixfrontend paths from maince09; Renderlogin rejection remains unresolved and blocks BE release. Existing privateDrive session and Firebase Hosting session/rollback32cb are available without auth/access changes, so an independent Hosting-only release may pass its own exactCI/newcloudbackup/restore/rollback/mainCI/live gates. Do not treat this as Render auth approval or deploy aggregate review. No new large BEbackup while its release/rollback path is blocked. Current25bundle1513 does not covercaf. Any main advance requires later pending BE scopes recomposed with fresh branch/CI/backup; preserve prior candidates as evidence. No DB/schema/provider writes.


## D040 —22/10/2026: API token wait binds to SDK User instance

Capture current SDK User before getIdToken; compare exact identity before fetch and before exposing a token rejection. Replaced session gets fixed AUTH_SESSION_CHANGED error and explicit retry choice; current failures keep behavior. Do not treat UID equality as SDKinstance equality. No auto retry, token revocation or cancellation of already sent writes. Existing React operation guards remain responsible for response/draft ownership. Same-object transient history not observed between boundaries remains unverified; do not claim full provider isolation. FE-only3path candidate from main, no backend/permissions/schema changes; exactCI/privateDrive/currentHosting rollback/main/live gates before release.


## D041 —23/10/2026: audit failure remains a release gate; patch exact dependencies

Original AUTH006 source/candidate attempt2 failed real ip-address advisory after yesterday503. Do not keep retrying or lower audit threshold. Minimal ip-address10.7.4 backend lock +Vite8.3.3 frontend manifest/lock patch requires fresh exactsource/candidate CI. Vitepatch addresses development tooling; staticHosting is not a Vitedevserver. Rate limiter calls Address6 behind node:net.isIPv6; no ConnectCV request exploit demonstrated. New combined AUTH006/SEC005 sixpath candidate3e7f0e9 fromcaf imports no pendingCV/INT/social/chat/schema scope. Backendapplication source unchanged but dependency lock differs: never label that backend unchanged, and a Hosting-only release cannot fix deployed backend dependencies. Existing Render human decision still required for BErelease. Preserve older63 reference as failed historical evidence, not backup/deploy target. Prepared backup must assert exactSHAs and sixpath scope, never reuse old63 catalog or CI. Browser initialization failed twice around one reset; no session/auth workaround, no newlargebackup until current privateDrive/Hosting preflight recovered. Codebackup is not DBbackup.

## D042 —25/10/2026: Drive listing is not cloud checksum or restore proof

The signed-in owner Drive UI listed the exact new bundle, frontend ZIP and catalog with their IDs and approximate sizes. The synchronized-folder source copy matched the generated local bytes, and a bounded local bare restore validated 27 bundles and the rollback ZIP. However, mounted G: reads returned PermissionError and a UI download timed out; the browser-control session then exited. Do not mark cloud content readback or independent cloud restore VERIFIED from file listing/local sync alone. Keep the exact bounded staging directory, block deployment, and resume only by downloading those three named Drive objects through the ordinary owner UI, comparing byte SHA-256, then restoring the downloaded bundle chain and checking both ZIPs. Delete only the exact owned staging after all those checks pass. Do not alter Drive sharing, use alternate authentication, or remove previous cloud/user files. No database backup is included.

## D043 —26/10/2026: xử lý advisory parser theo khả năng ảnh hưởng thực tế

SEC006 body-parser1.20.8 có đường parser mặc định trên app thực: request gzip giả với trailing bytes làm child local thoát1 sau response404; baseline6 có4PASS/2crash. Chỉ thử trên loopback/process riêng, không fault-inject public. Patch hai lock lên1.20.9, Multer direct lên2.5.0; không đổi auth/parser limit hay thêm uncaughtException để che lỗi. Multer advisory đòi async fileFilter; route hiện synchronous nên chưa xác nhận exploitability cho app, nhưng nâng bản patch để giữ audit gate và tránh giữ dependency có advisory. Source0be2392 gồm đúng sáu file, local169checks/all3audits0; exactsourceCI40266356806 đang chạy. CI23/10 là bằng chứng lịch sử và không đủ cho release trước advisory mới. Các candidate cũ phải compose lại security scope trên main hiện hành và kiểm exactCI/freshcloud/rollback; không deploy aggregate review. Giữ nguyên source sạch ởD theo yêu cầu riêng. Không tạo backup lớn hoặc deploy trong lúc cloud readback vẫn unverified; chờ quyết định Render như trước, không đổi credential/IAM.

Nguồn: https://github.com/advisories/GHSA-27r3-jxmh-p828 và https://github.com/advisories/GHSA-q7qp-rjg7-q26m.
