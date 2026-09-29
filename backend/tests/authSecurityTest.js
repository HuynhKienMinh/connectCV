const http = require('http');

function request(options, data = null) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', err => resolve({ status: 'ERR', error: err.message }));
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runAuthSecuritySuite() {
  console.log('====================================================');
  console.log('🔒 CONNECTCV AUTH & RBAC SECURITY TEST SUITE (TEST KỸ)');
  console.log('====================================================\n');
  let passed = 0, failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log('  ✅ [PASS]', message);
      passed++;
    } else {
      console.error('  ❌ [FAIL]', message);
      failed++;
    }
  }

  // --- TEST 1: Đăng nhập sai pass (chống Username Enumeration) ---
  console.log('1. Kiểm thử Generic Error Message khi sai mật khẩu:');
  const failLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'student@fpt.edu.vn', password: 'WrongPassword999!' });
  assert(failLogin.status === 401, 'Status code phải là 401');
  assert(failLogin.body.message === 'Email hoặc mật khẩu không chính xác.', 'Không được để lộ email có tồn tại hay không');

  // --- TEST 2: Đăng nhập đúng Candidate ---
  console.log('\n2. Kiểm thử đăng nhập Candidate:');
  const candLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'student@fpt.edu.vn', password: 'Student@123' });
  assert(candLogin.status === 200, 'Đăng nhập Candidate thành công (200)');
  assert(candLogin.body.token && candLogin.body.token.length > 20, 'Nhận Access Token JWT hợp lệ');
  assert(candLogin.body.user.role === 'CANDIDATE', 'Role là CANDIDATE');
  const candidateToken = candLogin.body.token;

  // --- TEST 3: Đăng nhập đúng Admin ---
  console.log('\n3. Kiểm thử đăng nhập Admin:');
  const adminLogin = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@connectcv.io.vn', password: 'Admin@123' });
  assert(adminLogin.status === 200, 'Đăng nhập Admin thành công (200)');
  assert(adminLogin.body.user.role === 'ADMIN', 'Role là ADMIN');
  const adminToken = adminLogin.body.token;

  // --- TEST 4: Gọi route bảo vệ /me không token ---
  console.log('\n4. Kiểm thử truy cập /api/auth/me không có Token:');
  const noToken = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/me', method: 'GET'
  });
  assert(noToken.status === 401, 'Chặn 401 Unauthorized khi thiếu token');
  assert(noToken.body.code === 'AUTH_REQUIRED', 'Mã lỗi đúng AUTH_REQUIRED');

  // --- TEST 5: Gọi route bảo vệ /me với Token giả ---
  console.log('\n5. Kiểm thử truy cập /api/auth/me với Token giả mạo:');
  const fakeToken = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/me', method: 'GET',
    headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature' }
  });
  assert(fakeToken.status === 401, 'Chặn 401 Unauthorized khi token giả mạo');
  assert(fakeToken.body.code === 'INVALID_TOKEN', 'Mã lỗi đúng INVALID_TOKEN');

  // --- TEST 6: Candidate gọi endpoint Admin (Chống leo thang đặc quyền - Privilege Escalation) ---
  console.log('\n6. Kiểm thử Candidate cố tình gọi API Admin (/api/auth/admin/set-role):');
  const candEscalate = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/admin/set-role', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + candidateToken
    }
  }, { targetEmail: 'student@fpt.edu.vn', newRole: 'ADMIN' });
  assert(candEscalate.status === 403, 'Chặn đứng 403 Forbidden khi Candidate cố gọi endpoint Admin');
  assert(candEscalate.body.code === 'FORBIDDEN', 'Mã lỗi đúng FORBIDDEN');

  // --- TEST 7: Admin gọi endpoint Admin (Phân quyền hợp lệ) ---
  console.log('\n7. Kiểm thử Admin gọi API Admin (/api/auth/admin/set-role):');
  const adminOp = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/admin/set-role', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + adminToken
    }
  }, { targetEmail: 'student@fpt.edu.vn', newRole: 'RECRUITER' });
  assert(adminOp.status === 200, 'Admin đổi role thành công (200)');
  assert(adminOp.body.user.role === 'RECRUITER', 'Role cập nhật thành RECRUITER');

  // Phục hồi lại role CANDIDATE
  await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/admin/set-role', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + adminToken
    }
  }, { targetEmail: 'student@fpt.edu.vn', newRole: 'CANDIDATE' });

  // --- TEST 8: Chống đăng ký chiếm quyền ADMIN (Form Tampering) ---
  console.log('\n8. Kiểm thử Form Tampering: Đăng ký mới với requestedRole=ADMIN:');
  const testEmail = 'hacker_' + Date.now() + '@fake.io';
  const regTamper = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, password: 'Password@123', requestedRole: 'ADMIN' });
  assert(regTamper.status === 201, 'Đăng ký thành công');
  assert(regTamper.body.user.role === 'CANDIDATE', 'Role bị ép về CANDIDATE (không thể tự thăng ADMIN)');

  console.log('\n====================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASS / ${failed} FAIL`);
  console.log('====================================================');
}

runAuthSecuritySuite();
