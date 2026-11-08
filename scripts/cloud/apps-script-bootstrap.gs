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
  const accountPolicy = bbRequest_('iam', accountPath + ':getIamPolicy?options.requestedPolicyVersion=3', 'get');
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
