# Live tests against a real Polarion

`npm test` stubs Polarion. That is fast, but it cannot show what Polarion really answers: whether `null` clears a field, how paging parameters are read, what a `204` looks like to the MCP client. The live suite (`tests/live/`) starts the built server against a real Polarion and checks exactly those things:

- every read-only tool that can be called without extra setup, through the MCP client (a result the client rejects, for example because of its `outputSchema`, fails the test)
- paging, unknown arguments, path segments `.` and `..`
- a work item from creation to deletion, including `204` answers, `dry_run` and `null` clearing a field
- the Streamable HTTP server: a made-up token is refused, a real one opens a session, the full OAuth login with PKCE and code replay

## In CI

`.github/workflows/live-polarion.yml` starts `ghcr.io/phillipboesger/polarion-docker` (2506 and 2606), activates the 30-day trial, creates a personal access token through the web UI and runs the suite. It runs on pull requests and pushes that touch the server, weekly on Mondays, and on demand. A run takes about 10 minutes, almost all of it Polarion booting.

The image is private. The package lists this repository under "Manage Actions access", so the workflow's own `GITHUB_TOKEN` can pull it and no stored secret is needed. Pull requests from forks and from Dependabot do not get that access and skip the job.

## Locally

```bash
docker run -d --name polarion-live --platform linux/amd64 -p 8097:80 \
  -e JAVA_OPTS="-Xmx3g -Xms1g" --memory=4g ghcr.io/phillipboesger/polarion-docker:v2606
# wait until http://localhost:8097/polarion/ answers 200, then:
curl -X POST http://localhost:8097/polarion/activate/entry \
  -H "Content-Type: application/x-www-form-urlencoded" --data "trial=true"

# Playwright is not a dependency of this package
mkdir /tmp/pat && cp scripts/live/create-pat.mjs /tmp/pat/ && cd /tmp/pat \
  && npm init -y && npm install playwright@1.52.0 && npx playwright install chromium
export LIVE_PAT=$(POLARION_URL=http://localhost:8097 node create-pat.mjs)

cd -   # back to the repository
npm run build
LIVE_API_BASE_URL=http://localhost:8097/polarion/rest/v1 npm run test:live
```

On Apple Silicon the image runs emulated and needs about 10 minutes to boot.

| Variable | Meaning |
|---|---|
| `LIVE_API_BASE_URL` | REST base URL of the Polarion, required |
| `LIVE_PAT` | personal access token, required |
| `LIVE_PROJECT` | project to work in, default `elibrary` (part of the image) |
| `LIVE_BUILD_DIR` | use another build, for example an older release, to see that the suite can fail |

The suite creates its own work items and deletes them afterwards.
