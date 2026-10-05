const http = require('http');

http.get('http://localhost:3000', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('CONTAINS modal-auth:', body.includes('id="modal-auth"'));
    console.log('CONTAINS auth-header-wrapper:', body.includes('id="auth-header-wrapper"'));
    console.log('CONTAINS Supabase SDK:', body.includes('@supabase/supabase-js'));
  });
}).on('error', err => console.error('ERR:', err.message));
