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
      let value_markdown: string;
      try {
        value_markdown = turndown.turndown(data.value);
      } catch {
        // Malformed/unexpected HTML: leave the field as-is rather than fail the whole response.
        return data;
      }
      return { ...data, value_markdown };
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = renderRichTextFieldsAsMarkdown(value);
    }
    return result;
  }

  return data;
}
