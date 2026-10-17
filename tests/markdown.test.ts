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

test("malformed HTML still renders, and the original value is kept untouched", () => {
  const result = renderRichTextFieldsAsMarkdown({ description: { type: "text/html", value: "<div><span>unclosed" } }) as any
  assert.equal(result.description.value, "<div><span>unclosed")
  assert.match(result.description.value_markdown, /unclosed/)
})

test("Polarion Work Item cross-references keep their ids in the Markdown", () => {
  const html = 'See <span class="polarion-rte-link" data-type="workItem" data-item-id="WI-42" data-option-id="long"></span> and ' +
    '<span class="polarion-rte-link" data-type="workItem" data-scope="other" data-item-id="OT-7" data-option-id="short"></span>.'
  const result = renderRichTextFieldsAsMarkdown({ description: { type: "text/html", value: html } }) as any
  assert.match(result.description.value_markdown, /See WI-42 and other\/OT-7\./)
})

test("tables keep their rows and columns (kept as HTML inside the Markdown)", () => {
  const html = "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>"
  const md = (renderRichTextFieldsAsMarkdown({ d: { type: "text/html", value: html } }) as any).d.value_markdown as string
  assert.match(md, /<table>/)
  assert.match(md, /<td>1<\/td><td>2<\/td>/)
})

test("very large or deeply nested rich text is not converted, so it cannot block the server", () => {
  const nested = "<div>".repeat(20_000) + "x" + "</div>".repeat(20_000)
  const started = Date.now()
  const result = renderRichTextFieldsAsMarkdown({ d: { type: "text/html", value: nested } }) as any
  assert.ok(Date.now() - started < 1000, `took ${Date.now() - started} ms`)
  assert.equal(result.d.value, nested)
  assert.equal(result.d.value_markdown, undefined)
})
