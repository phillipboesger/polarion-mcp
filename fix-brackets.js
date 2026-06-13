#!/usr/bin/env node

/**
 * Simple script to fix property names with brackets in MCP server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Simple replacement: page[size] -> page_size and page[number] -> page_number
// Only in inputSchema properties (quoted strings followed by colon)
content = content.replace(/"page\[size\]"(\s*:)/g, '"page_size"$1');
content = content.replace(/"page\[number\]"(\s*:)/g, '"page_number"$1');

// Add the mapping code after the toolDefinitionMap (only if not already present)
const mappingCode = `
/**
 * Mapping from sanitized property names to original API parameter names
 */
const PROPERTY_NAME_MAPPING: Record<string, string> = {
  "page_size": "page[size]",
  "page_number": "page[number]"
};

/**
 * Converts sanitized property names back to original API parameter names
 */
function mapSanitizedToOriginalPropertyNames(args: JsonObject): JsonObject {
  const mapped: JsonObject = {};
  for (const [key, value] of Object.entries(args)) {
    const originalKey = PROPERTY_NAME_MAPPING[key] || key;
    mapped[originalKey] = value;
  }
  return mapped;
}
`;

// Check if the mapping code already exists
if (!content.includes('PROPERTY_NAME_MAPPING')) {
  // Find where to insert the mapping (after the map closes with ]);)
  const mapPattern = /const toolDefinitionMap: Map<string, McpToolDefinition> = new Map\(\[[\s\S]*?\]\);/;
  const match = content.match(mapPattern);

  if (!match) {
    console.error('Could not find toolDefinitionMap');
    process.exit(1);
  }

  const insertPosition = match.index + match[0].length;
  content = content.substring(0, insertPosition) + '\n' + mappingCode + '\n' + content.substring(insertPosition);
}


// Update the executeApiTool function to use mapping
content = content.replace(
  /\/\/ Apply parameters to the URL path, query, or headers\n(\s+)definition\.executionParameters\.forEach\(\(param\) => {\n(\s+)const value = validatedArgs\[param\.name\];/,
  `// Map sanitized property names back to original API parameter names
$1const mappedArgs = mapSanitizedToOriginalPropertyNames(validatedArgs);

$1// Apply parameters to the URL path, query, or headers
$1definition.executionParameters.forEach((param) => {
$2const value = mappedArgs[param.name];`
);

// Update requestBody handling
content = content.replace(
  /if \(definition\.requestBodyContentType && typeof validatedArgs\['requestBody'\]/,
  `if (definition.requestBodyContentType && typeof mappedArgs['requestBody']`
);

content = content.replace(
  /requestBodyData = validatedArgs\['requestBody'\];/,
  `requestBodyData = mappedArgs['requestBody'];`
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully fixed property names!');
console.log('   - page[size] → page_size');
console.log('   - page[number] → page_number');
console.log('   - Added mapping function to convert back to original names');
