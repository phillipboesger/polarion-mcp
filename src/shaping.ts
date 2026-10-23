import type { JsonObject } from "./types.js";

/** Conservative sparse fieldsets used only for unbounded collection reads in concise mode. */
export const CONCISE_DEFAULT_FIELDS: Record<string, Record<string, string>> = {
  getAllWorkItems: { workitems: "id,title,type,status,updated,assignee,priority,severity" },
  getWorkItems: { workitems: "id,title,type,status,updated,assignee,priority,severity" },
  getAllDocuments: { documents: "id,title,type,updated,author" },
  getDocuments: { documents: "id,title,type,updated,author" },
  getUsers: { users: "id,name,email" },
  getTestRuns: { testruns: "id,title,status,created" },
  getProjects: { projects: "id,name,active" },
};

/** Removes JSON:API transport noise while preserving pagination and requested data. */
export function shapeConciseResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shapeConciseResponse);
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    if (key === "links") {
      if (child && typeof child === "object" && !Array.isArray(child) && "next" in child) {
        const next = (child as Record<string, unknown>).next;
        if (next !== undefined) result.links = { next };
      }
      continue;
    }
    if (key === "meta") {
      if (child && typeof child === "object" && !Array.isArray(child) && "totalCount" in child) {
        const totalCount = (child as Record<string, unknown>).totalCount;
        if (totalCount !== undefined) result.meta = { totalCount };
      }
      continue;
    }
    if (key === "value" && typeof source.value_markdown === "string") continue;
    result[key] = shapeConciseResponse(child);
  }
  return result;
}

export function conciseDefaultFields(toolName: string): Record<string, string> | undefined {
  const fields = CONCISE_DEFAULT_FIELDS[toolName];
  return fields ? { ...fields } : undefined;
}

export function isConciseResponseFormat(args: JsonObject): boolean {
  return args.response_format === "concise";
}
