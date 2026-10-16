import test from "node:test"
import assert from "node:assert/strict"
import type { AxiosRequestConfig, AxiosResponse } from "axios"

import { executeApiTool } from "../src/executor.js"
import { toolDefinitionMap, securitySchemes } from "../src/tools.js"

const FAST = { minIntervalMs: 0, initialBackoffMs: 1, postMutationDelayMs: 0 }

/** Runs a real generated tool against a fake Polarion, returning the result and every request sent. */
async function run(toolName: string, args: Record<string, unknown>, respond?: (c: AxiosRequestConfig) => Partial<AxiosResponse>) {
  const requests: AxiosRequestConfig[] = []
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    requests.push(config)
    const res = respond?.(config) ?? {}
    return { status: 200, statusText: "OK", headers: { "content-type": "application/json" }, data: { data: [] }, config: config as any, ...res } as AxiosResponse
  }
  const result = await executeApiTool(toolName, toolDefinitionMap.get(toolName)!, args, securitySchemes, { httpClient, ...FAST })
  return { result, requests }
}

test("pagination: the advertised page_size_/page_number_ names reach Polarion as page[size]/page[number]", async () => {
  const { requests } = await run("getWorkItems", { projectId: "P", page_size_: 5, page_number_: 2 })
  assert.equal(requests[0].params["page[size]"], 5)
  assert.equal(requests[0].params["page[number]"], 2)
})

test("pagination: the raw bracket names keep working (descriptions mention them)", async () => {
  const { requests } = await run("getWorkItems", { projectId: "P", "page[size]": 3 })
  assert.equal(requests[0].params["page[size]"], 3)
})

test("pagination: a wrong type for page_size_ is rejected, not silently ignored", async () => {
  const { result, requests } = await run("getWorkItems", { projectId: "P", page_size_: "abc" })
  assert.equal(result.isError, true)
  assert.equal(requests.length, 0)
})
