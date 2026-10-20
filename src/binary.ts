/**
 * File downloads (attachment content, avatars, job results) as MCP content.
 *
 * Polarion serves these as raw bytes, mostly labelled
 * `application/octet-stream`, and answers `Accept: application/json` with
 * 406. Decoding them as UTF-8 text would destroy every byte >= 0x80, so they
 * are fetched as bytes and returned as image, text or embedded-resource
 * content depending on what they are.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpToolDefinition } from './types.js';

/** Largest file returned inline; base64 grows it by a third. */
export const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

const DOWNLOAD_PATH = /\/(content|actions\/download\/\{filename\}|actions\/getAvatar)$/;

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp',
  pdf: 'application/pdf', zip: 'application/zip', json: 'application/json', xml: 'application/xml',
  txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', html: 'text/html', htm: 'text/html', log: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword', xls: 'application/vnd.ms-excel',
};

/** Raster images MCP clients render; SVG is text and goes back as such. */
const IMAGE_MIME = /^image\/(png|jpeg|gif|webp|bmp)$/;

/**
 * @param definition - A tool definition.
 * @returns True if the tool downloads a file rather than returning JSON.
 */
export function isDownloadTool(definition: McpToolDefinition): boolean {
  return definition.method.toLowerCase() === 'get' && !definition.outputSchema && DOWNLOAD_PATH.test(definition.pathTemplate);
}

/**
 * @param contentType - The response Content-Type.
 * @param fileName - A name to guess the type from when Polarion sends none.
 * @returns The best mime type for the file.
 */
function mimeTypeFor(contentType: string, fileName: string): string {
  const declared = contentType.split(';')[0].trim().toLowerCase();
  if (declared && declared !== 'application/octet-stream') return declared;
  const extension = /\.([A-Za-z0-9]+)$/.exec(fileName)?.[1]?.toLowerCase();
  return (extension && MIME_BY_EXTENSION[extension]) || 'application/octet-stream';
}

/**
 * @param bytes - File content.
 * @returns The text, if the bytes are valid UTF-8 without NUL bytes.
 */
function asText(bytes: Buffer): string | undefined {
  if (bytes.includes(0)) return undefined;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

/**
 * Turns a downloaded file into an MCP tool result.
 *
 * @param data - The response body (bytes).
 * @param contentType - The response Content-Type.
 * @param url - Where the file was fetched from; names the embedded resource.
 * @param fileName - Attachment id or file name, for type detection.
 * @returns Image, text or resource content, or an error if the file is too large.
 */
export function downloadResult(data: unknown, contentType: string, url: string, fileName: string): CallToolResult {
  const bytes = Buffer.isBuffer(data) ? data : data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(String(data ?? ''), 'utf8');
  if (bytes.length > MAX_DOWNLOAD_BYTES) {
    return {
      content: [{ type: 'text', text: `File too large to return inline: ${bytes.length} bytes (limit ${MAX_DOWNLOAD_BYTES}). Download it from Polarion directly: ${url}` }],
      isError: true,
    };
  }
  const mimeType = mimeTypeFor(contentType, fileName);
  const summary = { type: 'text' as const, text: `${fileName || 'File'} (${mimeType}, ${bytes.length} bytes)` };
  if (IMAGE_MIME.test(mimeType)) {
    return { content: [summary, { type: 'image', data: bytes.toString('base64'), mimeType }] };
  }
  const text = asText(bytes);
  if (text !== undefined) {
    return { content: [summary, { type: 'text', text }] };
  }
  return { content: [summary, { type: 'resource', resource: { uri: url, mimeType, blob: bytes.toString('base64') } }] };
}
