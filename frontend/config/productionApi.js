export function productionApiBase(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Set VITE_API_BASE_URL to the public HTTPS API origin before building.');
  }
  let url;
  try { url = new URL(value.trim()); } catch {
    throw new Error('VITE_API_BASE_URL must be a public HTTPS API origin.');
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      url.pathname !== '/' || host === 'localhost' || host.endsWith('.localhost') ||
      host === '[::1]' || host === '0.0.0.0' || /^127\./.test(host)) {
    throw new Error('VITE_API_BASE_URL must be a public HTTPS API origin without credentials or a path.');
  }
  return url.origin;
}
