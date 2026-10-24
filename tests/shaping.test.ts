import test from "node:test";
import assert from "node:assert/strict";
import { toolDefinitionMap } from "../src/tools.js";
import { CONCISE_DEFAULT_FIELDS, conciseDefaultFields, shapeConciseResponse } from "../src/shaping.js";

test("concise shaping removes rich-text HTML and nested JSON:API noise but keeps pagination metadata", () => {
  const input = {
    links: { self: "/items?page=1", next: "/items?page=2", last: "/items?page=9" },
    meta: { totalCount: 42, traceId: "private-noise" },
    data: [{ id: "WI-1", links: { self: "/items/WI-1" }, meta: { count: 1 }, attributes: {
      description: { type: "text/html", value: "<p>Hello</p>", value_markdown: "Hello" },
      title: { type: "text/plain", value: "Keep this" },
    } }],
  };
  assert.deepEqual(shapeConciseResponse(input), {
    links: { next: "/items?page=2" }, meta: { totalCount: 42 },
    data: [{ id: "WI-1", attributes: { description: { type: "text/html", value_markdown: "Hello" }, title: { type: "text/plain", value: "Keep this" } } }],
  });
});

test("concise shaping preserves nulls, primitives, arrays, and ordinary resource attributes", () => {
  assert.deepEqual(shapeConciseResponse([null, 1, "x", { id: "A", attributes: { active: true } }]), [null, 1, "x", { id: "A", attributes: { active: true } }]);
});

test("concise defaults are copied and limited to the curated large-list tools", () => {
  assert.deepEqual(conciseDefaultFields("getWorkItems"), CONCISE_DEFAULT_FIELDS.getWorkItems);
  const copied = conciseDefaultFields("getWorkItems");
  assert.ok(copied);
  copied.workitems = "id";
  assert.notEqual(CONCISE_DEFAULT_FIELDS.getWorkItems?.workitems, "id");
  assert.equal(conciseDefaultFields("getWorkItem"), undefined);
});

test("all generated GET tools advertise response_format with a detailed default", () => {
  const gets = [...toolDefinitionMap.values()].filter((tool) => tool.method.toLowerCase() === "get");
  assert.ok(gets.length > 0);
  for (const tool of gets) {
    assert.deepEqual(tool.inputSchema.properties?.response_format, {
      type: "string", enum: ["concise", "detailed"], default: "detailed",
      description: "Response detail level. concise removes redundant HTML and JSON:API metadata and may use a small default fieldset on large lists; detailed preserves the complete response. Defaults to detailed.",
    }, tool.name);
  }
});

