/**
 * Renders Polarion's rich-text fields as Markdown for easier LLM consumption.
 *
 * Polarion represents rich text (Work Item descriptions, Document
 * homePageContent, comment text, ...) as `{type: "text/html"|"text/plain",
 * value: "..."}` throughout the API (confirmed across every resource's
 * generated schema in tools.ts). Dumping the raw HTML forces the model to
 * either parse markup itself or work from an unreadable blob.
 *
 * This walks a parsed JSON response and, for every object matching that
 * shape with `type: "text/html"`, adds a sibling `value_markdown` field
 * with the HTML converted to Markdown -- `value` itself is left completely
 * untouched, so nothing about the original response is lost and a value
 * echoed back into a later write is exactly what Polarion sent.
 */

import TurndownService from 'turndown';

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

/**
 * Replaces Polarion Work Item cross-references with their ids. Such a link is
 * an empty span with the id in data attributes, which turndown drops as a
 * blank element, so the ids vanished from the Markdown.
 *
 * @param html - Rich text from Polarion.
 * @returns The HTML with each cross-reference as plain "[scope/]id" text.
 */
function inlinePolarionLinks(html: string): string {
  return html.replace(/<span\b([^>]*\bpolarion-rte-link\b[^>]*)>\s*<\/span>/gi, (whole, attrs: string) => {
    const attr = (name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];
    const id = attr('data-item-id');
    if (!id) return whole;
    const scope = attr('data-scope');
    return scope ? `${scope}/${id}` : id;
  });
}

// Tables have no lossless plain-Markdown form without a plugin; keep them as HTML.
turndown.keep(['table']);

/**
 * Conversion is synchronous and super-linear in nesting depth (20,000 nested
 * divs took 47 s), so huge or deeply nested values are left unconverted
 * rather than block every request on the server.
 */
const MAX_CONVERTIBLE_LENGTH = 100_000;
const MAX_CONVERTIBLE_BLOCKS = 2_000;

function isConvertible(html: string): boolean {
  if (html.length > MAX_CONVERTIBLE_LENGTH) return false;
  let blocks = 0;
  for (const _ of html.matchAll(/<(div|ul|ol|li|table|blockquote)\b/gi)) {
    if (++blocks > MAX_CONVERTIBLE_BLOCKS) return false;
  }
  return true;
}

interface RichTextField {
  type: 'text/html' | 'text/plain';
  value: string;
}

function isRichTextField(value: unknown): value is RichTextField {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (v.type === 'text/html' || v.type === 'text/plain') && typeof v.value === 'string';
}

/**
 * Recursively walks `data`, returning a new value with `value_markdown`
 * added next to every `{type: "text/html", value}` rich-text field found.
 * Non-rich-text values (including `text/plain` fields, arrays, primitives)
 * pass through structurally unchanged. Safe on any JSON-shaped input --
 * axios response bodies are always JSON.parse output, so no cycles.
 */
export function renderRichTextFieldsAsMarkdown(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(renderRichTextFieldsAsMarkdown);
  }

  if (data && typeof data === 'object') {
    if (isRichTextField(data) && data.type === 'text/html') {
      if (!isConvertible(data.value)) return data;
      return { ...data, value_markdown: turndown.turndown(inlinePolarionLinks(data.value)) };
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = renderRichTextFieldsAsMarkdown(value);
    }
    return result;
  }

  return data;
}
