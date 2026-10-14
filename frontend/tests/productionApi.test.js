import test from 'node:test';
import assert from 'node:assert/strict';
import { productionApiBase } from '../config/productionApi.js';

test('production builds cannot target a developer machine or silently default to localhost', () => {
  for (const value of [undefined, '', ' ', 'not a URL', 'http://localhost:5000',
    'https://localhost:5000', 'https://dev.localhost', 'https://127.0.0.1',
    'https://127.1.2.3', 'https://[::1]', 'https://0.0.0.0',
    'https://user:secret@example.test', 'https://example.test/api',
    'https://example.test/?token=secret', 'https://example.test/#fragment']) {
    assert.throws(() => productionApiBase(value), error => !error.message.includes('secret'));
  }
});

test('production API configuration accepts and normalizes the verified public origin', () => {
  assert.equal(productionApiBase(' https://connectcv-api-minh.onrender.com/ '),
    'https://connectcv-api-minh.onrender.com');
  assert.equal(productionApiBase('https://api.example.test'), 'https://api.example.test');
});
