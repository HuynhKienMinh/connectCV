import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authFailure} from '../src/lib/authFlow.js';
test('confirmed missing account moves to signup',()=>{const r=authFailure('auth/user-not-found','login');assert.equal(r.next,'signup');assert.match(r.message,/chưa có tài khoản/);});
test('protected invalid credentials offer signup without asserting account absence',()=>{const r=authFailure('auth/invalid-credential','login');assert.equal(r.next,'signup');assert.match(r.message,/Nếu chưa có tài khoản/);assert.match(r.message,/Quên mật khẩu/);assert.doesNotMatch(r.message,/Bạn chưa có tài khoản/);});
test('network failure and rate limits do not redirect to registration',()=>{for(const code of ['auth/network-request-failed','auth/too-many-requests'])assert.equal(authFailure(code,'login').next,null);});
test('registration errors do not create redirect loops',()=>{for(const code of ['auth/invalid-credential','auth/email-already-in-use','auth/weak-password'])assert.equal(authFailure(code,'signup').next,null);});
