import test from "node:test"
import assert from "node:assert/strict"
import { AxiosError } from "axios"
import type { AxiosRequestConfig, AxiosResponse } from "axios"
import {
  checkWorkItemEnumFields,
  checkWorkItemsEnumFields,
  checkWorkItemCustomFieldKeys,
  checkWorkItemUserReferences,
  splitWorkItemId,
  _optionsCache,
  _fieldKeyCache,
  _userExistsCache,
} from "../src/guards.js"

const requestContext = { baseUrl: "https://polarion.example.com/polarion/rest/v1", headers: {}, rejectUnauthorized: true }
const sendOpts = { minIntervalMs: 0, initialBackoffMs: 0, postMutationDelayMs: 0 }

function optionsResponse(ids: string[]): AxiosResponse {
  return { data: { data: ids.map((id) => ({ id })) }, status: 200, statusText: "OK", headers: {}, config: {} as any }
}

test("checkWorkItemEnumFields skips fields absent from attributes", async () => {
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("should not be called -- no enum fields in attributes")
  }
  const result = await checkWorkItemEnumFields("PROJ", "PROJ-1", { title: "hello" }, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

test("checkWorkItemEnumFields accepts a value present in the fetched options", async () => {
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => optionsResponse(["open", "closed"])
  const result = await checkWorkItemEnumFields("PROJ", "PROJ-2", { status: "open" }, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

test("checkWorkItemEnumFields rejects a value absent from the fetched options, listing valid ones", async () => {
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => optionsResponse(["open", "closed"])
  const result = await checkWorkItemEnumFields("PROJ", "PROJ-3", { status: "bogus" }, requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.reason, /'status' value 'bogus'/)
    assert.match(result.reason, /open/)
    assert.match(result.reason, /closed/)
  }
})

test("checkWorkItemEnumFields fails closed when the options lookup itself errors", async () => {
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("network unreachable")
  }
  const result = await checkWorkItemEnumFields("PROJ", "PROJ-4", { severity: "critical" }, requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.reason, /Refusing the write/)
    assert.match(result.reason, /network unreachable/)
  }
})

test("checkWorkItemEnumFields caches options and does not re-fetch within the TTL", async () => {
  _optionsCache.clear()
  let calls = 0
  const httpClient = async (): Promise<AxiosResponse> => {
    calls++
    return optionsResponse(["accepted", "rejected"])
  }
  const first = await checkWorkItemEnumFields("PROJ", "PROJ-5", { resolution: "accepted" }, requestContext, { ...sendOpts, httpClient }, 60_000)
  const second = await checkWorkItemEnumFields("PROJ", "PROJ-5", { resolution: "rejected" }, requestContext, { ...sendOpts, httpClient }, 60_000)
  assert.deepEqual(first, { ok: true })
  assert.deepEqual(second, { ok: true })
  assert.equal(calls, 1, "second call should reuse the cached options instead of re-fetching")
})

test("checkWorkItemEnumFields re-fetches once the cache TTL has expired", async () => {
  _optionsCache.clear()
  let calls = 0
  const httpClient = async (): Promise<AxiosResponse> => {
    calls++
    return optionsResponse(["a", "b"])
  }
  await checkWorkItemEnumFields("PROJ", "PROJ-6", { priority: "a" }, requestContext, { ...sendOpts, httpClient }, 1)
  await new Promise((r) => setTimeout(r, 10))
  await checkWorkItemEnumFields("PROJ", "PROJ-6", { priority: "b" }, requestContext, { ...sendOpts, httpClient }, 1)
  assert.equal(calls, 2, "expired cache entry should trigger a fresh fetch")
})

test("checkWorkItemEnumFields validates multiple enum fields in one call", async () => {
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.url).includes("/fields/status/")) return optionsResponse(["open"])
    if (String(config.url).includes("/fields/severity/")) return optionsResponse(["critical"])
    throw new Error(`unexpected field lookup: ${config.url}`)
  }
  const ok = await checkWorkItemEnumFields("PROJ", "PROJ-7", { status: "open", severity: "critical" }, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(ok, { ok: true })

  const bad = await checkWorkItemEnumFields("PROJ", "PROJ-8", { status: "open", severity: "minor" }, requestContext, { ...sendOpts, httpClient })
  assert.equal(bad.ok, false)
})

test("splitWorkItemId parses the composite PROJECT/WORKITEMID form", () => {
  assert.deepEqual(splitWorkItemId("PROJ/PROJ-1"), { projectId: "PROJ", workItemId: "PROJ-1" })
})

test("splitWorkItemId falls back to fallbackProjectId when there's no separator", () => {
  assert.deepEqual(splitWorkItemId("PROJ-1", "PROJ"), { projectId: "PROJ", workItemId: "PROJ-1" })
  assert.equal(splitWorkItemId("PROJ-1"), null, "no fallback and no separator -- can't resolve")
})

test("checkWorkItemsEnumFields resolves a new item's options by type (postWorkItems shape)", async () => {
  _optionsCache.clear()
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    assert.doesNotMatch(String(config.url), /\/workitems\/[^/]+\/fields\//, "type-scoped lookup must not include a workItemId segment")
    assert.equal((config.params as any)?.type, "defect")
    return optionsResponse(["new", "in_progress"])
  }
  const ok = await checkWorkItemsEnumFields([{ projectId: "PROJ", type: "defect", attributes: { status: "new" } }], requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(ok, { ok: true })
})

test("checkWorkItemsEnumFields validates multiple bulk targets and stops at the first failure", async () => {
  _optionsCache.clear()
  let calls = 0
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => {
    calls++
    return optionsResponse(["open", "closed"])
  }
  const targets = [
    { projectId: "PROJ", workItemId: "PROJ-10", attributes: { status: "open" } },
    { projectId: "PROJ", workItemId: "PROJ-11", attributes: { status: "bogus" } },
    { projectId: "PROJ", workItemId: "PROJ-12", attributes: { status: "closed" } },
  ]
  const result = await checkWorkItemsEnumFields(targets, requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.reason, /PROJ-11/)
  assert.equal(calls, 2, "should stop after the second target fails, never checking the third")
})

test("checkWorkItemsEnumFields with an empty target list is a no-op success", async () => {
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("should not be called")
  }
  const result = await checkWorkItemsEnumFields([], requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

// ---------------------------------------------------------------------------
// checkWorkItemCustomFieldKeys
// ---------------------------------------------------------------------------

function fieldsMetadataResponse(ids: string[]): AxiosResponse {
  return { data: { data: ids.map((id) => ({ id })) }, status: 200, statusText: "OK", headers: {}, config: {} as any }
}

test("checkWorkItemCustomFieldKeys skips validation when every attribute key is standard", async () => {
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("should not be called -- no custom keys present")
  }
  const result = await checkWorkItemCustomFieldKeys("PROJ", "task", { title: "hi", status: "open" }, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

test("checkWorkItemCustomFieldKeys accepts a custom key present in the fetched metadata", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (config: AxiosRequestConfig) => {
    assert.equal((config.params as any)?.resourceType, "workitems")
    assert.equal((config.params as any)?.targetType, "task")
    return fieldsMetadataResponse(["myCustomField", "anotherField"])
  }
  const result = await checkWorkItemCustomFieldKeys("PROJ", "task", { title: "hi", myCustomField: "value" }, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

test("checkWorkItemCustomFieldKeys rejects an unknown custom key, listing the known ones", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (): Promise<AxiosResponse> => fieldsMetadataResponse(["realField"])
  const result = await checkWorkItemCustomFieldKeys("PROJ", "task", { bogusField: "x" }, requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.reason, /Unknown field key\(s\) bogusField/)
    assert.match(result.reason, /realField/)
  }
})

test("checkWorkItemCustomFieldKeys fails closed when the metadata lookup errors", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("network unreachable")
  }
  const result = await checkWorkItemCustomFieldKeys("PROJ", "task", { customKey: "x" }, requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.reason, /network unreachable/)
})

test("checkWorkItemCustomFieldKeys fails closed when the metadata response is empty (can't verify anything)", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (): Promise<AxiosResponse> => fieldsMetadataResponse([])
  const result = await checkWorkItemCustomFieldKeys("PROJ", "task", { customKey: "x" }, requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
})

test("checkWorkItemCustomFieldKeys caches the field list per (project, type)", async () => {
  _fieldKeyCache.clear()
  let calls = 0
  const httpClient = async (): Promise<AxiosResponse> => {
    calls++
    return fieldsMetadataResponse(["fieldA"])
  }
  await checkWorkItemCustomFieldKeys("PROJ", "task", { fieldA: "1" }, requestContext, { ...sendOpts, httpClient })
  await checkWorkItemCustomFieldKeys("PROJ", "task", { fieldA: "2" }, requestContext, { ...sendOpts, httpClient })
  assert.equal(calls, 1, "second call for the same (project, type) should reuse the cache")
})

// ---------------------------------------------------------------------------
// checkWorkItemUserReferences
// ---------------------------------------------------------------------------

test("checkWorkItemUserReferences is a no-op when relationships is absent or has no user refs", async () => {
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("should not be called")
  }
  assert.deepEqual(await checkWorkItemUserReferences(undefined, requestContext, { ...sendOpts, httpClient }), { ok: true })
  assert.deepEqual(await checkWorkItemUserReferences({ categories: { data: [] } }, requestContext, { ...sendOpts, httpClient }), { ok: true })
})

test("checkWorkItemUserReferences accepts assignee/votes/watches users that exist", async () => {
  _userExistsCache.clear()
  const seen: string[] = []
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    seen.push(String(config.url))
    return { data: { data: { type: "users", id: "alice" } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
  }
  const relationships = {
    assignee: { data: [{ type: "users", id: "alice" }] },
    votes: { data: [{ type: "users", id: "alice" }] }, // same user -- should be deduped, only 1 lookup
    watches: { data: { type: "users", id: "alice" } }, // single object form, not array
  }
  const result = await checkWorkItemUserReferences(relationships, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
  assert.equal(seen.length, 1, "the same user id across assignee/votes/watches should only be looked up once")
})

test("checkWorkItemUserReferences rejects a 404'd (nonexistent) user with a specific message", async () => {
  _userExistsCache.clear()
  const httpClient = async (): Promise<AxiosResponse> => {
    const config = { headers: {} } as any
    const response: AxiosResponse = { data: {}, status: 404, statusText: "Not Found", headers: {}, config }
    throw new AxiosError("Not Found", "404", config, undefined, response)
  }
  const result = await checkWorkItemUserReferences({ assignee: { data: [{ type: "users", id: "ghost" }] } }, requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.reason, /User 'ghost' does not exist/)
})

test("checkWorkItemUserReferences fails closed on a non-404 lookup error", async () => {
  _userExistsCache.clear()
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("network unreachable")
  }
  const result = await checkWorkItemUserReferences({ assignee: { data: [{ type: "users", id: "bob" }] } }, requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.reason, /Cannot confirm/)
    assert.match(result.reason, /network unreachable/)
  }
})
