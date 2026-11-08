// Private Apps Script, never deploy as a web app. OAuth token stays in Google.
// Inspection works with cloud-platform.read-only. Bootstrap needs cloud-platform
// consent AND BYTEBUDGET_BOOTSTRAP_APPROVED=yes in script properties after owner
// approval. No Maps requests, billing changes, keys or broad SA roles.
const BB_PROJECT_ = 'bytebudget-f8aaa';
const BB_NUMBER_ = '137839521041';
const BB_ACCOUNT_ = 'bytebudget-github-ops@' + BB_PROJECT_ + '.iam.gserviceaccount.com';
const BB_POOL_ = 'projects/' + BB_NUMBER_ + '/locations/global/workloadIdentityPools/bytebudget-github';
const BB_CONDITION_ = "assertion.repository_id == '1449678627' && assertion.repository_owner_id == '100540571' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == 'gianpaolobol/ByteBudget/.github/workflows/google-cloud-ops.yml@refs/heads/main'";
const BB_MAPPING_ = {
  'google.subject': 'assertion.sub',
  'attribute.repository_id': 'assertion.repository_id',
  'attribute.repository_owner_id': 'assertion.repository_owner_id',
  'attribute.ref': 'assertion.ref'
};

function inspectByteBudget() {
  const project = bbProject_();
  const services = ['cloudresourcemanager.googleapis.com', 'iam.googleapis.com',
    'iamcredentials.googleapis.com', 'sts.googleapis.com', 'serviceusage.googleapis.com',
    'places.googleapis.com', 'geocoding-backend.googleapis.com'].map(id => {
      const result = bbRequest_('serviceusage', 'projects/' + BB_NUMBER_ + '/services/' + id, 'get', null, true);
      return {id: id, state: result ? result.state : 'NOT_FOUND'};
    });
  console.log(JSON.stringify({projectId: project.projectId, projectNumber: project.projectNumber, services: services}));
}

// Explicit owner-requested API activation only. Does not enable billing, create
// credentials, change GitHub permissions or send billable Places/Geocoding calls.
function enableByteBudgetMapsApis() {
  bbProject_();
  bbWait_('serviceusage', bbRequest_('serviceusage', 'projects/' + BB_NUMBER_ + '/services:batchEnable', 'post', {
    serviceIds: ['places.googleapis.com', 'geocoding-backend.googleapis.com']
  }));
  console.log(JSON.stringify({projectId: BB_PROJECT_, apiEnableOperationCompleted: true, billingChanged: false, keysCreated: false, providerQueriesSent: false}));
}

function bootstrapByteBudgetIdentity() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('BYTEBUDGET_BOOTSTRAP_APPROVED') !== 'yes') {
    throw new Error('Owner approval must be recorded before bootstrap.');
  }
  bbProject_(); // Verify immutable project identity before any write.
  bbWait_('serviceusage', bbRequest_('serviceusage', 'projects/' + BB_NUMBER_ + '/services:batchEnable', 'post', {
    serviceIds: ['cloudresourcemanager.googleapis.com', 'iam.googleapis.com',
      'iamcredentials.googleapis.com', 'sts.googleapis.com', 'serviceusage.googleapis.com']
  }));
  const accountPath = 'projects/' + BB_PROJECT_ + '/serviceAccounts/' + BB_ACCOUNT_;
  const account = bbRequest_('iam', accountPath, 'get', null, true);
  if (account && account.disabled) throw new Error('Existing service account is disabled; manual review required.');
  if (!account) bbRequest_('iam', 'projects/' + BB_PROJECT_ + '/serviceAccounts', 'post', {
    accountId: 'bytebudget-github-ops', serviceAccount: {displayName: 'ByteBudget GitHub operations'}
  });
  const pool = bbRequest_('iam', BB_POOL_, 'get', null, true);
  if (pool && (pool.disabled || pool.state !== 'ACTIVE')) throw new Error('Existing pool requires review.');
  if (!pool) bbWait_('iam', bbRequest_('iam', 'projects/' + BB_NUMBER_ + '/locations/global/workloadIdentityPools?workloadIdentityPoolId=bytebudget-github', 'post', {
    displayName: 'ByteBudget GitHub'
  }));
  const providerPath = BB_POOL_ + '/providers/github';
  const provider = bbRequest_('iam', providerPath, 'get', null, true);
  if (provider) {
    if (provider.disabled || provider.state !== 'ACTIVE' || provider.oidc.issuerUri !== 'https://token.actions.githubusercontent.com' ||
        provider.attributeCondition !== BB_CONDITION_ ||
        Object.keys(BB_MAPPING_).some(key => provider.attributeMapping[key] !== BB_MAPPING_[key])) {
      throw new Error('Existing provider differs from reviewed trust; manual review required.');
    }
  } else {
    bbWait_('iam', bbRequest_('iam', BB_POOL_ + '/providers?workloadIdentityPoolProviderId=github', 'post', {
      displayName: 'GitHub ByteBudget main', oidc: {issuerUri: 'https://token.actions.githubusercontent.com'},
      attributeMapping: BB_MAPPING_, attributeCondition: BB_CONDITION_
    }));
  }
  const projectPath = 'projects/' + BB_PROJECT_;
  const policy = bbRequest_('cloudresourcemanager', projectPath + ':getIamPolicy', 'post', {options: {requestedPolicyVersion: 3}});
  if ((policy.bindings || []).some(binding => binding.role !== 'roles/serviceusage.serviceUsageViewer' &&
      binding.members.indexOf('serviceAccount:' + BB_ACCOUNT_) >= 0)) {
    throw new Error('Existing service account has unexpected project privileges; manual review required.');
  }
  let pageToken = '';
  for (let page = 0; page < 20; page++) {
    const providers = bbRequest_('iam', BB_POOL_ + '/providers?pageSize=100' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''), 'get');
    if ((providers.workloadIdentityPoolProviders || []).some(item => item.name !== BB_POOL_ + '/providers/github')) {
      throw new Error('Unexpected provider in dedicated pool; refusing cross-provider impersonation.');
    }
    pageToken = providers.nextPageToken || '';
    if (!pageToken) break;
    if (page === 19) throw new Error('Provider inspection incomplete; refusing IAM grant.');
  }
  bbGrant_(policy, 'roles/serviceusage.serviceUsageViewer', 'serviceAccount:' + BB_ACCOUNT_);
  bbRequest_('cloudresourcemanager', projectPath + ':setIamPolicy', 'post', {policy: policy});
  const accountPolicy = bbRequest_('iam', accountPath + ':getIamPolicy?options.requestedPolicyVersion=3', 'post');
  bbGrant_(accountPolicy, 'roles/iam.workloadIdentityUser', 'principalSet://iam.googleapis.com/' + BB_POOL_ + '/attribute.repository_id/1449678627');
  bbRequest_('iam', accountPath + ':setIamPolicy', 'post', {policy: accountPolicy});
  properties.deleteProperty('BYTEBUDGET_BOOTSTRAP_APPROVED');
  console.log(JSON.stringify({GCP_PROJECT_ID: BB_PROJECT_, GCP_WIF_PROVIDER: BB_POOL_ + '/providers/github', GCP_SERVICE_ACCOUNT: BB_ACCOUNT_}));
}

function bbProject_() {
  const project = bbRequest_('cloudresourcemanager', 'projects/' + BB_PROJECT_, 'get');
  if (project.projectId !== BB_PROJECT_ || String(project.projectNumber) !== BB_NUMBER_ || project.lifecycleState !== 'ACTIVE') {
    throw new Error('Google project identity does not match approved ByteBudget project.');
  }
  return project;
}

function bbGrant_(policy, role, member) {
  if (!policy.etag) throw new Error('Policy etag missing; refusing unsafe policy replacement.');
  policy.version = 3;
  policy.bindings = policy.bindings || [];
  let binding = policy.bindings.find(item => item.role === role && !item.condition);
  if (!binding) { binding = {role: role, members: []}; policy.bindings.push(binding); }
  if (binding.members.indexOf(member) < 0) binding.members.push(member);
}

function bbRequest_(service, path, method, payload, missingAllowed) {
  if (['cloudresourcemanager', 'iam', 'serviceusage'].indexOf(service) < 0 || !/^(projects\/|operations\/)/.test(path) || /[\r\n#]/.test(path)) {
    throw new Error('Unsupported management request.');
  }
  const options = {method: method || 'get', headers: {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': BB_PROJECT_
  }, muteHttpExceptions: true, followRedirects: false};
  if (payload !== undefined && payload !== null) {
    options.contentType = 'application/json'; options.payload = JSON.stringify(payload);
  }
  const response = UrlFetchApp.fetch('https://' + service + '.googleapis.com/v1/' + path, options);
  const status = response.getResponseCode();
  if (status === 404 && missingAllowed) return null;
  const result = JSON.parse(response.getContentText());
  if (status < 200 || status >= 300) throw new Error(service + ' HTTP ' + status + ': ' + (result.error ? result.error.message : 'request failed'));
  return result;
}

function bbWait_(service, operation) {
  for (let attempt = 0; attempt < 45; attempt++) {
    if (operation.done) {
      if (operation.error) throw new Error('Management operation failed: ' + operation.error.message);
      return operation.response;
    }
    if (!operation.name || (service === 'iam' && operation.name.indexOf('projects/' + BB_NUMBER_ + '/locations/global/') !== 0) ||
        (service === 'serviceusage' && operation.name.indexOf('operations/') !== 0)) throw new Error('Unexpected operation identity.');
    Utilities.sleep(1000);
    operation = bbRequest_(service, operation.name, 'get');
  }
  throw new Error('Operation pending; inspect state before resuming bootstrap.');
}

// Activates only the free management API; never links/changes billing accounts.
function prepareByteBudgetBillingAudit() {
  bbProject_();
  bbWait_('serviceusage', bbRequest_('serviceusage', 'projects/' + BB_NUMBER_ + '/services:batchEnable', 'post', {serviceIds: ['cloudbilling.googleapis.com', 'apikeys.googleapis.com']}));
  const billing = bbReadBilling_('projects/' + BB_PROJECT_ + '/billingInfo');
  if (billing.billingEnabled !== true) {
    console.log(JSON.stringify({billingEnabled: false}));
    return;
  }
  if (!/^billingAccounts\/[A-Za-z0-9-]+$/.test(billing.billingAccountName || '')) throw new Error('Unexpected billing identity.');
  let token = '', projects = [];
  for (let page = 0; page < 20; page++) {
    const result = bbReadBilling_(billing.billingAccountName + '/projects?pageSize=100' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    projects = projects.concat(result.projectBillingInfo || []);
    token = result.nextPageToken || '';
    if (!token) break;
    if (page === 19) throw new Error('Billing project inspection incomplete.');
  }
  let keyToken = '', keyCount = 0, keySummaries = [];
  for (let page = 0; page < 20; page++) {
    const keyResponse = UrlFetchApp.fetch('https://apikeys.googleapis.com/v2/projects/' + BB_NUMBER_ + '/locations/global/keys?pageSize=100' + (keyToken ? '&pageToken=' + encodeURIComponent(keyToken) : ''), {
      method: 'get', headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': BB_PROJECT_}, muteHttpExceptions: true, followRedirects: false
    });
    if (keyResponse.getResponseCode() !== 200) throw new Error('Key metadata inspection failed; no key created.');
    const keyPage = JSON.parse(keyResponse.getContentText());
    keyCount += (keyPage.keys || []).length;
    keySummaries = keySummaries.concat((keyPage.keys || []).map(function(key) {
      const restrictions = key.restrictions || {};
      return {displayName: key.displayName || '', services: (restrictions.apiTargets || []).map(function(item) {return item.service;}),
        browserRestricted: !!restrictions.browserKeyRestrictions, serverRestricted: !!restrictions.serverKeyRestrictions};
    }));
    keyToken = keyPage.nextPageToken || '';
    if (!keyToken) break;
    if (page === 19) throw new Error('Key metadata inspection incomplete.');
  }
  console.log(JSON.stringify({billingEnabled: true, linkedProjectCount: projects.length,
    onlyByteBudget: projects.length === 1 && projects[0].projectId === BB_PROJECT_, apiKeyCount: keyCount, apiKeys: keySummaries}));
}

function bbReadBilling_(path) {
  if (!/^(projects\/bytebudget-f8aaa\/billingInfo|billingAccounts\/[A-Za-z0-9-]+\/projects\?pageSize=100(&pageToken=[A-Za-z0-9%_.~-]+)?)$/.test(path)) throw new Error('Unsupported billing read.');
  const response = UrlFetchApp.fetch('https://cloudbilling.googleapis.com/v1/' + path, {
    method: 'get', headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': BB_PROJECT_},
    muteHttpExceptions: true, followRedirects: false
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('Billing inspection HTTP ' + status + '; no financial action performed.');
  return JSON.parse(response.getContentText());
}

// Owner explicitly approved this dedicated credential and backend-only destination.
function createByteBudgetRuntimeKey() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('BYTEBUDGET_RUNTIME_KEY_APPROVED') !== 'yes') throw new Error('Runtime key approval must be recorded.');
  bbProject_();
  const name = 'projects/' + BB_NUMBER_ + '/locations/global/keys/bytebudget-server';
  let key = bbKeyRequest_(name, 'get', null, true);
  if (!key) {
    let operation = bbKeyRequest_('projects/' + BB_NUMBER_ + '/locations/global/keys?keyId=bytebudget-server', 'post', {
      displayName: 'ByteBudget server Places and Geocoding',
      restrictions: {apiTargets: [{service: 'places.googleapis.com'}, {service: 'geocoding-backend.googleapis.com'}]}
    });
    for (let attempt = 0; !operation.done && attempt < 45; attempt++) {
      if (!/^operations\/[A-Za-z0-9._/-]+$/.test(operation.name || '')) throw new Error('Unexpected key operation.');
      Utilities.sleep(1000);
      operation = bbKeyRequest_(operation.name, 'get');
    }
    if (!operation.done || operation.error) throw new Error('Key operation pending or failed; inspect before retrying.');
    key = bbKeyRequest_(name, 'get');
  }
  const restrictions = key.restrictions || {};
  const services = (restrictions.apiTargets || []).map(function(target) {return target.service;}).sort();
  if (key.name !== name || JSON.stringify(services) !== JSON.stringify(['geocoding-backend.googleapis.com', 'places.googleapis.com']) ||
      restrictions.browserKeyRestrictions || restrictions.androidKeyRestrictions || restrictions.iosKeyRestrictions || restrictions.serverKeyRestrictions ||
      (restrictions.apiTargets || []).some(function(target) {return target.methods && target.methods.length;})) {
    throw new Error('Existing dedicated key restrictions do not match approval.');
  }
  const secret = bbKeyRequest_(name + '/keyString', 'get').keyString;
  if (typeof secret !== 'string' || !/^AIza[A-Za-z0-9_-]{20,}$/.test(secret)) throw new Error('Unexpected key value; not staged.');
  properties.setProperty('BYTEBUDGET_RUNTIME_KEY_STAGE', secret);
  properties.deleteProperty('BYTEBUDGET_RUNTIME_KEY_APPROVED');
  console.log(JSON.stringify({dedicatedKeyReady: true, restrictedApis: services, stagedForBackendTransfer: true, providerQueriesSent: false}));
}

function clearByteBudgetRuntimeKeyStage() {
  PropertiesService.getScriptProperties().deleteProperty('BYTEBUDGET_RUNTIME_KEY_STAGE');
  console.log(JSON.stringify({temporaryKeyStageCleared: true}));
}

function bbKeyRequest_(path, method, payload, missingAllowed) {
  const name = 'projects/' + BB_NUMBER_ + '/locations/global/keys/bytebudget-server';
  if (!((method === 'get' && (path === name || path === name + '/keyString' || /^operations\/[A-Za-z0-9._/-]+$/.test(path))) ||
        (method === 'post' && path === 'projects/' + BB_NUMBER_ + '/locations/global/keys?keyId=bytebudget-server'))) throw new Error('Unsupported key management request.');
  const options = {method: method, headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': BB_PROJECT_}, muteHttpExceptions: true, followRedirects: false};
  if (payload) {options.contentType = 'application/json'; options.payload = JSON.stringify(payload);}
  const response = UrlFetchApp.fetch('https://apikeys.googleapis.com/v2/' + path, options);
  const status = response.getResponseCode();
  if (status === 404 && missingAllowed) return null;
  if (status < 200 || status >= 300) throw new Error('Key management HTTP ' + status + '; secret omitted.');
  return JSON.parse(response.getContentText());
}

function inspectByteBudgetMapsUsage() {
  bbProject_();
  bbWait_('serviceusage', bbRequest_('serviceusage', 'projects/' + BB_NUMBER_ + '/services:batchEnable', 'post', {serviceIds: ['monitoring.googleapis.com']}));
  const end = new Date(), start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
  // Include the preceding UTC day so the Pacific monthly boundary is never excluded.
  const filter = 'metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.type="consumed_api" AND (resource.labels.service="places.googleapis.com" OR resource.labels.service="geocoding-backend.googleapis.com")';
  let token = '', places = 0, geocoding = 0;
  for (let page = 0; page < 20; page++) {
    const url = 'https://monitoring.googleapis.com/v3/projects/' + BB_PROJECT_ + '/timeSeries?filter=' + encodeURIComponent(filter) +
      '&interval.startTime=' + encodeURIComponent(start.toISOString()) + '&interval.endTime=' + encodeURIComponent(end.toISOString()) + '&view=FULL&pageSize=1000' +
      '&aggregation.alignmentPeriod=86400s&aggregation.perSeriesAligner=ALIGN_SUM&aggregation.crossSeriesReducer=REDUCE_SUM&aggregation.groupByFields=resource.labels.service' +
      (token ? '&pageToken=' + encodeURIComponent(token) : '');
    const response = UrlFetchApp.fetch(url, {method: 'get', headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': BB_PROJECT_}, muteHttpExceptions: true, followRedirects: false});
    if (response.getResponseCode() !== 200) throw new Error('Usage inspection HTTP ' + response.getResponseCode() + '; no Maps calls sent.');
    const result = JSON.parse(response.getContentText());
    (result.timeSeries || []).forEach(function(series) {
      const service = series.resource && series.resource.labels && series.resource.labels.service;
      if (['places.googleapis.com', 'geocoding-backend.googleapis.com'].indexOf(service) < 0) throw new Error('Unexpected usage service.');
      (series.points || []).forEach(function(point) {
        const n = Number(point.value && point.value.int64Value);
        if (!Number.isSafeInteger(n) || n < 0) throw new Error('Unexpected usage counter.');
        if (service === 'places.googleapis.com') places += n; else geocoding += n;
      });
    });
    token = result.nextPageToken || '';
    if (!token) break;
    if (page === 19) throw new Error('Usage inspection incomplete.');
  }
  console.log(JSON.stringify({periodStart: start.toISOString(), periodEnd: end.toISOString(), placesRequests: places, geocodingRequests: geocoding, telemetryMayBeDelayed: true}));
}
