/**
 * Output schemas as advertised to clients.
 *
 * The generated schemas come from Polarion's OpenAPI examples, not from what
 * Polarion sends. The official SDK client validates `structuredContent` against
 * them and throws on a mismatch, which turns a call that succeeded (a write may
 * already have happened) into an error with the data lost. A `null`, a number
 * where the spec says string, or an enum value the spec does not list is
 * enough. The advertised schema therefore keeps only the structure (property
 * names, nesting) and accepts any value of the right kind, including null.
 */

type Schema = Record<string, unknown>;

const PRIMITIVES = ['string', 'number', 'integer', 'boolean'];

/** Keywords that constrain a value; the structure alone is what a client needs. */
const CONSTRAINTS = ['format', 'enum', 'const', 'pattern', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'required', 'example', 'examples'];

/**
 * @param schema - A generated output schema.
 * @returns A copy that accepts what Polarion really returns: no value
 *   constraints, no required properties, every type nullable.
 */
export function lenientOutputSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(lenientOutputSchema);
  if (typeof schema !== 'object' || schema === null) return schema;
  const node: Schema = {};
  for (const [key, value] of Object.entries(schema as Schema)) {
    if (CONSTRAINTS.includes(key)) continue;
    if (key === 'properties' && typeof value === 'object' && value !== null) {
      node.properties = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, lenientOutputSchema(child)]));
    } else if (key === 'additionalProperties') {
      // false would reject the fields Polarion adds; keep a schema, drop a boolean.
      if (typeof value === 'object') node.additionalProperties = lenientOutputSchema(value);
    } else {
      node[key] = lenientOutputSchema(value);
    }
  }
  if (typeof node.type === 'string') {
    node.type = PRIMITIVES.includes(node.type) ? [...PRIMITIVES, 'null'] : [node.type, 'null'];
  }
  return node;
}
