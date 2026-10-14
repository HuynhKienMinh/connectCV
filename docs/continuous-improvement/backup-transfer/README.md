# Google Drive backup và dọn dung lượng

Chủ dự án yêu cầu ngày 14/10/2026: chuyển backup ConnectCV lên Google Drive,
sau khi xác minh thì xóa bản trên máy; không tiếp tục tích lũy backup ổ C.

Thư mục riêng đã kiểm tra: chỉ chủ sở hữu có quyền, truy cập chung Hạn chế.
Link: https://drive.google.com/drive/folders/1mSFmiAVfI6CEVPFd8G9vA2SrBq58qh7W.
Không thêm người xem hoặc chia sẻ công khai.

`catalog.json` ghi từng SHA256, kích thước, filename và trạng thái xác minh/xóa.
Mười Git bundle được upload với tên riêng, không gộp hoặc bỏ các phiên bản cũ.
ZIP companion giữ build FE, manifest, rollback config và source restore archive.
Các thư mục restore-check là bản sao thử từ chính bundle, có thể tạo lại; không
upload các bản trùng này. Không có database snapshot hoặc credential export.

Trước khi xóa mỗi backup, tải lại file từ Drive bằng giao diện; so SHA256,
kích thước và `git bundle verify`. Tải lại ZIP companion và kiểm tra CRC cùng
SHA256 từng file bên trong trước. Một thông báo “upload xong” không đủ để xóa.

Local staging dùng hardlink cho upload để không nhân đôi bundle, ZIP companion
dưới 16 MB, mỗi companion entry tối đa 2 MB. Preflight chặn khi disk quá thấp.
Download/restore tạm được dọn sau kiểm chứng; chỉ catalog, nhật ký và hướng dẫn
nhỏ được giữ trên máy. Không xóa `.env`, key, source repo, dependencies hoặc
tài liệu người dùng trong tác vụ này.

Các đợt deploy sau phải có backup cloud đã xác minh và rollback target rõ.
Thiếu phiên Drive hoặc checksum fail: giữ bản duy nhất và chặn deploy, tiếp tục
công việc không phụ thuộc. Không thay IAM, billing, đăng ký gói hoặc credential
để vượt blocker. Backup code không thay thế encrypted database restore drill.

Hoàn tất: 10/10 bundle, ZIP companion và các member đã được đọc lại qua Google Drive for Desktop, SHA256/CRC/Git bundle verify đạt. Đã xóa cả 10 thư mục backup/restore clones và upload hardlinks, khoảng4.77GB. Catalog cuối: connectcv-backup-catalog-verified-2026-10-14.json.
