# API Production CI Setup (GitLab -> Server)

This project now includes:

- `.gitlab-ci.yml` job `deploy_api_production` (auto deploy on push to `main`)
- `.gitlab-ci.yml` job `preflight_api_production` (server readiness checks before deploy)
- `scripts/deploy-api-server.sh` (server-side install, Prisma sync, and service restart)

## 1) One-time server setup (run as root on 156.67.110.237)

Replace `YOUR_PUBLIC_KEY_HERE` with the public key generated for GitLab CI.

```bash
set -euo pipefail
APP_USER="apiphulpur"
APP_DIR="/home/apiphulpur/app"
SERVICE="phulpur-api.service"

id "$APP_USER" >/dev/null 2>&1
mkdir -p /home/$APP_USER/.ssh
chmod 700 /home/$APP_USER/.ssh

touch /home/$APP_USER/.ssh/authorized_keys
chmod 600 /home/$APP_USER/.ssh/authorized_keys
grep -q "YOUR_PUBLIC_KEY_HERE" /home/$APP_USER/.ssh/authorized_keys || echo "YOUR_PUBLIC_KEY_HERE" >> /home/$APP_USER/.ssh/authorized_keys

chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
chown -R $APP_USER:$APP_USER $APP_DIR

cat >/etc/sudoers.d/$APP_USER-api <<EOF
$APP_USER ALL=(root) NOPASSWD:/bin/systemctl restart $SERVICE,/bin/systemctl is-active $SERVICE,/bin/systemctl status $SERVICE
EOF
chmod 440 /etc/sudoers.d/$APP_USER-api

visudo -cf /etc/sudoers.d/$APP_USER-api
```

## 2) GitLab CI/CD variables (Project -> Settings -> CI/CD -> Variables)

Create these protected/masked variables:

- `PROD_SSH_HOST` = `156.67.110.237`
- `PROD_SSH_USER` = `apiphulpur`
- `PROD_APP_DIR` = `/home/apiphulpur/app`
- `PROD_SSH_PRIVATE_KEY` = private key text (multi-line, including BEGIN/END lines)
- `PROD_SSH_KNOWN_HOSTS` = output of `ssh-keyscan -H 156.67.110.237` (recommended)
- `PROD_API_SERVICE` = `phulpur-api.service` (optional; defaults in script)
- `PROD_APP_USER` = `apiphulpur` (optional; defaults in script)
- `PROD_API_HEALTHCHECK_URL` = `https://api.phulpur.net/api/health` (optional)
- `PROD_HEALTHCHECK_RETRIES` = `12` (optional)
- `PROD_HEALTHCHECK_SLEEP_SECONDS` = `5` (optional)

## 3) Key generation (local)

```bash
ssh-keygen -t ed25519 -C "gitlab-api-deploy" -f gitlab_api_deploy
```

- Put `gitlab_api_deploy.pub` on server in `authorized_keys`.
- Put `gitlab_api_deploy` content in GitLab variable `PROD_SSH_PRIVATE_KEY`.

## 4) Verify passwordless login from any machine with the private key

```bash
ssh -i gitlab_api_deploy apiphulpur@156.67.110.237 "whoami"
```

Expected output: `apiphulpur`

## 5) Deploy behavior

On every push to `main`, GitLab job `deploy_api_production` will:

1. SSH using key auth (no password)
2. verify host key from `PROD_SSH_KNOWN_HOSTS` (or fallback to `ssh-keyscan`)
3. rsync project to server app dir (keeps server `.env` intact)
4. run `scripts/deploy-api-server.sh` on server
5. install dependencies, run Prisma generate/push, restart `phulpur-api.service`
6. fail the pipeline if `/api/health` is not healthy after deploy

Also included:

- `restart_api_production` manual job (production emergency restart + health check).
- Serialized production jobs (`resource_group: production-api`) to prevent overlapping deploy/restart actions.
- `preflight_api_production` automatic job to validate SSH connectivity, server app dir access, Node/npm presence, and service control before deployment starts.

## 6) Recommended GitLab environment protections

- Protect `main` branch.
- Mark deploy variables as masked + protected.
- Use project deployment approvals for production environment if available.
- Keep `deploy_api_production` automatic only on `main`; use manual deploys for pages jobs.

## 7) Quick validation checklist

After saving variables, push one commit to `main` and confirm:

1. `verify` passes.
2. `deploy_api_production` runs automatically.
3. Job log shows successful ssh, rsync, prisma steps, and health check.
4. `https://api.phulpur.net/api/health` returns `ok:true`.
5. `restart_api_production` manual job succeeds when triggered.
