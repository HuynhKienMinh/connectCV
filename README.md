```plaintext
connectcv/
├── .gitignore
├── README.md
│
├── backend/                  <-- Khoa & Minh làm việc tại đây (Node.js / Express)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js         <-- Kết nối Database (MongoDB / PostgreSQL)
│   │   ├── models/
│   │   │   └── User.js       <-- Schema lưu 6 trường thông tin tài khoản
│   │   ├── routes/
│   │   │   ├── auth.js       <-- Khoa: Đăng nhập Google & cấp JWT Token
│   │   │   ├── jobs.js       <-- Khoa: Tìm việc & so khớp JD
│   │   │   ├── payment.js    <-- Khoa: Tạo mã VietQR nâng cấp Pro
│   │   │   ├── cv.js         <-- Minh: AI tối ưu hóa CV chuẩn ATS
│   │   │   └── interview.js  <-- Minh: AI phỏng vấn thử & Proposal
│   │   └── middlewares/
│   │       ├── authMiddleware.js <-- Kiểm tra JWT Token đăng nhập
│   │       └── checkRole.js      <-- Kiểm tra quyền (HR, Employer, isPro)
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/                 <-- Bảo & Hậu làm việc tại đây (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── assets/           <-- Ảnh, logo do Hậu thiết kế
│   │   ├── components/       <-- Các khối giao diện nhỏ (Navbar, JobCard, QrModal...)
│   │   ├── pages/            <-- Các màn hình chính (LoginPage, DashboardPage...)
│   │   ├── context/          <-- Lưu trạng thái đăng nhập toàn trang (AuthContext)
│   │   ├── App.jsx           <-- Điều hướng trang (Routing)
│   │   ├── main.jsx          <-- Khởi tạo React
│   │   └── index.css         <-- Cấu hình Tailwind CSS
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── extension/                <-- Bảo quản lý 100% (Chrome Extension)
    ├── icons/
    ├── manifest.json
    ├── content.js            <-- Đọc DOM tin tuyển dụng & Auto-fill form
    ├── background.js         <-- Nhận token từ web và lưu vào chrome.storage
    └── popup/
        ├── popup.html
        └── popup.js
\```
