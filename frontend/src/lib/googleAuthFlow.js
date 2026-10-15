// Fixed project-owned destination. Never carry credentials or query parameters between hosts.
export const GOOGLE_LOGIN_URL = 'https://connect-cv.firebaseapp.com/login';
const AUTH_HOST = 'connect-cv.firebaseapp.com';

export function googleBrowserFlow({userAgent = '', hostname = '', standalone = false} = {}) {
 const mobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
 const knownWebView = /Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|;\s*wv\)|\bWebView\b/i.test(userAgent);
 const iosWebView = /iPhone|iPad|iPod/i.test(userAgent) && /AppleWebKit/i.test(userAgent)
  && !/Safari\/|CriOS\/|FxiOS\/|EdgiOS\/|OPiOS\//i.test(userAgent);
 if (knownWebView || (iosWebView && !standalone)) return 'external-browser';
 // Desktop-mode iPads still use a Safari UA; the same-origin helper is safe there too.
 const ipad = /Macintosh.*Mobile\//i.test(userAgent);
 if ((mobile || ipad) && hostname === 'connect-cv.web.app') return 'handoff';
 if ((mobile || ipad) && hostname === AUTH_HOST) return 'redirect';
 return 'popup';
}

export function redirectStorageAvailable(getStorage) {
 const key = 'connectcv.auth.storage-probe';
 try {
  const storage = getStorage();
  storage.setItem(key, '1');
  const ok = storage.getItem(key) === '1';
  storage.removeItem(key);
  return ok;
 } catch { return false; }
}

export function googleAuthFailure(code) {
 const messages = {
  'auth/popup-blocked': 'Trình duyệt đang chặn cửa sổ đăng nhập. Hãy mở ConnectCV trực tiếp bằng Safari hoặc Chrome rồi thử lại.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ Google. Có thể bấm lại để tiếp tục.',
  'auth/cancelled-popup-request': 'Yêu cầu đăng nhập trước đã bị hủy. Vui lòng thử lại.',
  'auth/account-exists-with-different-credential': 'Email này đã có tài khoản với phương thức khác. Hãy đăng nhập bằng phương thức đã đăng ký.',
  'auth/network-request-failed': 'Không kết nối được dịch vụ đăng nhập. Kiểm tra mạng rồi thử lại.',
  'auth/web-storage-unsupported': 'Trình duyệt không lưu được phiên đăng nhập. Mở đường dẫn bên dưới trực tiếp bằng Safari hoặc Chrome rồi thử lại.',
  'auth/missing-initial-state': 'Phiên đăng nhập Google đã bị gián đoạn. Mở đường dẫn bên dưới trực tiếp bằng Safari hoặc Chrome và đăng nhập lại.',
  'auth/invalid-auth-event': 'Phiên đăng nhập Google đã bị gián đoạn. Mở đường dẫn bên dưới trực tiếp bằng Safari hoặc Chrome và đăng nhập lại.',
  'auth/operation-not-supported-in-this-environment': 'Trình duyệt này chưa hỗ trợ đăng nhập Google. Mở ConnectCV trực tiếp bằng Safari hoặc Chrome.'
 };
 return messages[code] || 'Không thể đăng nhập Google lúc này. Vui lòng thử lại sau.';
}

// React StrictMode may mount twice. Firebase redirect results must only be consumed once.
const redirectResults = new WeakMap();
export function recoverGoogleRedirect(auth, getResult) {
 if (!redirectResults.has(auth)) redirectResults.set(auth, Promise.resolve().then(() => getResult(auth)));
 return redirectResults.get(auth);
}
