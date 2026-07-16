import test from "node:test"
import assert from "node:assert/strict"
import { renderRichTextFieldsAsMarkdown } from "../src/markdown.js"

test("renderRichTextFieldsAsMarkdown adds value_markdown next to a text/html field, leaving value untouched", () => {
  const input = { description: { type: "text/html", value: "<p>Hello <strong>world</strong></p>" } }
  const result = renderRichTextFieldsAsMarkdown(input) as any

  assert.equal(result.description.type, "text/html")
  assert.equal(result.description.value, "<p>Hello <strong>world</strong></p>", "original value must be byte-identical")
  assert.match(result.description.value_markdown, /Hello \*\*world\*\*/)
})

test("renderRichTextFieldsAsMarkdown leaves text/plain fields untouched (no value_markdown added)", () => {
  const input = { comment: { type: "text/plain", value: "just plain text" } }
  const result = renderRichTextFieldsAsMarkdown(input) as any

  assert.deepEqual(result.comment, { type: "text/plain", value: "just plain text" })
  assert.equal("value_markdown" in result.comment, false)
})

test("renderRichTextFieldsAsMarkdown walks nested objects and arrays (JSON:API data[] shape)", () => {
  const input = {
    data: [
      { type: "workitems", id: "A-1", attributes: { title: "One", description: { type: "text/html", value: "<em>a</em>" } } },
      { type: "workitems", id: "A-2", attributes: { title: "Two" } },
    ],
    meta: { totalCount: 2 },
  }
  const result = renderRichTextFieldsAsMarkdown(input) as any

  assert.match(result.data[0].attributes.description.value_markdown, /_a_/, "turndown's default emphasis marker is underscore")
  assert.equal(result.data[1].attributes.title, "Two", "items with no rich-text fields pass through unchanged")
  assert.equal(result.meta.totalCount, 2)
})

test("renderRichTextFieldsAsMarkdown passes through primitives, null, and non-rich-text objects unchanged", () => {
  assert.equal(renderRichTextFieldsAsMarkdown("plain string"), "plain string")
  assert.equal(renderRichTextFieldsAsMarkdown(42), 42)
  assert.equal(renderRichTextFieldsAsMarkdown(null), null)
  assert.deepEqual(renderRichTextFieldsAsMarkdown({ id: "A-1", type: "workitems" }), { id: "A-1", type: "workitems" })
})

test("renderRichTextFieldsAsMarkdown does not crash on malformed HTML -- returns the field unchanged", () => {
  const input = { description: { type: "text/html", value: "<div><span>unclosed" } }
  assert.doesNotThrow(() => renderRichTextFieldsAsMarkdown(input))
})
