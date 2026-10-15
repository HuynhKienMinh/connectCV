import test from 'node:test';
import assert from 'node:assert/strict';
import {GOOGLE_LOGIN_URL,googleBrowserFlow,redirectStorageAvailable,googleAuthFailure,recoverGoogleRedirect} from '../src/lib/googleAuthFlow.js';
const safari='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const webview='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const android='Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const flow=(userAgent,hostname='connect-cv.web.app',standalone=false)=>googleBrowserFlow({userAgent,hostname,standalone});
test('Zalo and other embedded browsers never start OAuth, even on auth host',()=>{
 for(const ua of [webview,`${safari} Zalo/24`,`${safari} [FBAN/Messenger;FBAV/490]`,`${safari} Instagram 365`,`${android} Line/14`,android.replace('Android 15','Android 15; wv')]){
  assert.equal(flow(ua),'external-browser',ua);
  assert.equal(flow(ua,'connect-cv.firebaseapp.com'),'external-browser',ua);
 }
});
test('ordinary mobile browsers hand off from web.app and redirect only on existing same-origin host',()=>{
 for(const ua of [safari,android,webview+' CriOS/140.0',webview+' FxiOS/143.0','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1']){
  assert.equal(flow(ua),'handoff');assert.equal(flow(ua,'connect-cv.firebaseapp.com'),'redirect');
 }
 assert.equal(flow(webview,'connect-cv.firebaseapp.com',true),'redirect');
});
test('desktop and unknown/local origins keep popup; untrusted host cannot opt in to redirect',()=>{
 for(const ua of ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.6 Safari/605.1'])assert.equal(flow(ua),'popup');
 assert.equal(flow(safari,'localhost'),'popup');
 assert.equal(flow(safari,'connect-cv.firebaseapp.com.attacker.example'),'popup');
});
test('handoff URL is fixed HTTPS, clean, project-owned and does not transfer credentials',()=>{
 const url=new URL(GOOGLE_LOGIN_URL);assert.equal(url.protocol,'https:');assert.equal(url.host,'connect-cv.firebaseapp.com');
 assert.equal(url.pathname,'/login');assert.equal(url.search+url.hash+url.username+url.password,'');
});
test('storage preflight only touches its probe, preserving Firebase and unrelated data',()=>{
 const items=new Map([['firebase:authUser','preserve'],['draft','preserve']]);
 const storage={setItem:(k,v)=>items.set(k,v),getItem:k=>items.get(k),removeItem:k=>items.delete(k)};
 assert.equal(redirectStorageAvailable(()=>storage),true);
 assert.deepEqual([...items],[['firebase:authUser','preserve'],['draft','preserve']]);
});
test('unavailable, unwritable or silently denied session storage fails closed',()=>{
 assert.equal(redirectStorageAvailable(()=>{throw Error('SecurityError');}),false);
 assert.equal(redirectStorageAvailable(()=>({setItem(){throw Error('QuotaExceededError');}})),false);
 assert.equal(redirectStorageAvailable(()=>({setItem(){},getItem(){return null;},removeItem(){}})),false);
});
test('redirect recovery is consumed once per Auth instance including StrictMode remount',async()=>{
 const auth={},result={user:{uid:'synthetic'}};let calls=0;
 const getResult=async a=>{assert.equal(a,auth);calls++;return result;};
 const [a,b]=await Promise.all([recoverGoogleRedirect(auth,getResult),recoverGoogleRedirect(auth,getResult)]);
 assert.equal(calls,1);assert.equal(a,result);assert.equal(a,b);
 await recoverGoogleRedirect({},async()=>{calls++;});assert.equal(calls,2);
});
test('redirect recovery errors do not cause SDK retries or disclose raw provider error',async()=>{
 const auth={};let calls=0;const getResult=async()=>{calls++;throw Object.assign(Error('private provider details'),{code:'auth/missing-initial-state'});};
 await assert.rejects(recoverGoogleRedirect(auth,getResult));await assert.rejects(recoverGoogleRedirect(auth,getResult));assert.equal(calls,1);
 for(const code of ['auth/web-storage-unsupported','auth/missing-initial-state','auth/invalid-auth-event','auth/operation-not-supported-in-this-environment','auth/popup-blocked'])assert.match(googleAuthFailure(code),/Safari|Chrome/);
 assert.doesNotMatch(googleAuthFailure('private provider details'),/private provider details/);
});
