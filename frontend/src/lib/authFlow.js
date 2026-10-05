export function authFailure(code, mode) {
 if(mode==='login'&&code==='auth/user-not-found')return {next:'signup',message:'Bạn chưa có tài khoản. Hãy hoàn tất đăng ký bên dưới hoặc tiếp tục với Google.'};
 if(mode==='login'&&code==='auth/invalid-credential')return {next:'signup',message:'Chưa đăng nhập được bằng email và mật khẩu này. Nếu chưa có tài khoản, hãy đăng ký bên dưới. Nếu đã có tài khoản, hãy đăng nhập với Google hoặc chọn Quên mật khẩu.'};
 const messages={
  'auth/wrong-password':'Không đăng nhập được bằng mật khẩu này. Hãy thử lại hoặc chọn Quên mật khẩu.',
  'auth/invalid-email':'Email chưa đúng định dạng. Vui lòng kiểm tra lại.',
  'auth/too-many-requests':'Có quá nhiều lần thử. Vui lòng chờ một lúc rồi thử lại.',
  'auth/network-request-failed':'Không kết nối được dịch vụ đăng nhập. Kiểm tra mạng rồi thử lại.',
  'auth/user-disabled':'Tài khoản hiện không thể đăng nhập. Vui lòng liên hệ hỗ trợ.',
  'auth/weak-password':'Mật khẩu chưa đạt yêu cầu. Vui lòng dùng ít nhất 12 ký tự.',
  'auth/password-does-not-meet-requirements':'Mật khẩu chưa đạt yêu cầu. Vui lòng dùng ít nhất 12 ký tự.',
  'auth/email-already-in-use':'Chưa thể tạo tài khoản với email này. Nếu đã đăng ký, hãy chọn Đăng nhập, Google hoặc Quên mật khẩu.'
 };
 return {next:null,message:messages[code]||'Chưa thể hoàn tất yêu cầu. Vui lòng thử lại sau.'};
}
