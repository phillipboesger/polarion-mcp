import test from "node:test"
import assert from "node:assert/strict"
import { AxiosError } from "axios"
import type { AxiosRequestConfig, AxiosResponse } from "axios"
import {
  checkWorkItemEnumFields,
  checkWorkItemsEnumFields,
  checkResourceCustomFieldKeys,
  checkWorkItemUserReferences,
  splitWorkItemId,
  _optionsCache,
  _fieldKeyCache,
  _userExistsCache,
} from "../src/guards.js"
import type { CustomFieldKeyCheckTarget } from "../src/guards.js"
import { requestBearerToken } from "../src/config.js"

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
// checkResourceCustomFieldKeys
// ---------------------------------------------------------------------------

// Real shape (confirmed live against a stock Polarion 2606 instance):
// {data: {attributes: {fieldId: {label, type}, ...}}} -- an object keyed by
// field id, NOT a JSON:API list of {id, ...} entries.
function fieldsMetadataResponse(ids: string[]): AxiosResponse {
  const attributes = Object.fromEntries(ids.map((id) => [id, { label: id, type: { kind: "string" } }]))
  return { data: { data: { attributes } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
}

/** A create-mode (project- and type-scoped) Work Item target, for terseness across tests. */
function wiCreateTarget(attributes: Record<string, unknown>, type = "task"): CustomFieldKeyCheckTarget {
  return { resourceType: "workitems", projectId: "PROJ", type, attributes, scopeLabel: `a new '${type}' Work Item in PROJ` }
}

test("checkResourceCustomFieldKeys skips validation when every attribute key is standard", async () => {
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("should not be called -- no custom keys present")
  }
  const result = await checkResourceCustomFieldKeys(wiCreateTarget({ title: "hi", status: "open" }), requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

test("checkResourceCustomFieldKeys accepts a custom key present in the fetched metadata (create, type-scoped lookup)", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (config: AxiosRequestConfig) => {
    assert.equal((config.params as any)?.resourceType, "workitems")
    assert.equal((config.params as any)?.targetType, "task")
    return fieldsMetadataResponse(["myCustomField", "anotherField"])
  }
  const result = await checkResourceCustomFieldKeys(wiCreateTarget({ title: "hi", myCustomField: "value" }), requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

test("checkResourceCustomFieldKeys rejects an unknown custom key, listing the known ones", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (): Promise<AxiosResponse> => fieldsMetadataResponse(["realField"])
  const result = await checkResourceCustomFieldKeys(wiCreateTarget({ bogusField: "x" }), requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.reason, /Unknown field key\(s\) bogusField/)
    assert.match(result.reason, /realField/)
  }
})

test("checkResourceCustomFieldKeys's rejection message lists only real custom fields, not OOTB ones like title/status", async () => {
  _fieldKeyCache.clear()
  const liveResponseData = {
    data: {
      attributes: {
        type: { label: "Type" },
        title: { label: "Title" },
        status: { label: "Status" },
        myCustomField: { label: "My Custom Field", type: { kind: "string" } },
      },
    },
  }
  const httpClient = async (): Promise<AxiosResponse> =>
    ({ data: liveResponseData, status: 200, statusText: "OK", headers: {}, config: {} as any })
  const result = await checkResourceCustomFieldKeys(wiCreateTarget({ bogusField: "x" }), requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.reason, /Known custom fields: myCustomField/)
    assert.doesNotMatch(result.reason, /\btitle\b/, "OOTB fields must not be listed as if they were custom fields")
    assert.doesNotMatch(result.reason, /\bstatus\b/)
  }
})

test("checkResourceCustomFieldKeys fails closed when the metadata lookup errors", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("network unreachable")
  }
  const result = await checkResourceCustomFieldKeys(wiCreateTarget({ customKey: "x" }), requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.reason, /network unreachable/)
})

test("checkResourceCustomFieldKeys fails closed when the metadata response is empty (can't verify anything)", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (): Promise<AxiosResponse> => fieldsMetadataResponse([])
  const result = await checkResourceCustomFieldKeys(wiCreateTarget({ customKey: "x" }), requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
})

test("checkResourceCustomFieldKeys fails closed on the OLD, wrong getAvailableOptions-style list shape ({data:[{id}]}), not just the real object shape", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (): Promise<AxiosResponse> =>
    ({ data: { data: [{ id: "realField" }] }, status: 200, statusText: "OK", headers: {}, config: {} as any })
  const result = await checkResourceCustomFieldKeys(wiCreateTarget({ customKey: "x" }), requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false, "the list shape must not be silently accepted as if it were the real object-map shape")
})

test("checkResourceCustomFieldKeys fails closed when attributes is missing or null in the response", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (): Promise<AxiosResponse> =>
    ({ data: { data: { attributes: null } }, status: 200, statusText: "OK", headers: {}, config: {} as any })
  const result = await checkResourceCustomFieldKeys(wiCreateTarget({ customKey: "x" }), requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
})

test("checkResourceCustomFieldKeys caches the field list per (project, resourceType, type)", async () => {
  _fieldKeyCache.clear()
  let calls = 0
  const httpClient = async (): Promise<AxiosResponse> => {
    calls++
    return fieldsMetadataResponse(["fieldA"])
  }
  await checkResourceCustomFieldKeys(wiCreateTarget({ fieldA: "1" }), requestContext, { ...sendOpts, httpClient })
  await checkResourceCustomFieldKeys(wiCreateTarget({ fieldA: "2" }), requestContext, { ...sendOpts, httpClient })
  assert.equal(calls, 1, "second call for the same (project, resourceType, type) should reuse the cache")
})

test("checkResourceCustomFieldKeys accepts a real registered custom field against the ACTUAL live Polarion getFieldsMetadata response shape (Work Item create)", async () => {
  // Captured live from a stock Polarion 2606 instance -- an object keyed by
  // field id under `attributes`, not a JSON:API {data:[{id}]} list. Before
  // the extractFieldIds fix, this exact response made the guard treat every
  // field as unknown and refuse ANY custom field on Work Item creation, even
  // a real, correctly-configured one.
  _fieldKeyCache.clear()
  const liveResponseData = {
    links: { self: "http://localhost/polarion/rest/v1/projects/drivepilot/actions/getFieldsMetadata?resourceType=workitems&targetType=task" },
    data: {
      attributes: {
        type: { label: "Type", required: true, type: { kind: "enumeration", enumName: "work-item-type" } },
        severity: { label: "Severity", required: true, type: { kind: "enumeration", enumName: "severity" } },
        myCustomField: { label: "My Custom Field", type: { kind: "string" } },
        title: { label: "Title", type: { kind: "string" } },
        status: { label: "Status", required: true, type: { kind: "enumeration", enumName: "status" } },
      },
      relationships: {},
    },
  }
  const httpClient = async (): Promise<AxiosResponse> =>
    ({ data: liveResponseData, status: 200, statusText: "OK", headers: {}, config: {} as any })

  const result = await checkResourceCustomFieldKeys(
    { resourceType: "workitems", projectId: "drivepilot", type: "task", attributes: { title: "hi", myCustomField: "value" }, scopeLabel: "a new 'task' Work Item in drivepilot" },
    requestContext,
    { ...sendOpts, httpClient }
  )
  assert.deepEqual(result, { ok: true })
})

// -- update (instance-scoped) lookup mode: this is the new coverage this session added. --

test("checkResourceCustomFieldKeys accepts a custom key on UPDATE via the instance-scoped lookup (no type needed at all)", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    assert.equal(String(config.url), "https://polarion.example.com/polarion/rest/v1/projects/PROJ/workitems/PROJ-1/actions/getFieldsMetadata")
    assert.equal(config.params, undefined, "instance-scoped lookup needs no resourceType/targetType params")
    return fieldsMetadataResponse(["myCustomField"])
  }
  const target: CustomFieldKeyCheckTarget = {
    resourceType: "workitems",
    instancePath: "/projects/PROJ/workitems/PROJ-1",
    attributes: { title: "hi", myCustomField: "value" },
    scopeLabel: "Work Item '/projects/PROJ/workitems/PROJ-1'",
  }
  const result = await checkResourceCustomFieldKeys(target, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

test("checkResourceCustomFieldKeys rejects an unknown key on UPDATE via the instance-scoped lookup", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (): Promise<AxiosResponse> => fieldsMetadataResponse(["realField"])
  const target: CustomFieldKeyCheckTarget = {
    resourceType: "workitems",
    instancePath: "/projects/PROJ/workitems/PROJ-1",
    attributes: { bogusField: "x" },
    scopeLabel: "Work Item '/projects/PROJ/workitems/PROJ-1'",
  }
  const result = await checkResourceCustomFieldKeys(target, requestContext, { ...sendOpts, httpClient })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.reason, /Unknown field key\(s\) bogusField/)
})

// -- non-Work-Item resource types: this session's extension. Cover one typed resource
// (Document, has an attributes.type concept) and one typeless one (Plan, no type at all). --

test("checkResourceCustomFieldKeys works for a Document create (typed resource, project- and type-scoped)", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    assert.equal((config.params as any)?.resourceType, "documents")
    assert.equal((config.params as any)?.targetType, "generic")
    return fieldsMetadataResponse(["docCustomField"])
  }
  const target: CustomFieldKeyCheckTarget = {
    resourceType: "documents",
    projectId: "PROJ",
    type: "generic",
    attributes: { title: "hi", docCustomField: "value" },
    scopeLabel: "a new 'generic' Document in PROJ",
  }
  const result = await checkResourceCustomFieldKeys(target, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

test("checkResourceCustomFieldKeys works for a Plan create (typeless resource -- targetType omitted as '~')", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    assert.equal((config.params as any)?.resourceType, "plans")
    assert.equal((config.params as any)?.targetType, "~", "a typeless resource's create lookup still needs a targetType param -- '~' means none")
    return fieldsMetadataResponse(["planCustomField"])
  }
  const target: CustomFieldKeyCheckTarget = {
    resourceType: "plans",
    projectId: "PROJ",
    attributes: { name: "hi", planCustomField: "value" },
    scopeLabel: "a new Plan in PROJ",
  }
  const result = await checkResourceCustomFieldKeys(target, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
})

test("checkResourceCustomFieldKeys works for a Plan UPDATE (typeless resource, instance-scoped -- same mechanism as Work Item update)", async () => {
  _fieldKeyCache.clear()
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    assert.equal(String(config.url), "https://polarion.example.com/polarion/rest/v1/projects/PROJ/plans/MyPlan/actions/getFieldsMetadata")
    return fieldsMetadataResponse(["planCustomField"])
  }
  const target: CustomFieldKeyCheckTarget = {
    resourceType: "plans",
    instancePath: "/projects/PROJ/plans/MyPlan",
    attributes: { name: "hi", planCustomField: "value" },
    scopeLabel: "Plan '/projects/PROJ/plans/MyPlan'",
  }
  const result = await checkResourceCustomFieldKeys(target, requestContext, { ...sendOpts, httpClient })
  assert.deepEqual(result, { ok: true })
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

test("the options cache is not shared between two callers, so one user's authorized options never answer another user's write", async () => {
  _optionsCache.clear()
  const seenTokens: string[] = []
  const httpClient = async (): Promise<AxiosResponse> => {
    seenTokens.push(requestBearerToken.getStore() ?? "none")
    return optionsResponse(["accepted"])
  }

  await requestBearerToken.run("pat-of-alice", async () => {
    await checkWorkItemEnumFields("PROJ", "PROJ-9", { resolution: "accepted" }, requestContext, { ...sendOpts, httpClient }, 60_000)
  })
  await requestBearerToken.run("pat-of-bob", async () => {
    await checkWorkItemEnumFields("PROJ", "PROJ-9", { resolution: "accepted" }, requestContext, { ...sendOpts, httpClient }, 60_000)
  })

  assert.deepEqual(seenTokens, ["pat-of-alice", "pat-of-bob"], "Bob's write must be validated against Polarion with Bob's own token, not served from Alice's cached entry")
})
