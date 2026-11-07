import {test} from 'node:test';import assert from 'node:assert/strict';
import {selectAscBuildId} from '../scripts/asc-build-selection.mjs';
const build={id:'apple-build',appVersion:'1.0.0',buildNumber:'2',processingState:'VALID'};
test('duplicate API rows for the same Apple build resolve to one identifier',()=>{assert.equal(selectAscBuildId([build,{...build}]),'apple-build')});
test('other versions and unprocessed builds cannot be selected',()=>{assert.equal(selectAscBuildId([{...build,id:'old',buildNumber:'1'},{...build,id:'waiting',processingState:'PROCESSING'},build]),'apple-build')});
test('different matching build identifiers and empty results are rejected',()=>{assert.throws(()=>selectAscBuildId([build,{...build,id:'other'}]),/Expected one/);assert.throws(()=>selectAscBuildId([]),/Expected one/)});
