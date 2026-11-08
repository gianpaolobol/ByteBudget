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
