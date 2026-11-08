# Autonomous Google operations: verified paths and bootstrap

User requests unattended administration for ByteBudget and future operations. Prior constraint remains no additional spending. This is a supported identity setup, not a way to bypass sign-in or account permissions.

## Evidence from this environment

| Route | Observed result |
| --- | --- |
| Existing cloud browser | Google Cloud console returns Site Unavailable before account selection; one reload did not fix it. Other services such as GitHub/Apple remain usable. |
| Direct CLI/API | No gcloud/terraform installation, no gcloud configuration, no GOOGLE_APPLICATION_CREDENTIALS or OAuth access token present. Installing a CLI alone would not authenticate it. |
| Connected Google Cloud administration plugin | None found through plugin discovery. Drive/Gmail do not confer Cloud administration access. |
| Alternate TinyFish browser | Existing Default profile records google.com sign-in from2026-10-28; expiration/account identity/Cloud permissions not verified. Automation wallet has no available credit and runs require payment. No paid run, top-up or auto-reload requested. This is an alternative to test if the owner separately authorizes its cost; it is not proven to reach Cloud Console. |
| GitHub Actions → Google Cloud APIs | Supported through Google Workload Identity Federation. No recurring browser sign-in or stored long-lived service-account JSON key required after account-holder bootstrap. Currently NOT connected. |

## Prepared implementation

.github/workflows/google-cloud-ops.yml authenticates with Google OIDC and inspects whether Places(New) and Geocoding APIs are enabled, with no billable Maps requests. It is manual, restricted to this repository's numericID1449678627 and main branch. No scheduled jobs were created.

scripts/cloud/bootstrap-google-identity.sh accepts an EXISTING projectID; it requires a previously authenticated Google Cloud CLI. It creates a dedicated identity pool/provider and service account within that project, grants initial Service Usage Viewer only, and restricts federation by immutable repository/owner IDs, main ref and exact workflow reference. No Owner/Editor/Billing role and no API-key-read privilege. It prints three non-secret GitHub variables. It does not create a project, link billing, create API keys or activate Maps.

The bootstrap changes IAM access and must be reviewed and executed by an authenticated account holder or approved administrator. It has NOT been run. New trust cannot be created without an existing authorized Google identity. Permission to act and actual authentication are different prerequisites.

## What is and is not autonomous afterward

After bootstrap, I can trigger the access-check workflow through connected GitHub and inspect real API status without the owner re-entering Google credentials. Further authorized operations need narrowly scoped additions: Service Usage Admin to enable selected APIs; API Keys Admin for creating/restricting Maps keys. Those are not silently granted by the current bootstrap. Production key delivery, quotas/billing and app hosting remain separate setup tasks. Paid activation, legal agreements and owner-only account checks may still require the owner.

This does not make TestFlight signing autonomous by itself: ByteBudget GitHub still requires its existing Apple signing certificate/private key, profile and approved ASC credential. The code implementation and89tests are ready; TestFlight1.0.0(2) remains the old demo.

## Cost constraint

No paid browser run, API request, account upgrade or billing change was performed. Google free usage is aggregated per billing account. A per-minute quota or alerts-only budget is not a hard monthly spending cap. Don't enable a public live service until its permitted call budget and billing-account usage are established.

Sources checked2026-11-08: Google IAM Workload Identity Federation with deployment pipelines; google-github-actions/auth and setup-gcloud; Google API-key management and Service Usage roles. The bootstrap/workflow passed local syntax checks only; real Cloud authentication and administration remain unverified.


## Additional verification — 2026-11-08

Official standalone Cloud Shell https://shell.cloud.google.com/ was tried as an alternative to Cloud Console; this browser also returns Site Unavailable. This is a generic accessibility failure, not evidence of a bot challenge or a rejected password. No security controls were bypassed.

Direct unauthenticated request to https://cloudresourcemanager.googleapis.com/v1/projects from the executor returned HTTP401. Thus that administrative API is reachable, but no authorized Google identity is present. An installed CLI alone would not solve authentication.

Read-only inspection of Fungo Italia store-build.yml/pipeline.yml and Pianta Libera store.yml/deploy-cloudflare.yml found no google-github-actions/auth or workload_identity_provider configuration to reuse. No credentials copied, secret values retrieved or other repositories modified. This is a bounded check of those workflows, not a claim to have inspected every repository or secret.

Remaining zero-extra-cost path is one authenticated owner/admin bootstrap followed by scoped OIDC federation. Runtime access is not established yet. Explicit user authorization does not issue Google OAuth/IAM credentials by itself, and paid alternative automation was not started.

## Preferred route for all current and future apps — user decision

User explicitly selects this supported route as the preferred approach for other apps and future apps, subject to actual access and the no-additional-spending constraint. Reuse the setup pattern, with separate project/repository identities and narrowly scoped permissions; do not automatically reuse ByteBudget credentials or broaden access to unrelated projects. GitHub remains the preferred build and delivery path, without Expo.

Apps Script is accessible and already signed in to the owner's Google account. Created a private standalone project named **Gian - Accesso tecnico Google Cloud**:
https://script.google.com/home/projects/186Uiz3wiE2yd3bb_cISS3F-M4Dfjwzpp01jyMBl-0m4gqEdOYbnd-vfv/edit

Saved a diagnostic function and an explicit manifest. No deployment or scheduled trigger created. The token stays inside Apps Script and is never logged, copied or returned. First execution reached Google's **Google non ha verificato questa app** warning, naming the owner's own developer account. Owner intervention is required to proceed past that warning and grant initial read-only Cloud consent. No project discovery result, IAM changes, Maps activation or billing changes have occurred. Accessible editor does not yet prove authenticated Cloud API access.

Diagnostic source in Codice.gs:

```js
function inspectGoogleProjects() {
  const response = UrlFetchApp.fetch("https://cloudresourcemanager.googleapis.com/v1/projects?pageSize=100", {
    headers: {Authorization: "Bearer " + ScriptApp.getOAuthToken()},
    muteHttpExceptions: true
  });
  const payload = JSON.parse(response.getContentText());
  console.log(JSON.stringify({status: response.getResponseCode(), projects: (payload.projects || []).map(p => ({projectId: p.projectId, name: p.name, lifecycleState: p.lifecycleState})), error: payload.error || null, hasMore: Boolean(payload.nextPageToken)}));
}
```

Manifest appsscript.json:

```json
{
  "timeZone": "Europe/Rome",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/cloud-platform.read-only"
  ]
}
```

After consent, inspect the actual response. The default Apps Script Cloud project may require API configuration; no success is assumed. This diagnostic reads at most the first100projects and reports hasMore. If true, implement pagination before concluding that a project is absent. Only after the exact existing ByteBudget project is identified should a separately reviewed, scoped federation bootstrap run. Read-only consent does not authorize IAM writes by itself.


## Consent verified and bootstrap limitation — 2026-11-08

Owner reported consent completed. Re-running inspectGoogleProjects verified authenticated execution, returning HTTP403 SERVICE_DISABLED for cloudresourcemanager.googleapis.com in the script's default consumer project472026022918. This is not a missing login. Default Apps Script projects cannot normally be manually configured by the script owner; Google's documented route is association with a standard Cloud project. The error's direct API activation link also returns Site Unavailable in this browser.

Firebase Console https://console.firebase.google.com/ is accessible and signed in to the same owner account. Its existing-Cloud-project selector lists five projects (three named My First Project, fungoitalia, Default Gemini Project); exact search ByteBudget returns no matching project. This is evidence about selectable projects under this account, not proof that ByteBudget cannot exist under another account/name. No Firebase service was added to existing projects, no terms accepted and no existing project modified.

A supported remaining route is creating a dedicated ByteBudget standard Cloud project through Firebase's free Spark setup (no billing account), which also enables Cloud Resource Manager, then attaching the private Apps Script to that standard project and testing access. Firebase terms require action-time owner confirmation. The UI reports only one project slot remains, so disclose that before creation. Do not enable Analytics, AI assistance, Developer Program enrollment, paid plans or billing. Spark setup only addresses technical bootstrap; it does not activate Maps or guarantee free Maps operation.

Official references: https://developers.google.com/apps-script/guides/cloud-platform-projects ; https://firebase.google.com/docs/projects/use-firebase-with-existing-cloud-project ; https://firebase.google.com/docs/projects/billing/firebase-pricing-plans .


## Firebase project created — 2026-11-08

User explicitly authorized accepting Firebase Terms and creating the project. Terms accepted and project creation completed. Verified Firebase General settings and billing badge:
- Display name: ByteBudget
- Project ID: bytebudget-f8aaa
- Project number: 137839521041
- Plan: Spark, no cost (0 USD/month)
- Google Developer Program enrollment, optional Gemini setup and Google Analytics disabled in creation wizard. No billing account linked, no upgrade or Maps activation performed.

Attempted to associate private Apps Script186Uiz3wiE2yd3bb_cISS3F-M4Dfjwzpp01jyMBl-0m4gqEdOYbnd-vfv with project137839521041. Apps Script explicitly rejected association because the standard project's OAuth consent screen must first be configured. The script therefore remains on its default Cloud project; do not claim the original API SERVICE_DISABLED error is resolved or WIF is connected.

Firebase service-account settings expose firebase-adminsdk-fbsvc@bytebudget-f8aaa.iam.gserviceaccount.com and the Generate new private key action. No key generated/downloaded and no IAM role assigned. Firebase Users and Permissions was inspected read-only; owner remains GianPaolo.Franceschini@gmail.com. Do not silently use a broad Owner/Editor service-account key as a substitute for the scoped WIF bootstrap. Next prerequisite is configuring standard-project OAuth consent through an authenticated supported administrative route, then retrying script association and read-only API verification. Existing TestFlight remains the old demo.


## Working authenticated API route — supersedes OAuth blocker, 2026-11-08

Official Google quota-project mechanism works: set x-goog-user-project: bytebudget-f8aaa on Apps Script UrlFetch REST requests while retaining the already-authorized default Apps Script project. No new OAuth branding/client or service-account private key is needed for this read-only route. Verified Cloud Resource Manager projects.list HTTP200, ByteBudget ACTIVE and complete response hasMore=false. Avoid reattempting standard-project association: its OAuth-branding prerequisite is unnecessary for this route.

Then ran inspectByteBudget with the same read-only OAuth scopes. Real Service Usage results:
- ENABLED: cloudresourcemanager.googleapis.com, serviceusage.googleapis.com.
- DISABLED: iam.googleapis.com, iamcredentials.googleapis.com, sts.googleapis.com, places.googleapis.com, geocoding-backend.googleapis.com.

Reusable preferred pattern for current/future apps: existing private Apps Script user consent + an explicit authorized quota project for management REST calls; repository-scoped keyless WIF for subsequent unattended GitHub checks. The successful read does not grant write scopes or connect GitHub by itself.

Prepared scripts/cloud/apps-script-bootstrap.gs in the private editor and this repository. Its first function inspectByteBudget only reads status. bootstrapByteBudgetIdentity is blocked by absent BYTEBUDGET_BOOTSTRAP_APPROVED=yes script property; current manifest still has cloud-platform.read-only and script.external_request. It has NOT run. To apply it requires explicit owner approval of full cloud-platform OAuth consent for the private script plus the exact ByteBudget trust/role changes below. Although OAuth names Cloud-wide access, script mutations are fixed to verified ByteBudget ID/number; no changes to other projects are planned.

Reviewed bootstrap: enable only Cloud Resource Manager, IAM, IAM Credentials, STS and Service Usage; create bytebudget-github-ops SA and dedicated bytebudget-github/github WIF pool/provider; restrict repository1449678627, owner100540571, main branch, exact google-cloud-ops.yml workflow; initial project role Service Usage Viewer only and workloadIdentityUser impersonation binding on that SA. Reject unexpected pool providers and existing privileged SA grants. Preserve policy etags/conditional bindings and refuse concurrent-policy replacements. Never creates keys, enables Maps, links billing or grants Owner/Editor. Successful bootstrap removes its approval property. Later API/key changes still need separately scoped roles; do not describe read-only GitHub access as full administration.

Validation: 95 Node tests passed and build succeeded; six bootstrap tests cover approval gate, immutable project identity, least-privilege changes/token non-export, unexpected providers, preexisting elevated account grants and repeat-run idempotence. Independent bounded code review found no remaining Important/Critical issues. These are source/mock tests; IAM writes and GitHub authentication are not yet verified live.

Source: https://docs.cloud.google.com/docs/quotas/set-quota-project and https://docs.cloud.google.com/docs/authentication/rest .


## Management consent authorized; Google warning pending — 2026-11-08

Owner explicitly authorized extending the private script's consent to Google Cloud management and creating the reviewed ByteBudget GitHub delegation. Updated saved appsscript.json to script.external_request + cloud-platform. Recorded BYTEBUDGET_BOOTSTRAP_APPROVED=yes in private script properties, selected bootstrapByteBudgetIdentity and started execution. Google requested reauthorization, then displayed Google non ha verificato questa app again for the expanded scope. Owner handoff is required at that warning. Scope is declared, but expanded consent is NOT yet verified granted; no IAM/bootstrap success observed. After the owner finishes, inspect real execution outcome before rerunning: bootstrap may run or may need Run again; successful completion deletes the approval property.

Prepared all three GitHub Actions repository variables, verified in the UI:
- GCP_PROJECT_ID=bytebudget-f8aaa
- GCP_WIF_PROVIDER=projects/137839521041/locations/global/workloadIdentityPools/bytebudget-github/providers/github
- GCP_SERVICE_ACCOUNT=bytebudget-github-ops@bytebudget-f8aaa.iam.gserviceaccount.com

The WIF/provider and ops-account values are the reviewed intended resource names, not proof the resources exist yet. No GitHub Google access workflow launched while consent/bootstrap remains unverified. Next: complete Google consent, verify bootstrap non-secret outputs, dispatch Google Cloud access check, inspect actual GitHub authentication/logs and verify only the read-only role was granted. No Keys/Maps/billing changes.


## Google delegation verified end-to-end — 2026-11-08 (current state)

Expanded cloud-platform consent is now valid. Bootstrap first encountered IAM API activation propagation, then a real implementation bug: serviceAccounts.getIamPolicy used GET; Google's endpoint requires POST. Corrected that method with an observed failing-then-passing regression; all96Node tests and build passed, bounded review found no new Important/Critical issue. Source fix on GitHub commits5405db2b745ce93a03e2d25f7c0673ac1a51fed7 and d4bd312eb776be6ea8463084d08e080c4a4967be.

After correction bootstrapByteBudgetIdentity completed successfully and printed the three expected non-secret IDs. Verified the approval property was removed: script settings again show Add script property with no saved rows. Management APIs, dedicated ops SA, dedicated WIF pool/provider and reviewed role bindings are created. No private key generated/exported. Ops account receives Service Usage Viewer only; its reviewed repository principal set receives Workload Identity User. Other-provider and existing privileged-account checks ran before policy writes.

Dispatched Google Cloud access check on main through GitHub UI. Actual run42437565962, job128599599488 completed SUCCESS in11seconds:
https://github.com/gianpaolobol/ByteBudget/actions/runs/42437565962
Verified successful steps: config prerequisite, google-github-actions/auth@v3, setup-gcloud@v3, real gcloud services list for Places/Geocoding and credential cleanup. This proves unattended GitHub→Google authentication works. Query returned no enabled matching Maps/Geocoding services. The read-only connection does not enable Maps, provide venue data, confer full admin access to GitHub, or satisfy remaining live TestFlight release prerequisites.

Preferred reusable route for current/future apps is now proven for ByteBudget: private authorized Apps Script + explicit quota-project header for initial setup, then narrow per-repository keyless WIF. Preserve user's zero-extra-spending constraint and GitHub-native builds. Do not bootstrap other projects with ByteBudget's fixed IDs; use verified per-project/repository identities and permissions. No new recurring triggers, billing links/upgrades, API keys, public endpoint or store binary created. Next live-app prerequisites remain Google Maps free-allowance/billing/enforceable spending controls, backend secret and native API hosting, then GitHub signing/upload credentials and device tests.


## Places and Geocoding enabled — 2026-11-08 (current Maps checkpoint)

Owner requested Maps/Geocoding configuration. Added reviewed enableByteBudgetMapsApis function: fixed project verification, ServiceUsage batchEnable only places.googleapis.com and geocoding-backend.googleapis.com; no billing, keys, IAM grants or provider queries.97tests/build passed, new test observed red→green. Function executed successfully in private Apps Script and reported operation complete with billingChanged=false, keysCreated=false, providerQueriesSent=false.

Independent GitHub verification run42438128077, job128601305206 SUCCESS. Actual job log contains:
- geocoding-backend.googleapis.com ENABLED
- places.googleapis.com ENABLED
Run URL: https://github.com/gianpaolobol/ByteBudget/actions/runs/42438128077

Firebase still shows Spark,0USD/month. Opened pricing dialog read-only: Spark current; Blaze pay-as-you-go is offered, with charges after free allowances. Did not select Blaze, link/create billing, create API keys, submit billable queries or connect backend. Official Places setup requires billing enabled even for free-allowance use. This is the concrete remaining blocker under user's zero-additional-spending constraint; API enablement is complete but live Maps use is NOT. Free allowances and alerts are not hard spending caps. Owner must explicitly decide whether to authorize a Cloud Billing/Blaze financial setup; final financial steps require owner handoff. Before public/billable queries, implement/enforce permitted call budget and review billing-account shared usage. Don't promise zero billing from QPM or budget alerts.

Sources: https://developers.google.com/maps/documentation/places/web-service/get-api-key ; https://developers.google.com/maps/documentation/places/web-service/usage-and-billing ; https://developers.google.com/maps/billing-and-pricing/overview .
