import {test} from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('live API configuration validates an HTTPS origin before bundling',()=>{
 assert.throws(()=>execFileSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,BYTEBUDGET_MODE:'live',BYTEBUDGET_API_BASE:'https://user:pass@api.example.test'},stdio:'pipe'}),/BYTEBUDGET_API_BASE/);
});
