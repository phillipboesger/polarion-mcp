/**
 * Essential Polarion tools for Custom GPT (limited to 30 operations)
 *
 * Custom GPTs have a limit of 30 operations per Action schema.
 * This file defines the most important tools for typical Polarion workflows.
 */

export const ESSENTIAL_GPT_TOOLS = [
  // Projects (2)
  "getProjects",
  "getProject",

  // Work Items - Core Operations (8)
  "getWorkItems",
  "getWorkItem",
  "postWorkItems",
  "patchWorkItem",
  "deleteWorkItems",
  "getLinkedWorkItems",
  "postLinkedWorkItems",
  "deleteLinkedWorkItem",

  // Work Items - Metadata (3)
  "getAvailableEnumOptionsForWorkItemType",
  "getCurrentEnumOptionsForWorkItem",
  "getWorkflowActionsForWorkItem",

  // Comments & Attachments (4)
  "getComments",
  "postComments",
  "getWorkItemAttachments",
  "postWorkItemAttachments",

  // Documents (4)
  "postDocuments",
  "getDocument",
  "getDocumentParts",
  "postDocumentParts",

  // Enumerations (3)
  "getGlobalEnumeration",
  "getProjectEnumeration",
  "patchProjectEnumeration",

  // Users (2)
  "getUsers",
  "getUser",

  // Test Management (2)
  "getTestRuns",
  "getTestRecords",

  // Approvals (2)
  "getWorkItemApprovals",
  "patchWorkItemApproval",
]

// Validate we don't exceed the limit
if (ESSENTIAL_GPT_TOOLS.length > 30) {
  throw new Error(`Too many GPT tools defined: ${ESSENTIAL_GPT_TOOLS.length}. Maximum is 30.`)
}

console.error(`[INFO] Custom GPT tool list contains ${ESSENTIAL_GPT_TOOLS.length} essential operations`)
