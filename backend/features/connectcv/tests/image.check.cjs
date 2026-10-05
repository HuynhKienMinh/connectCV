'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
assert.equal(process.getuid(),1000);
for(const name of ['/app/.env','/app/.keys.json','/app/features/connectcv/.env','/app/features/connectcv/.keys.json'])assert(!fs.existsSync(name));
console.log('PASS production image runs as UID 1000 without secret files');
