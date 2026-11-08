import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const sourcePath = new URL('../scripts/cloud/apps-script-bootstrap.gs', import.meta.url);
const source = existsSync(sourcePath) ? readFileSync(sourcePath, 'utf8') : '';
function runtime({approved = false, wrongProject = false, extraProvider = false, privilegedAccount = false} = {}) {
  const calls = [], logs = [];
  const project = 'bytebudget-f8aaa';
  const number = '137839521041';
  const state = new Map();
  const policy = {version: 3, etag: 'unchanged-etag', bindings: [
    {role: 'roles/owner', members: ['user:owner@example.test']},
    {role: 'roles/viewer', members: ['user:conditional@example.test'], condition: {title: 'existing', expression: 'true'}}
  ]};
  if (privilegedAccount) policy.bindings.push({role: 'roles/editor', members: [`serviceAccount:bytebudget-github-ops@${project}.iam.gserviceaccount.com`]});
  const policies = new Map();
  const context = vm.createContext({
    console: {log: value => logs.push(value)},
    ScriptApp: {getOAuthToken: () => 'test-token-never-log'},
    PropertiesService: {getScriptProperties: () => ({getProperty: () => approved ? 'yes' : null, deleteProperty: () => {}})},
    Utilities: {sleep: () => {}},
    UrlFetchApp: {fetch(url, options) {
      calls.push({url, ...options});
      let status = 200, body;
      const method = options.method || 'get';
      if (url === `https://cloudresourcemanager.googleapis.com/v1/projects/${project}`) {
        body = {projectId: project, projectNumber: wrongProject ? '999' : number, lifecycleState: 'ACTIVE'};
      } else if (url.includes(':getIamPolicy') || url.endsWith(':getIamPolicy')) {
        body = structuredClone(policies.get(url.split(':getIamPolicy')[0]) || policy);
      } else if (url.includes(':setIamPolicy')) {
        body = JSON.parse(options.payload).policy;
        policies.set(url.split(':setIamPolicy')[0], body);
      } else if (url.includes('services:batchEnable')) {
        body = {done: true, response: {}};
      } else if (url.endsWith('/providers?pageSize=100')) {
        body = {workloadIdentityPoolProviders: extraProvider ? [{name: `projects/${number}/locations/global/workloadIdentityPools/bytebudget-github/providers/unreviewed`}] : []};
      } else if (method === 'get') {
        body = state.get(url);
        if (!body) { status = 404; body = {error: {code: 404, message: 'not found'}}; }
      } else {
        body = JSON.parse(options.payload);
        if (url.endsWith('/serviceAccounts')) {
          state.set(`https://iam.googleapis.com/v1/projects/${project}/serviceAccounts/bytebudget-github-ops@${project}.iam.gserviceaccount.com`, body.serviceAccount);
          body = body.serviceAccount;
        } else {
          state.set(url.split('?')[0] + '/' + (url.includes('/providers?') ? 'github' : 'bytebudget-github'), {...body, state: 'ACTIVE'});
          body = {done: true, response: body};
        }
      }
      return {getResponseCode: () => status, getContentText: () => JSON.stringify(body)};
    }}
  });
  vm.runInContext(source, context);
  return {context, calls, logs};
}

test('bootstrap cannot mutate Cloud until explicit approval is recorded', () => {
  const {context, calls} = runtime();
  assert.equal(typeof context.bootstrapByteBudgetIdentity, 'function');
  assert.throws(() => context.bootstrapByteBudgetIdentity(), /approval/i);
  assert.equal(calls.length, 0);
});

test('bootstrap aborts before writes when the project number does not match', () => {
  const {context, calls} = runtime({approved: true, wrongProject: true});
  assert.equal(typeof context.bootstrapByteBudgetIdentity, 'function');
  assert.throws(() => context.bootstrapByteBudgetIdentity(), /project/i);
  assert(calls.every(c => c.method === 'get'));
});

test('bootstrap limits trust, preserves policies and never exports its token', () => {
  const {context, calls, logs} = runtime({approved: true});
  assert.equal(typeof context.bootstrapByteBudgetIdentity, 'function');
  context.bootstrapByteBudgetIdentity();
  assert(calls.every(c => c.headers['x-goog-user-project'] === 'bytebudget-f8aaa'));
  const provider = JSON.parse(calls.find(c => c.url.includes('/providers?')).payload);
  for (const claim of ['1449678627', '100540571', 'refs/heads/main', '.github/workflows/google-cloud-ops.yml@refs/heads/main']) {
    assert(provider.attributeCondition.includes(claim));
  }
  const updates = calls.filter(c => c.url.includes(':setIamPolicy')).map(c => JSON.parse(c.payload));
  assert.equal(updates.length, 2);
  for (const {policy} of updates) {
    assert.equal(policy.etag, 'unchanged-etag');
    assert(policy.bindings.some(b => b.condition?.title === 'existing'));
  }
  const projectPolicy = updates[0].policy;
  const saGrants = projectPolicy.bindings.filter(b => b.members.some(m => m.startsWith('serviceAccount:')));
  assert.deepEqual(saGrants.map(b => b.role), ['roles/serviceusage.serviceUsageViewer']);
  const enabled = JSON.parse(calls.find(c => c.url.includes('services:batchEnable')).payload).serviceIds;
  assert(enabled.every(id => !/places|geocoding|billing|run\.googleapis/.test(id)));
  assert(!JSON.stringify(logs).includes('test-token-never-log'));
  assert(!calls.some(c => /\/keys|billingAccounts|:generateAccessToken/.test(c.url)));
});

test('an unexpected provider prevents any impersonation policy grant', () => {
  const {context, calls} = runtime({approved: true, extraProvider: true});
  assert.throws(() => context.bootstrapByteBudgetIdentity(), /provider/i);
  assert(!calls.some(c => c.url.includes(':setIamPolicy')));
});

test('an existing privileged account cannot be connected to GitHub', () => {
  const {context, calls} = runtime({approved: true, privilegedAccount: true});
  assert.throws(() => context.bootstrapByteBudgetIdentity(), /privilege/i);
  assert(!calls.some(c => c.url.includes(':setIamPolicy')));
});

test('an approved second bootstrap reuses resources and keeps grants unique', () => {
  const {context, calls} = runtime({approved: true});
  context.bootstrapByteBudgetIdentity();
  const before = calls.length;
  context.bootstrapByteBudgetIdentity();
  const repeated = calls.slice(before);
  assert(!repeated.some(c => c.method === 'post' && /\/serviceAccounts$|\/providers\?|\/workloadIdentityPools\?/.test(c.url)));
  for (const call of repeated.filter(c => c.url.includes(':setIamPolicy'))) {
    const {policy} = JSON.parse(call.payload);
    for (const binding of policy.bindings) assert.equal(new Set(binding.members).size, binding.members.length);
  }
});

test('service account policy is read with the documented POST method', () => {
  const {context, calls} = runtime({approved: true});
  context.bootstrapByteBudgetIdentity();
  const request = calls.find(c => c.url.includes('/serviceAccounts/') && c.url.includes(':getIamPolicy'));
  assert.equal(request.method, 'post');
  assert(request.url.endsWith('?options.requestedPolicyVersion=3'));
  assert.equal(request.payload, undefined);
});
