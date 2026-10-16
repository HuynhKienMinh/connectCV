 'use strict';
function safeError(error){return String(error?.message||error||'Unknown error')
 .replace(/AIza[A-Za-z0-9_-]{20,}/g,'[REDACTED_API_KEY]')
 .replace(/([?&](?:key|api_key|token)=)[^&\s]+/gi,'$1[REDACTED]')
 .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi,'Bearer [REDACTED]')
 .slice(0,500);}
// Provider exceptions can contain prompts, contacts and response bodies. Diagnostics
// must select a fixed category, never attempt to redact arbitrary private prose.
function providerErrorCode(error) {
 const status=error?.status ?? error?.response?.status;
 if(status===429)return 'AI_RATE_LIMIT';
 if(status===400||status===401||status===403)return 'AI_AUTH_OR_REQUEST_REJECTED';
 if(status===408||status===504)return 'AI_TIMEOUT';
 if(Number.isInteger(status)&&status>=500&&status<=599)return 'AI_UPSTREAM_UNAVAILABLE';
 if(['ETIMEDOUT','AI_TIMEOUT'].includes(error?.code))return 'AI_TIMEOUT';
 if(['ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN'].includes(error?.code))return 'AI_NETWORK_ERROR';
 if(error?.name==='AbortError')return 'AI_CANCELLED';
 return 'AI_PROVIDER_ERROR';
}
module.exports={safeError,providerErrorCode};
