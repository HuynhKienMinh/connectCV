 'use strict';
function safeError(error){return String(error?.message||error||'Unknown error')
 .replace(/AIza[A-Za-z0-9_-]{20,}/g,'[REDACTED_API_KEY]')
 .replace(/([?&](?:key|api_key|token)=)[^&\s]+/gi,'$1[REDACTED]')
 .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi,'Bearer [REDACTED]')
 .slice(0,500);}
module.exports={safeError};
