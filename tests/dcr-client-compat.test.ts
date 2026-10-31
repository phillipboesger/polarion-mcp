import test from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { createHash, randomBytes } from "node:crypto"

import { createMcpHttpApp } from "../src/mcp-http-server.js"

const VALID_PAT = "a-real-looking-polarion-pat"
const SECRET = randomBytes(32).toString("base64url")

async function startApp(options: { allowedRedirectUris?: string[]; allowedRedirectPresets?: string[] }) {
  const { app, closeAllSessions } = createMcpHttpApp({
    publicUrl: new URL("http://127.0.0.1"),
    tokenSecret: SECRET,
    validateToken: async (token) => token === VALID_PAT,
    ...options,
  })
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  const { port } = server.address() as AddressInfo
  return {
    base: `http://127.0.0.1:${port}`,
    stop: async () => {
      await closeAllSessions()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

/** Mirrors what a hosted client does: register itself, log in with a PAT, redeem the code. */
async function connect(base: string, redirectUri: string, method: string, tokenAuth: (id: string, secret?: string) => { headers: Record<string, string>; body: Record<string, string> }) {
  const registration = await fetch(`${base}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_name: "Hosted client", redirect_uris: [redirectUri], token_endpoint_auth_method: method, grant_types: ["authorization_code", "refresh_token"] }),
  })
  assert.equal(registration.status, 201, await registration.clone().text())
  const client = (await registration.json()) as { client_id: string; client_secret?: string }

  const verifier = randomBytes(32).toString("base64url")
  const authorize = new URL(`${base}/authorize`)
  authorize.searchParams.set("response_type", "code")
  authorize.searchParams.set("client_id", client.client_id)
  authorize.searchParams.set("redirect_uri", redirectUri)
  authorize.searchParams.set("code_challenge", createHash("sha256").update(verifier).digest("base64url"))
  authorize.searchParams.set("code_challenge_method", "S256")
  authorize.searchParams.set("state", "s")
  const page = await fetch(authorize, { redirect: "manual" })
  assert.equal(page.status, 200)
  const loginId = /name="login_id" value="([^"]+)"/.exec(await page.text())?.[1] as string
  const submitted = await fetch(`${base}/polarion-login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ login_id: loginId, token: VALID_PAT }),
    redirect: "manual",
  })
  assert.equal(submitted.status, 302)
  const code = new URL(submitted.headers.get("location") as string).searchParams.get("code") as string
  const auth = tokenAuth(client.client_id, client.client_secret)
  const tokenRes = await fetch(`${base}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...auth.headers },
    body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri, ...auth.body }),
  })
  return { client, tokenRes }
}

const TEAMS = "https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect"

test("Microsoft 365 Copilot: DCR with client_secret_post issues a secret and the code exchange works under the m365 preset", async () => {
  const { base, stop } = await startApp({ allowedRedirectPresets: ["m365"] })
  try {
    const { client, tokenRes } = await connect(base, TEAMS, "client_secret_post", (id, secret) => ({ headers: {}, body: { client_id: id, client_secret: secret as string } }))
    assert.ok(client.client_secret, "a confidential client must receive a secret")
    assert.equal(tokenRes.status, 200, await tokenRes.clone().text())
  } finally {
    await stop()
  }
})

test("Microsoft 365 Copilot: a wrong client secret is rejected", async () => {
  const { base, stop } = await startApp({ allowedRedirectPresets: ["m365"] })
  try {
    const { tokenRes } = await connect(base, TEAMS, "client_secret_post", (id) => ({ headers: {}, body: { client_id: id, client_secret: "wrong" } }))
    assert.notEqual(tokenRes.status, 200)
  } finally {
    await stop()
  }
})

test("Le Chat style client: secret sent in the Basic header (client_secret_basic) is accepted", async () => {
  const callback = "https://chat.example.test/connectors/callback"
  const { base, stop } = await startApp({ allowedRedirectUris: [callback] })
  try {
    const { tokenRes } = await connect(base, callback, "client_secret_basic", (id, secret) => ({
      headers: { authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}` },
      body: {},
    }))
    assert.equal(tokenRes.status, 200, await tokenRes.clone().text())
  } finally {
    await stop()
  }
})

test("Le Chat style client: registering as a public client (auth method none) works without any secret", async () => {
  const callback = "https://chat.example.test/connectors/callback"
  const { base, stop } = await startApp({ allowedRedirectUris: [callback] })
  try {
    const { client, tokenRes } = await connect(base, callback, "none", (id) => ({ headers: {}, body: { client_id: id } }))
    assert.equal(client.client_secret, undefined)
    assert.equal(tokenRes.status, 200, await tokenRes.clone().text())
  } finally {
    await stop()
  }
})

test("Le Chat style client: a callback outside the allowlist cannot register", async () => {
  const { base, stop } = await startApp({ allowedRedirectUris: ["https://chat.example.test/connectors/callback"] })
  try {
    const res = await fetch(`${base}/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_name: "x", redirect_uris: ["https://attacker.example/callback"], token_endpoint_auth_method: "client_secret_post" }),
    })
    assert.equal(res.status, 400)
  } finally {
    await stop()
  }
})

test("a public client that sends an empty client_secret field still exchanges its code", async () => {
  const callback = "https://chat.example.test/connectors/callback"
  const { base, stop } = await startApp({ allowedRedirectUris: [callback] })
  try {
    const { tokenRes } = await connect(base, callback, "none", (id) => ({ headers: {}, body: { client_id: id, client_secret: "" } }))
    assert.equal(tokenRes.status, 200, await tokenRes.clone().text())
  } finally {
    await stop()
  }
})
