import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverDemoPreview} from '../src/bootstrap.js';
test('explicit native demo marker starts offline without status fetch',async()=>{let calls=0;assert.equal(await discoverDemoPreview({marker:true,native:true,fetch:async()=>{calls++;throw Error('offline')}}),true);assert.equal(calls,0)});
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
test('demo build embeds explicit startup marker and live build removes it',()=>{execFileSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,BYTEBUDGET_MODE:'demo'}});assert.match(readFileSync('dist/client/index.html','utf8'),/data-demo-preview="true"/);execFileSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,BYTEBUDGET_MODE:'live'}});assert.doesNotMatch(readFileSync('dist/client/index.html','utf8'),/data-demo-preview="true"/)});
