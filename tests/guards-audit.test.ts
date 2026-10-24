import test from "node:test"
import assert from "node:assert/strict"
import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios"

import {
  checkWorkItemEnumFields,
  checkWorkItemsEnumFields,
  checkWorkItemUserReferences,
  invalidateWorkItemOptions,
  MAX_CACHE_ENTRIES,
  _optionsCache,
  _userExistsCache,
} from "../src/guards.js"

const ctx = { baseUrl: "https://polarion.example.com/polarion/rest/v1", headers: {}, rejectUnauthorized: true }
const fast = { minIntervalMs: 0, initialBackoffMs: 0, postMutationDelayMs: 0 }
const ok = (data: unknown): AxiosResponse => ({ data, status: 200, statusText: "OK", headers: {}, config: {} as any })
const notFound = () => new AxiosError("404", "ERR", undefined, undefined, { status: 404, statusText: "Not Found", headers: {}, config: {} as any, data: {} })
const assignee = (id: string) => ({ assignee: { data: [{ type: "users", id }] } })

test("enum options on a later page are accepted, not refused", async () => {
  _optionsCache.clear()
  const pages: Record<string, unknown> = {
    "1": { data: [{ id: "open" }], links: { next: "https://polarion.example.com/next" } },
    "2": { data: [{ id: "closed" }] },
  }
  const requested: unknown[] = []
  const httpClient = async (c: AxiosRequestConfig) => {
    const page = String((c.params as Record<string, unknown> | undefined)?.["page[number]"] ?? "1")
    requested.push(page)
    return ok(pages[page])
  }
  const result = await checkWorkItemEnumFields("P", "P-1", { status: "closed" }, ctx, { ...fast, httpClient })
  assert.deepEqual(result, { ok: true })
  assert.deepEqual(requested, ["1", "2"])
})

test("type change validates status against the new type and requests 100 options per page", async () => {
  _optionsCache.clear()
  let requested: AxiosRequestConfig | undefined
  const result = await checkWorkItemsEnumFields([{ projectId: "P", type: "defect", attributes: { status: "closed" } }], ctx, {
    ...fast,
    httpClient: async (config) => {
      requested = config
      return ok({ data: [{ id: "closed" }] })
    },
  })
  assert.deepEqual(result, { ok: true })
  assert.match(String(requested?.url), /workitems\/fields\/status\/actions\/getAvailableOptions$/)
  assert.equal((requested?.params as Record<string, unknown>)?.type, "defect")
  assert.equal((requested?.params as Record<string, unknown>)?.["page[size]"], 100)
})

test("enum guard warns and fails open when the 20 page safety cap is reached", async () => {
  _optionsCache.clear()
  const warnings: string[] = []
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => warnings.push(args.join(" "))
  try {
    const result = await checkWorkItemEnumFields("P", "P-2", { status: "unseen" }, ctx, {
      ...fast,
      httpClient: async (config) => ({ ...ok({ data: [{ id: `option-${(config.params as any)?.["page[number]"]}` }], links: { next: "/next" } }), config } as AxiosResponse),
    })
    assert.deepEqual(result, { ok: true })
    assert.ok(warnings.some((message) => message.includes("20")))
  } finally {
    console.warn = originalWarn
  }
})

test("a missing user is not remembered: once created, the next write is accepted", async () => {
  _userExistsCache.clear()
  let exists = false
  const httpClient = async () => {
    if (!exists) throw notFound()
    return ok({ data: { id: "newbie" } })
  }
  assert.equal((await checkWorkItemUserReferences(assignee("newbie"), ctx, { ...fast, httpClient })).ok, false)
  exists = true
  assert.equal((await checkWorkItemUserReferences(assignee("newbie"), ctx, { ...fast, httpClient })).ok, true)
})

test("guard caches stay bounded on a long-running server", async () => {
  _userExistsCache.clear()
  const httpClient = async () => ok({ data: {} })
  for (let i = 0; i < MAX_CACHE_ENTRIES + 50; i++) {
    await checkWorkItemUserReferences(assignee(`user-${i}`), ctx, { ...fast, httpClient })
  }
  assert.ok(_userExistsCache.size <= MAX_CACHE_ENTRIES, `cache grew to ${_userExistsCache.size}`)
})

test("after a write, the item's cached options are dropped, so the next transition sees the new options", async () => {
  _optionsCache.clear()
  let options = ["draft", "open"]
  const httpClient = async () => ok({ data: options.map((id) => ({ id })) })
  assert.deepEqual(await checkWorkItemEnumFields("P", "P-9", { status: "open" }, ctx, { ...fast, httpClient }), { ok: true })
  options = ["open", "closed"]
  invalidateWorkItemOptions("P", "P-9")
  assert.deepEqual(await checkWorkItemEnumFields("P", "P-9", { status: "closed" }, ctx, { ...fast, httpClient }), { ok: true })
})
