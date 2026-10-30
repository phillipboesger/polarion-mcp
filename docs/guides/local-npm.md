# Local setup (npm / npx)

Your AI client starts the server on your computer and talks to it over stdio (standard input and output: the client launches the program and exchanges messages through its pipes). Nothing is hosted and no network port opens.

You need three things: Node.js 22 or newer, a Polarion address that has REST enabled, and a Polarion token. The only thing assumed is that your AI client (for example Claude Desktop, Cursor or VS Code) is installed.

## Words used here

- Polarion: the ALM (application lifecycle management) system you want your AI to work with.
- REST: the web interface the server uses to read and write Polarion data.
- PAT (personal access token): a password-like token that lets the server act as you in Polarion.
- Bearer: the word that goes before the token in an `Authorization` header, as in `Authorization: Bearer YOUR_PAT`. Type it as shown.
- curl: a command-line tool that sends web requests. It is included in macOS, Linux and current Windows.
- `YOUR-POLARION` is the host (and port) of your Polarion address, for example `polarion.mycompany.com`, without `https://` and without a path.
- Placeholders: words in capitals such as `YOUR-POLARION`, `YOUR_USERNAME` and `YOUR_PAT` are placeholders. Replace them with your own values, without quotes or brackets.
- Terminal: macOS Terminal, a Linux shell, or Windows PowerShell. Run every command in it.

## Prerequisites

### Step 1: Install Node.js 22 or newer

Node.js runs the server. `npx` (installed with Node.js) downloads and starts it.

1. Download the LTS installer (LTS means long-term support, the stable release) from <https://nodejs.org>.
2. Run the installer.
3. Open a new terminal.
4. Check the version:

```bash
node -v
```

Expected: `v22.` or higher.

If not: an older version prints, or `command not found`. Reinstall from nodejs.org and open a new terminal.

### Step 2: Find your Polarion REST URL

Write down your Polarion address, the one you open in the browser. The REST URL is that address plus `/polarion/rest/v1`. Keep the port if there is one.

Example: `https://polarion.mycompany.com/polarion/rest/v1`

### Step 3: Create a personal access token (PAT)

A PAT is a password-like token that lets the server act as you in Polarion. Polarion enforces your permissions.

1. Open `https://YOUR-POLARION/polarion/#/user_tokens?id=YOUR_USERNAME` in the browser. `YOUR_USERNAME` is the name you log in with. The page is your Personal Access Token section.
2. Enter a name and an expiry date.
3. Click Create Token.
4. Copy the token at once. Polarion shows it only once.

Expected: the token appears on screen. If Create Token is missing, see the note below.

If not: the page says "X-Rest-Token generation is not allowed". Ask your Polarion administrator to add these lines to `polarion.properties` (Polarion's server configuration file) and restart Polarion:

```
com.siemens.polarion.rest.enabled=true
com.siemens.polarion.rest.security.restApiToken.enabled=true
```

### Step 4: Test the URL and the token

Replace `YOUR-POLARION` and `YOUR_PAT`. macOS and Linux (on Windows PowerShell write `curl.exe` instead of `curl`):

```bash
curl -i -H "Authorization: Bearer YOUR_PAT" "https://YOUR-POLARION/polarion/rest/v1/metadata"
```

Expected: `HTTP/1.1 200` and JSON that contains `metadata`. This needs Polarion 2512 or newer.

If not:

| Result | Meaning and fix |
|---|---|
| 401 | The token is wrong, cut off or expired. Create a new one. |
| 403 | Polarion denies access. Check your license and REST permissions. |
| 404 | Wrong URL, or Polarion 2506 or older (no `/metadata`). Fix the URL, or upgrade to 2512+. |
| Timeout or certificate error | Wrong address, VPN needed, or a company certificate. See [Troubleshooting](../troubleshooting.md). |

## Behind a corporate proxy (optional)

If your network reaches Polarion only through a proxy, add `HTTPS_PROXY` (and `NO_PROXY` for hosts that must skip it) to the `env` block of the server entry, next to `API_BASE_URL`:

```json
"HTTPS_PROXY": "http://proxy.company.example:3128",
"NO_PROXY": ".company.example,localhost"
```

Only `https://` Polarion URLs go through the proxy. A proxy that needs a login takes it as `http://user:password@proxy.company.example:3128`. A `407` error means those credentials are wrong; the password never appears in the error.

## Start the server once (optional smoke test)

This shows that `npx` can download and start the server. Your client normally does this for you.

macOS and Linux:

```bash
API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 BEARER_TOKEN=YOUR_PAT npx -y polarion-mcp
```

Windows PowerShell (the command above for macOS and Linux does not work in cmd.exe):

```powershell
$env:API_BASE_URL='https://YOUR-POLARION/polarion/rest/v1'; $env:BEARER_TOKEN='YOUR_PAT'; npx -y polarion-mcp
```

Expected: the terminal stays silent and waits for input. This is normal. Press Ctrl+C to stop it.

If not: an `Unsupported engine` message means Node.js is older than 22. Go back to Step 1.

## Connect your client

1. Open the [guide for your client](../clients.md). It says where the configuration goes.
2. Add this configuration (merge it into existing settings: keep the commas and braces valid):

```json
{
  "mcpServers": {
    "polarion": {
      "command": "npx",
      "args": ["-y", "polarion-mcp"],
      "env": {
        "API_BASE_URL": "https://YOUR-POLARION/polarion/rest/v1",
        "BEARER_TOKEN": "YOUR_PAT"
      }
    }
  }
}
```

3. Save the file.
4. Fully quit and restart the client.

Expected: the client lists a `polarion` server without errors. If not: the JSON is invalid (a missing comma or brace is the usual cause).

Keep the token out of Git. Use `polarion-mcp@latest` in the client config to receive updates, or `polarion-mcp@1.4.5` to pin a version.

## Check that it works

Read-only check, in your client: ask `Which Polarion user am I? Use getCurrentUser.`

Expected: the client calls a Polarion tool and shows your user.

If not: no tool call appears. Restart the client fully and check that the configuration was saved.

## If it fails

| Symptom | Fix |
|---|---|
| Client says Disconnected or Failed to connect | Run the smoke test above in a terminal with the same values. The error it prints is the real one. |
| `npx: command not found` | Node.js is missing, or the client was started before the install. Install Node.js and restart the client. |
| Windows: client cannot start `npx` (or PowerShell blocks `npx.ps1`) | Use `npx.cmd` as the command, or `cmd` with args `["/c", "npx", "-y", "polarion-mcp"]`. |
| 401 or 403 from tools | Repeat Step 4 with the same token. |

More: [Troubleshooting](../troubleshooting.md).
