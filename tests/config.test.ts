import test from "node:test"
import assert from "node:assert/strict"

const CONFIG_MODULE_URL = new URL("../src/config.js", import.meta.url)

function setEnv(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const previous: NodeJS.ProcessEnv = {}

  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key]
    if (typeof value === "undefined") {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return previous
}

function restoreEnv(previous: NodeJS.ProcessEnv): void {
  for (const [key, value] of Object.entries(previous)) {
    if (typeof value === "undefined") {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

async function importFreshConfig(label: string) {
  return import(`${CONFIG_MODULE_URL.href}?case=${label}-${Date.now()}`)
}

test("config defaults use the bundled API base URL and enabled TLS verification", async () => {
  const previous = setEnv({
    API_BASE_URL: "",
    BEARER_TOKEN: "",
    NODE_TLS_REJECT_UNAUTHORIZED: "1",
  })

  try {
    const config = await importFreshConfig("defaults")
    assert.equal(config.API_BASE_URL, "https://polarion.example.com/polarion/rest/v1")
    assert.equal(config.getBearerToken(), "")
    assert.equal(config.shouldRejectUnauthorized(), true)
    assert.equal(config.getPolarionBaseUrl(), "https://polarion.example.com/polarion")
  } finally {
    restoreEnv(previous)
  }
})

test("config reads explicit bearer token and trims rest path for the Polarion base URL", async () => {
  const previous = setEnv({
    API_BASE_URL: "https://polarion.example.com/polarion/rest/v1/",
    BEARER_TOKEN: "secret-token",
    NODE_TLS_REJECT_UNAUTHORIZED: "0",
  })

  try {
    const config = await importFreshConfig("overrides")
    assert.equal(config.getBearerToken(), "secret-token")
    assert.equal(config.shouldRejectUnauthorized(), false)
    assert.equal(config.getPolarionBaseUrl(), "https://polarion.example.com/polarion")
  } finally {
    restoreEnv(previous)
  }
})
