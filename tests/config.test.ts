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

test("config drops trailing slashes and whitespace from API_BASE_URL, so requests never go to //projects", async () => {
  const previous = setEnv({ API_BASE_URL: "  https://polarion.example.com/polarion/rest/v1//  " })
  try {
    const config = await importFreshConfig("trailing-slash")
    assert.equal(config.API_BASE_URL, "https://polarion.example.com/polarion/rest/v1")
  } finally {
    restoreEnv(previous)
  }
})

test("configuredToolsets defaults to all and validates the deployment allowlist", async () => {
  const { configuredToolsets } = await importFreshConfig("toolsets")
  assert.equal(configuredToolsets({}), undefined)
  assert.deepEqual(configuredToolsets({ MCP_TOOLSETS: "work-items, documents,work-items" }), ["work-items", "documents"])
  assert.throws(() => configuredToolsets({ MCP_TOOLSETS: "work-itemz" }), /Unknown toolset.*Valid toolsets/)
  assert.throws(() => configuredToolsets({ MCP_TOOLSETS: "," }), /lists no toolsets/)
})

test("configurationWarnings tells a stdio user what is missing, and an HTTP deployment only about the base URL", async () => {
  const { configurationWarnings } = await importFreshConfig("warnings")
  const none = configurationWarnings({ API_BASE_URL: "https://polarion.test/polarion/rest/v1", BEARER_TOKEN: "pat" }, { needsToken: true })
  assert.deepEqual(none, [])

  const both = configurationWarnings({}, { needsToken: true })
  assert.equal(both.length, 2)
  assert.match(both.join("\n"), /API_BASE_URL/)
  assert.match(both.join("\n"), /BEARER_TOKEN/)

  // Whitespace is not a value, like everywhere else the variables are read.
  assert.equal(configurationWarnings({ API_BASE_URL: "  ", BEARER_TOKEN: " " }, { needsToken: true }).length, 2)

  // Over HTTP every client sends its own token: its absence is normal.
  const http = configurationWarnings({ API_BASE_URL: "" }, { needsToken: false })
  assert.equal(http.length, 1)
  assert.match(http[0], /API_BASE_URL/)
})
