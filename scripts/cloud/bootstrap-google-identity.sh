#!/usr/bin/env bash
# One-time account-holder setup. Requires an existing project and authenticated
# gcloud with permission to create its IAM identity federation configuration.
# Does not create a project, attach billing, enable Maps or create/download keys.
set -euo pipefail
project_id=${1:?Usage: bash scripts/cloud/bootstrap-google-identity.sh EXISTING_PROJECT_ID}
if [[ ! "$project_id" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]]; then
  echo 'Expected the existing Google project ID, not its display name.' >&2
  exit 1
fi
command -v gcloud >/dev/null || { echo 'Google Cloud CLI is required.' >&2; exit 1; }
project_number=$(gcloud projects describe "$project_id" --format='value(projectNumber)')
[[ "$project_number" =~ ^[0-9]+$ ]] || { echo 'Project not accessible.' >&2; exit 1; }
pool_id=bytebudget-github
provider_id=github
account_id=bytebudget-github-ops
account_email="${account_id}@${project_id}.iam.gserviceaccount.com"
condition="assertion.repository_id == '1449678627' && assertion.repository_owner_id == '100540571' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == 'gianpaolobol/ByteBudget/.github/workflows/google-cloud-ops.yml@refs/heads/main'"
mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref'

gcloud services enable cloudresourcemanager.googleapis.com iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com serviceusage.googleapis.com --project="$project_id" --quiet
if ! gcloud iam service-accounts describe "$account_email" --project="$project_id" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$account_id" --display-name='ByteBudget GitHub operations' --project="$project_id" --quiet
fi
if ! gcloud iam workload-identity-pools describe "$pool_id" --location=global --project="$project_id" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$pool_id" --location=global --display-name='ByteBudget GitHub' --project="$project_id" --quiet
fi
if gcloud iam workload-identity-pools providers describe "$provider_id" --workload-identity-pool="$pool_id" --location=global --project="$project_id" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc "$provider_id" --workload-identity-pool="$pool_id" --location=global --project="$project_id" --issuer-uri='https://token.actions.githubusercontent.com' --attribute-mapping="$mapping" --attribute-condition="$condition" --quiet
else
  gcloud iam workload-identity-pools providers create-oidc "$provider_id" --workload-identity-pool="$pool_id" --location=global --project="$project_id" --issuer-uri='https://token.actions.githubusercontent.com' --attribute-mapping="$mapping" --attribute-condition="$condition" --quiet
fi
# Initial connection is deliberately read-only; no billing, IAM-admin or key
# retrieval privileges are granted to unattended jobs.
gcloud projects add-iam-policy-binding "$project_id" --member="serviceAccount:$account_email" --role=roles/serviceusage.serviceUsageViewer --condition=None --quiet >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$account_email" --project="$project_id" --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/${pool_id}/attribute.repository_id/1449678627" --quiet >/dev/null

cat <<CONFIG
One-time Google identity setup complete. Set these non-secret repository variables:
GCP_PROJECT_ID=$project_id
GCP_WIF_PROVIDER=projects/$project_number/locations/global/workloadIdentityPools/$pool_id/providers/$provider_id
GCP_SERVICE_ACCOUNT=$account_email
Then run GitHub Actions: Google Cloud access check.
CONFIG
