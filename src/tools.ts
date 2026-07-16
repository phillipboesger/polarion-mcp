import type { McpToolDefinition } from "./types.js";

// AUTO-GENERATED from the Polarion OpenAPI definition. Do not edit by hand.
// Regenerate with: npm run regenerate  (see docs/openapi-and-generation.md)
// Tool count: 284

export const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([

  ["getGlobalFieldsMetadata", {
    name: "getGlobalFieldsMetadata",
    description: `Returns fields for the resource type and its target type in the Global context.`,
    inputSchema: {"type":"object","properties":{"resourceType":{"type":"string","description":"The Resource Type."},"targetType":{"type":"string","description":"The Type of the object. Use '~' without quotes to represent no target Type."}},"required":["resourceType"]},
    method: "get",
    pathTemplate: "/actions/getFieldsMetadata",
    executionParameters: [{"name":"resourceType","in":"query"},{"name":"targetType","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getAllDocuments", {
    name: "getAllDocuments",
    description: `Returns a list of Documents from all Projects.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}}},
    method: "get",
    pathTemplate: "/all/documents",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["branchDocuments", {
    name: "branchDocuments",
    description: `Creates Branches of Documents.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"documentConfigurations":{"items":{"properties":{"copyWorkflowStatusAndSignatures":{"description":"Specifies that workflow status and signatures should be copied to the branched document.","type":"boolean"},"initializedFields":{"description":"Specifies fields of overwritten Work Items that should be initialized (instead of being copied from source Work Items).","items":{"type":"string"},"type":"array"},"overwriteWorkItems":{"description":"Specifies that Work Items in the branched Document should be overwritten (instead of being referenced).","type":"boolean"},"query":{"description":"Specifies optional filtering query.","type":"string"},"sourceDocument":{"description":"Reference path of the source Document.","type":"string"},"sourceRevision":{"description":"Revision of the source Document.","type":"string"},"targetDocumentName":{"description":"Name for new Document.","type":"string"},"targetDocumentTitle":{"description":"Title for new Document.","type":"string"},"targetProjectId":{"description":"Project where new document will be created.","type":"string"},"targetSpaceId":{"description":"Space where new document will be created.","type":"string"},"updateTitleHeading":{"description":"Specifies that title heading of the target Document should be set to the new Document's title.","type":"boolean"}},"required":["sourceDocument"],"type":"object"},"minItems":1,"type":"array"}},"required":["documentConfigurations"],"type":"object","description":"Branching parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/all/documents/actions/branch",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getAllPages", {
    name: "getAllPages",
    description: `Returns a list of Pages from all Projects and Pages on the Repository level.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}}},
    method: "get",
    pathTemplate: "/all/pages",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getAllWorkItems", {
    name: "getAllWorkItems",
    description: `Returns a list of Work Items from all Projects.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}}},
    method: "get",
    pathTemplate: "/all/workitems",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteAllWorkItems", {
    name: "deleteAllWorkItems",
    description: `Deletes a list of Work Items from the Global context.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workitems"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "delete",
    pathTemplate: "/all/workitems",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchAllWorkItems", {
    name: "patchAllWorkItems",
    description: `Updates a list of Work Items in the Global context.`,
    inputSchema: {"type":"object","properties":{"workflowAction":{"type":"string","description":"The Workflow Action."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workitems"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"description":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"dueDate":{"format":"date","type":"string"},"hyperlinks":{"items":{"properties":{"role":{"type":"string"},"title":{"type":"string"},"uri":{"type":"string"}},"type":"object"},"type":"array"},"initialEstimate":{"type":"string"},"priority":{"type":"string"},"remainingEstimate":{"type":"string"},"resolution":{"type":"string"},"resolvedOn":{"format":"date-time","type":"string"},"severity":{"type":"string"},"status":{"type":"string"},"timeSpent":{"type":"string"},"title":{"type":"string"}},"type":"object"},"relationships":{"properties":{"assignee":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"categories":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["categories"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"linkedRevisions":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["revisions"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"votes":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"watches":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "patch",
    pathTemplate: "/all/workitems",
    executionParameters: [{"name":"workflowAction","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postGlobalCustomFields", {
    name: "postGlobalCustomFields",
    description: `Creates a list of Custom Fields in the Global context.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["customfields"],"type":"string"},"attributes":{"properties":{"fields":{"items":{"properties":{"defaultValue":{"type":"string"},"dependsOn":{"type":"string"},"description":{"type":"string"},"id":{"type":"string"},"name":{"type":"string"},"parameters":{"items":{"properties":{"key":{"type":"string"},"name":{"type":"string"},"title":{"type":"string"}},"type":"object"},"type":"array"},"required":{"type":"boolean"},"type":{"properties":{"kind":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"},"resourceType":{"type":"string"},"targetType":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"Custom Fields Body"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/customfields",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getGlobalCustomFields", {
    name: "getGlobalCustomFields",
    description: `Returns the defined Custom Fields for the resource type and target type in the Global context.`,
    inputSchema: {"type":"object","properties":{"resourceType":{"type":"string","description":"The Resource Type."},"targetType":{"type":"string","description":"The Type of the object. Use '~' without quotes to represent no target Type."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["resourceType","targetType"]},
    method: "get",
    pathTemplate: "/customfields/{resourceType}/{targetType}",
    executionParameters: [{"name":"resourceType","in":"path"},{"name":"targetType","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteGlobalCustomFields", {
    name: "deleteGlobalCustomFields",
    description: `Deletes the specified Custom Field configuration from the Global context.`,
    inputSchema: {"type":"object","properties":{"resourceType":{"type":"string","description":"The Resource Type."},"targetType":{"type":"string","description":"The Type of the object. Use '~' without quotes to represent no target Type."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["resourceType","targetType"]},
    method: "delete",
    pathTemplate: "/customfields/{resourceType}/{targetType}",
    executionParameters: [{"name":"resourceType","in":"path"},{"name":"targetType","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchGlobalCustomFields", {
    name: "patchGlobalCustomFields",
    description: `Updates the specified Custom Fields in the Global context.`,
    inputSchema: {"type":"object","properties":{"resourceType":{"type":"string","description":"The Resource Type."},"targetType":{"type":"string","description":"The Custom Field target type. (Use '~' when there is no specific type for the Prototype.)"},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["customfields"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"fields":{"items":{"properties":{"defaultValue":{"type":"string"},"dependsOn":{"type":"string"},"description":{"type":"string"},"id":{"type":"string"},"name":{"type":"string"},"parameters":{"items":{"properties":{"key":{"type":"string"},"name":{"type":"string"},"title":{"type":"string"}},"type":"object"},"type":"array"},"required":{"type":"boolean"},"type":{"properties":{"kind":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object","description":"Custom Fields Body"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["resourceType","targetType","requestBody"]},
    method: "patch",
    pathTemplate: "/customfields/{resourceType}/{targetType}",
    executionParameters: [{"name":"resourceType","in":"path"},{"name":"targetType","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getGlobalEnumerations", {
    name: "getGlobalEnumerations",
    description: `Returns a list of Enumerations from the Global context.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}}},
    method: "get",
    pathTemplate: "/enumerations",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postGlobalEnumeration", {
    name: "postGlobalEnumeration",
    description: `Creates a list of Enumerations in the Global context.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["enumerations"],"type":"string"},"attributes":{"properties":{"enumContext":{"type":"string"},"enumName":{"type":"string"},"options":{"items":{"properties":{"color":{"type":"string"},"columnWidth":{"type":"string"},"createDefect":{"type":"boolean"},"default":{"type":"boolean"},"description":{"type":"string"},"hidden":{"type":"boolean"},"iconURL":{"type":"string"},"id":{"type":"string"},"limited":{"type":"boolean"},"linkRules":{"items":{"properties":{"fromTypes":{"items":{"type":"string"},"type":"array"},"sameType":{"type":"boolean"},"toTypes":{"items":{"type":"string"},"type":"array"}},"type":"object"},"type":"array"},"minValue":{"type":"number"},"name":{"type":"string"},"oppositeName":{"type":"string"},"parent":{"type":"boolean"},"requiresSignatureForTestCaseExecution":{"type":"boolean"},"templateWorkItem":{"type":"string"},"terminal":{"type":"boolean"}},"type":"object"},"type":"array"},"targetType":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Enumeration(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/enumerations",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getGlobalEnumeration", {
    name: "getGlobalEnumeration",
    description: `Returns the specified Enumeration from the Global context.`,
    inputSchema: {"type":"object","properties":{"enumContext":{"type":"string","description":"The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)"},"enumName":{"type":"string","description":"The Enumeration Name."},"targetType":{"type":"string","description":"The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)"},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["enumContext","enumName","targetType"]},
    method: "get",
    pathTemplate: "/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{"name":"enumContext","in":"path"},{"name":"enumName","in":"path"},{"name":"targetType","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteGlobalEnumeration", {
    name: "deleteGlobalEnumeration",
    description: `Deletes the specified Enumeration from the Global context.`,
    inputSchema: {"type":"object","properties":{"enumContext":{"type":"string","description":"The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)"},"enumName":{"type":"string","description":"The Enumeration Name."},"targetType":{"type":"string","description":"The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["enumContext","enumName","targetType"]},
    method: "delete",
    pathTemplate: "/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{"name":"enumContext","in":"path"},{"name":"enumName","in":"path"},{"name":"targetType","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchGlobalEnumeration", {
    name: "patchGlobalEnumeration",
    description: `Updates the specified Enumeration in the Global context.`,
    inputSchema: {"type":"object","properties":{"enumContext":{"type":"string","description":"The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)"},"enumName":{"type":"string","description":"The Enumeration Name."},"targetType":{"type":"string","description":"The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)"},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["enumerations"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"options":{"items":{"properties":{"color":{"type":"string"},"columnWidth":{"type":"string"},"createDefect":{"type":"boolean"},"default":{"type":"boolean"},"description":{"type":"string"},"hidden":{"type":"boolean"},"iconURL":{"type":"string"},"id":{"type":"string"},"limited":{"type":"boolean"},"linkRules":{"items":{"properties":{"fromTypes":{"items":{"type":"string"},"type":"array"},"sameType":{"type":"boolean"},"toTypes":{"items":{"type":"string"},"type":"array"}},"type":"object"},"type":"array"},"minValue":{"type":"number"},"name":{"type":"string"},"oppositeName":{"type":"string"},"parent":{"type":"boolean"},"requiresSignatureForTestCaseExecution":{"type":"boolean"},"templateWorkItem":{"type":"string"},"terminal":{"type":"boolean"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Enumeration(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["enumContext","enumName","targetType","requestBody"]},
    method: "patch",
    pathTemplate: "/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{"name":"enumContext","in":"path"},{"name":"enumName","in":"path"},{"name":"targetType","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDefaultIcons", {
    name: "getDefaultIcons",
    description: `Returns a list of Icons from the default context.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}}},
    method: "get",
    pathTemplate: "/enumerations/defaulticons",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDefaultIcon", {
    name: "getDefaultIcon",
    description: `Returns the specified Icon from the default context.`,
    inputSchema: {"type":"object","properties":{"iconId":{"type":"string","description":"The Icon ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["iconId"]},
    method: "get",
    pathTemplate: "/enumerations/defaulticons/{iconId}",
    executionParameters: [{"name":"iconId","in":"path"},{"name":"fields","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getGlobalIcons", {
    name: "getGlobalIcons",
    description: `Returns a list of Icons from the Global context.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}}},
    method: "get",
    pathTemplate: "/enumerations/icons",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postGlobalIcons", {
    name: "postGlobalIcons",
    description: `Icons are identified by order`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"string","description":"Icon meta data and file data"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/enumerations/icons",
    executionParameters: [],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getGlobalIcon", {
    name: "getGlobalIcon",
    description: `Returns the specified Icon from the Global context.`,
    inputSchema: {"type":"object","properties":{"iconId":{"type":"string","description":"The Icon ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["iconId"]},
    method: "get",
    pathTemplate: "/enumerations/icons/{iconId}",
    executionParameters: [{"name":"iconId","in":"path"},{"name":"fields","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getJobs", {
    name: "getJobs",
    description: `Returns the list of Jobs.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"projectId":{"type":"string","description":"The Project ID."}}},
    method: "get",
    pathTemplate: "/jobs",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"projectId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getJob", {
    name: "getJob",
    description: `Returns the specified Job.`,
    inputSchema: {"type":"object","properties":{"jobId":{"type":"string","description":"The Job ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["jobId"]},
    method: "get",
    pathTemplate: "/jobs/{jobId}",
    executionParameters: [{"name":"jobId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getJobResultFileContent", {
    name: "getJobResultFileContent",
    description: `Downloads the file content for a specified job.`,
    inputSchema: {"type":"object","properties":{"jobId":{"type":"string","description":"The Job ID."},"filename":{"type":"string","description":"The Download File Name."}},"required":["jobId","filename"]},
    method: "get",
    pathTemplate: "/jobs/{jobId}/actions/download/{filename}",
    executionParameters: [{"name":"jobId","in":"path"},{"name":"filename","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getJobLogContent", {
    name: "getJobLogContent",
    description: `Downloads the Log content for a specified job.`,
    inputSchema: {"type":"object","properties":{"jobId":{"type":"string","description":"The Job ID."}},"required":["jobId"]},
    method: "get",
    pathTemplate: "/jobs/{jobId}/log/content",
    executionParameters: [{"name":"jobId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["executeJob", {
    name: "executeJob",
    description: `Executes a Job.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"jobId":{"description":"Id of job factory, e.g. jobs.cleanup","type":"string"},"name":{"type":"string"},"nodeId":{"type":["string","null"]},"params":{"description":"Parameters of Job to be executed.","properties":{"param1":{"example":"value1","type":"string"},"param2":{"example":"value2","type":"string"}},"type":["object","null"]},"scope":{"description":"Scope of the job. Accepted formats: 'system', 'project:{projectId}', or 'path:/{path}'.","type":["string","null"]}},"type":"object","description":"Execute Job parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/jobs/actions/execute",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getLicense", {
    name: "getLicense",
    description: `Returns information on the available License Limits.`,
    inputSchema: {"type":"object","properties":{"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}}},
    method: "get",
    pathTemplate: "/license",
    executionParameters: [{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchLicense", {
    name: "patchLicense",
    description: `Updates the product License. (Not supported by cloud-based Polarion X.)`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["license"],"type":"string"},"id":{"type":"string"},"relationships":{"properties":{"defaultAddOnLicenseSlots":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["license_slots"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"defaultBaseLicenseSlot":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["license_slots"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The License body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "patch",
    pathTemplate: "/license",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getLicenseAssignments", {
    name: "getLicenseAssignments",
    description: `Returns a list of License Assignments. (Not supported by cloud-based Polarion X.)`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"activeOnly":{"type":"boolean","description":"If set to true, only active (with status LOGGED_IN or EXPIRING) License Assignments will be returned, otherwise all the License Assignments will be returned."}}},
    method: "get",
    pathTemplate: "/license/assignments",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"activeOnly","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchLicenseAssignments", {
    name: "patchLicenseAssignments",
    description: `Updates the License Assignments of multiple users. (Not supported by cloud-based Polarion X.)`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["license_assignments"],"type":"string"},"id":{"type":"string"},"relationships":{"properties":{"addOnSlots":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["license_slots"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"baseSlot":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["license_slots"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The User(s) License Assignment body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "patch",
    pathTemplate: "/license/assignments",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getLicenseAssignmentsForUser", {
    name: "getLicenseAssignmentsForUser",
    description: `Returns the specified License Assignment. (Not supported by cloud-based Polarion X.)`,
    inputSchema: {"type":"object","properties":{"userId":{"type":"string"},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["userId"]},
    method: "get",
    pathTemplate: "/license/assignments/{userId}",
    executionParameters: [{"name":"userId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchLicenseAssignment", {
    name: "patchLicenseAssignment",
    description: `Updates a user's License Assignment. (Not supported by cloud-based Polarion X.)`,
    inputSchema: {"type":"object","properties":{"userId":{"type":"string","description":"The User ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["license_assignments"],"type":"string"},"id":{"type":"string"},"relationships":{"properties":{"addOnSlots":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["license_slots"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"baseSlot":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["license_slots"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The User License Assignment body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["userId","requestBody"]},
    method: "patch",
    pathTemplate: "/license/assignments/{userId}",
    executionParameters: [{"name":"userId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getLicenseSlots", {
    name: "getLicenseSlots",
    description: `Returns information on the available License Slots. (Not supported by cloud-based Polarion X.)`,
    inputSchema: {"type":"object","properties":{"typeId":{"type":"string"},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["typeId"]},
    method: "get",
    pathTemplate: "/license/types/{typeId}/slots",
    executionParameters: [{"name":"typeId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postLicenseSlots", {
    name: "postLicenseSlots",
    description: `Creates a list of group License Slots. (Not supported by cloud-based Polarion X.)`,
    inputSchema: {"type":"object","properties":{"typeId":{"type":"string"},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["license_slots"],"type":"string"},"attributes":{"properties":{"group":{"type":"string"},"total":{"format":"int32","type":"number"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"License Slots body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["typeId","requestBody"]},
    method: "post",
    pathTemplate: "/license/types/{typeId}/slots",
    executionParameters: [{"name":"typeId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteLicenseSlots", {
    name: "deleteLicenseSlots",
    description: `Deletes a list of Group license slots. (Not supported by cloud-based Polarion X.)`,
    inputSchema: {"type":"object","properties":{"typeId":{"type":"string","description":"License type."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["license_slots"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"No Content"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["typeId","requestBody"]},
    method: "delete",
    pathTemplate: "/license/types/{typeId}/slots",
    executionParameters: [{"name":"typeId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getLicenseSlot", {
    name: "getLicenseSlot",
    description: `Returns the specified License Slot. (Not supported by cloud-based Polarion X.)`,
    inputSchema: {"type":"object","properties":{"typeId":{"type":"string"},"model":{"type":"string"},"group":{"type":"string"},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["typeId","model","group"]},
    method: "get",
    pathTemplate: "/license/types/{typeId}/slots/{model}/{group}",
    executionParameters: [{"name":"typeId","in":"path"},{"name":"model","in":"path"},{"name":"group","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getLlms", {
    name: "getLlms",
    description: `Returns a list of Large Language Models (LLMs).`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}}},
    method: "get",
    pathTemplate: "/llms",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["generateCompletion", {
    name: "generateCompletion",
    description: `Generates a chat completion using a Large Language Model (LLM).`,
    inputSchema: {"type":"object","properties":{"requestBody":{"description":"Generate completion parameters.","properties":{"messages":{"description":"Prompt messages.","items":{"description":"A message in the LLM completion generation request or response.","properties":{"content":{"description":"Content of the message.","type":"string"},"role":{"description":"Role of the message sender, e.g., 'user' or 'assistant.'","type":"string"}},"required":["content","role"],"type":"object"},"type":"array"},"model":{"description":"Name of the LLM to use. If not specified, the default model will be used, if available.","type":"string"},"responseFormat":{"description":"Response format for LLM completion generation.","properties":{"schema":{"description":"The JSON schema to use when type is 'jsonSchema'.","type":"object"},"type":{"description":"Type of the response format. Defaults to 'text'.","enum":["text","json","jsonSchema"],"type":"string"}},"required":["type"],"type":"object"}},"required":["messages"],"type":"object"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/llms/actions/generateCompletion",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getMetadata", {
    name: "getMetadata",
    description: `Returns global metadata, including version, build, REST API configuration properties, etc. (Available to all REST API users.)`,
    inputSchema: {"type":"object","properties":{"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}}},
    method: "get",
    pathTemplate: "/metadata",
    executionParameters: [{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getGlobalPages", {
    name: "getGlobalPages",
    description: `Returns a list of all Pages on the Repository level.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."}}},
    method: "get",
    pathTemplate: "/pages",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjects", {
    name: "getProjects",
    description: `Returns a list of Projects.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}}},
    method: "get",
    pathTemplate: "/projects",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProject", {
    name: "getProject",
    description: `Returns the specified Project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteProject", {
    name: "deleteProject",
    description: `Deletes the specified Project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchProject", {
    name: "patchProject",
    description: `Updates the specified Project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["projects"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"active":{"type":"boolean"},"color":{"type":"string"},"description":{"properties":{"type":{"enum":["text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"finish":{"format":"date","type":"string"},"icon":{"type":"string"},"lockWorkRecordsDate":{"format":"date","type":"string"},"name":{"type":"string"},"start":{"format":"date","type":"string"},"trackerPrefix":{"type":"string"}},"type":"object"},"relationships":{"properties":{"lead":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Project body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjectFieldsMetadata", {
    name: "getProjectFieldsMetadata",
    description: `Returns fields for the resource type and its target type in the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"resourceType":{"type":"string","description":"The Resource Type."},"targetType":{"type":"string","description":"The Type of the object. Use '~' without quotes to represent no target Type."}},"required":["projectId","resourceType"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/actions/getFieldsMetadata",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"resourceType","in":"query"},{"name":"targetType","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["moveProjectAction", {
    name: "moveProjectAction",
    description: `Moves project to a different location`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"location":{"description":"Location of the new Project to be created.","type":"string"}},"type":"object","description":"Move project parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/actions/moveProject",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["unmarkProject", {
    name: "unmarkProject",
    description: `Unmarks the Project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/actions/unmarkProject",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getCollections", {
    name: "getCollections",
    description: `Returns a list of Collections.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/collections",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postCollections", {
    name: "postCollections",
    description: `Creates a list of Collections.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["collections"],"type":"string"},"attributes":{"properties":{"description":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"id":{"type":"string"},"name":{"type":"string"}},"type":"object"},"relationships":{"properties":{"documents":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"revision":{"type":"string"},"type":{"enum":["documents"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"richPages":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["pages"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"testRuns":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["testruns"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"upstreamCollections":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"revision":{"type":"string"},"type":{"enum":["collections"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Collection(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/collections",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteCollections", {
    name: "deleteCollections",
    description: `Deletes a list of Collections.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["collections"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Collection(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/collections",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getCollection", {
    name: "getCollection",
    description: `Returns the specified Collection.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","collectionId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteCollection", {
    name: "deleteCollection",
    description: `Deletes the specified Collection.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","collectionId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchCollections", {
    name: "patchCollections",
    description: `Updates the specified Collection.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["collections"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"description":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"name":{"type":"string"}},"type":"object"},"relationships":{"properties":{"documents":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"revision":{"type":"string"},"type":{"enum":["documents"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"richPages":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["pages"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"testRuns":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["testruns"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"upstreamCollections":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"revision":{"type":"string"},"type":{"enum":["collections"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Collection(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","collectionId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["closeCollection", {
    name: "closeCollection",
    description: `Closes the specified Collection.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","collectionId"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}/actions/close",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getFieldsMetadataForCollection", {
    name: "getFieldsMetadataForCollection",
    description: `Returns fields for the specified resource.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."}},"required":["projectId","collectionId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}/actions/getFieldsMetadata",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["reopenCollection", {
    name: "reopenCollection",
    description: `Reopens the specified Collection.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","collectionId"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}/actions/reopen",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["reuseCollection", {
    name: "reuseCollection",
    description: `Reuses the specified Collection.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"revision":{"type":"string","description":"The revision ID."},"requestBody":{"properties":{"targetCollectionName":{"description":"The name of the new Collection.","type":"string"},"targetProjectId":{"description":"Project where new Collection will be created.","type":"string"}},"type":"object","description":"Reusing parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","collectionId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}/actions/reuse",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"},{"name":"revision","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getCollectionsRelationship", {
    name: "getCollectionsRelationship",
    description: `Returns a list of Collection Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","collectionId","relationshipId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"},{"name":"relationshipId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postCollectionsRelationships", {
    name: "postCollectionsRelationships",
    description: `Creates the specific Relationships for the Collections.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"description":"The Document(s) body.","oneOf":[{"properties":{"data":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"}},"type":"object"},{"properties":{"data":{"items":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}],"type":"object"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","collectionId","relationshipId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteCollectionsRelationship", {
    name: "deleteCollectionsRelationship",
    description: `Removes the specific Relationship from the Collection.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Relationship body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","collectionId","relationshipId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchCollectionsRelationships", {
    name: "patchCollectionsRelationships",
    description: `Updates a list of Collection Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"collectionId":{"type":"string","description":"The Collection ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"description":"The Relationship body.","oneOf":[{"properties":{"data":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"}},"type":"object"},{"properties":{"data":{"items":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}],"type":"object"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","collectionId","relationshipId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/collections/{collectionId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"collectionId","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postProjectCustomFields", {
    name: "postProjectCustomFields",
    description: `Creates a list of Custom Fields in the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["customfields"],"type":"string"},"attributes":{"properties":{"fields":{"items":{"properties":{"defaultValue":{"type":"string"},"dependsOn":{"type":"string"},"description":{"type":"string"},"id":{"type":"string"},"name":{"type":"string"},"parameters":{"items":{"properties":{"key":{"type":"string"},"name":{"type":"string"},"title":{"type":"string"}},"type":"object"},"type":"array"},"required":{"type":"boolean"},"type":{"properties":{"kind":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"},"resourceType":{"type":"string"},"targetType":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"Custom Fields Body"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/customfields",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjectCustomFields", {
    name: "getProjectCustomFields",
    description: `Returns the defined Custom Fields for the resource type and target type in the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"resourceType":{"type":"string","description":"The Resource Type."},"targetType":{"type":"string","description":"The Type of the object. Use '~' without quotes to represent no target Type."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["projectId","resourceType","targetType"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/customfields/{resourceType}/{targetType}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"resourceType","in":"path"},{"name":"targetType","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteProjectCustomFields", {
    name: "deleteProjectCustomFields",
    description: `Deletes the specified Custom Field configuration from the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"resourceType":{"type":"string","description":"The Resource Type."},"targetType":{"type":"string","description":"The Type of the object. Use '~' without quotes to represent no target Type."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","resourceType","targetType"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/customfields/{resourceType}/{targetType}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"resourceType","in":"path"},{"name":"targetType","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchCustomField", {
    name: "patchCustomField",
    description: `Updates the specified Custom Fields in the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"resourceType":{"type":"string","description":"The Resource Type."},"targetType":{"type":"string","description":"The Custom Field target type. (Use '~' when there is no specific type for the Prototype.)"},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["customfields"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"fields":{"items":{"properties":{"defaultValue":{"type":"string"},"dependsOn":{"type":"string"},"description":{"type":"string"},"id":{"type":"string"},"name":{"type":"string"},"parameters":{"items":{"properties":{"key":{"type":"string"},"name":{"type":"string"},"title":{"type":"string"}},"type":"object"},"type":"array"},"required":{"type":"boolean"},"type":{"properties":{"kind":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object","description":"Custom Fields Body"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","resourceType","targetType","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/customfields/{resourceType}/{targetType}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"resourceType","in":"path"},{"name":"targetType","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDocuments", {
    name: "getDocuments",
    description: `Returns a list of Documents from the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/documents",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getAvailableEnumOptionsForDocumentType", {
    name: "getAvailableEnumOptionsForDocumentType",
    description: `Returns a list of available options for the requested field for the specified Document type.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"fieldId":{"type":"string","description":"The Field ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"type":{"type":"string","description":"The Type of the object. Use '~' without quotes to represent no target Type."}},"required":["projectId","fieldId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/documents/fields/{fieldId}/actions/getAvailableOptions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"fieldId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"type","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjectEnumerations", {
    name: "getProjectEnumerations",
    description: `Returns a list of Enumerations from the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/enumerations",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postProjectEnumeration", {
    name: "postProjectEnumeration",
    description: `Creates a list of Enumerations in the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["enumerations"],"type":"string"},"attributes":{"properties":{"enumContext":{"type":"string"},"enumName":{"type":"string"},"options":{"items":{"properties":{"color":{"type":"string"},"columnWidth":{"type":"string"},"createDefect":{"type":"boolean"},"default":{"type":"boolean"},"description":{"type":"string"},"hidden":{"type":"boolean"},"iconURL":{"type":"string"},"id":{"type":"string"},"limited":{"type":"boolean"},"linkRules":{"items":{"properties":{"fromTypes":{"items":{"type":"string"},"type":"array"},"sameType":{"type":"boolean"},"toTypes":{"items":{"type":"string"},"type":"array"}},"type":"object"},"type":"array"},"minValue":{"type":"number"},"name":{"type":"string"},"oppositeName":{"type":"string"},"parent":{"type":"boolean"},"requiresSignatureForTestCaseExecution":{"type":"boolean"},"templateWorkItem":{"type":"string"},"terminal":{"type":"boolean"}},"type":"object"},"type":"array"},"targetType":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Enumeration(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/enumerations",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjectEnumeration", {
    name: "getProjectEnumeration",
    description: `Returns the specified Enumeration from the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"enumContext":{"type":"string","description":"The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)"},"enumName":{"type":"string","description":"The Enumeration Name."},"targetType":{"type":"string","description":"The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)"},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["projectId","enumContext","enumName","targetType"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"enumContext","in":"path"},{"name":"enumName","in":"path"},{"name":"targetType","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteProjectEnumeration", {
    name: "deleteProjectEnumeration",
    description: `Deletes the specified Enumeration from the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"enumContext":{"type":"string","description":"The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)"},"enumName":{"type":"string","description":"The Enumeration Name."},"targetType":{"type":"string","description":"The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","enumContext","enumName","targetType"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"enumContext","in":"path"},{"name":"enumName","in":"path"},{"name":"targetType","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchProjectEnumeration", {
    name: "patchProjectEnumeration",
    description: `Updates the specified Enumeration in the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"enumContext":{"type":"string","description":"The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)"},"enumName":{"type":"string","description":"The Enumeration Name."},"targetType":{"type":"string","description":"The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)"},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["enumerations"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"options":{"items":{"properties":{"color":{"type":"string"},"columnWidth":{"type":"string"},"createDefect":{"type":"boolean"},"default":{"type":"boolean"},"description":{"type":"string"},"hidden":{"type":"boolean"},"iconURL":{"type":"string"},"id":{"type":"string"},"limited":{"type":"boolean"},"linkRules":{"items":{"properties":{"fromTypes":{"items":{"type":"string"},"type":"array"},"sameType":{"type":"boolean"},"toTypes":{"items":{"type":"string"},"type":"array"}},"type":"object"},"type":"array"},"minValue":{"type":"number"},"name":{"type":"string"},"oppositeName":{"type":"string"},"parent":{"type":"boolean"},"requiresSignatureForTestCaseExecution":{"type":"boolean"},"templateWorkItem":{"type":"string"},"terminal":{"type":"boolean"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Enumeration(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","enumContext","enumName","targetType","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"enumContext","in":"path"},{"name":"enumName","in":"path"},{"name":"targetType","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjectIcons", {
    name: "getProjectIcons",
    description: `Returns a list of Icons from the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/enumerations/icons",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postProjectIcons", {
    name: "postProjectIcons",
    description: `Icons are identified by order`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string"},"requestBody":{"type":"string","description":"Icon meta data and file data"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/enumerations/icons",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjectIcon", {
    name: "getProjectIcon",
    description: `Returns the specified Icon from the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"iconId":{"type":"string","description":"The Icon ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["projectId","iconId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/enumerations/icons/{iconId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"iconId","in":"path"},{"name":"fields","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPages", {
    name: "getPages",
    description: `Returns a list of Pages from the Project context.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/pages",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPlans", {
    name: "getPlans",
    description: `Returns a list of Plans.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."},"templates":{"type":"boolean","description":"If set to true, only templates will be returned, otherwise only actual instances will be returned."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/plans",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"},{"name":"templates","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postPlans", {
    name: "postPlans",
    description: `Creates a list of Plans.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["plans"],"type":"string"},"attributes":{"properties":{"allowedTypes":{"items":{"type":"string"},"type":"array"},"calculationType":{"enum":["timeBased","customFieldBased"],"type":"string"},"capacity":{"type":"number"},"color":{"type":"string"},"defaultEstimate":{"type":"number"},"description":{"properties":{"type":{"enum":["text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"dueDate":{"format":"date","type":"string"},"estimationField":{"type":"string"},"finishedOn":{"format":"date-time","type":"string"},"homePageContent":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"id":{"type":"string"},"isTemplate":{"type":"boolean"},"name":{"type":"string"},"previousTimeSpent":{"type":"string"},"prioritizationField":{"type":"string"},"sortOrder":{"format":"int32","type":"number"},"startDate":{"format":"date","type":"string"},"startedOn":{"format":"date-time","type":"string"},"status":{"type":"string"},"useReportFromTemplate":{"type":"boolean"}},"type":"object"},"relationships":{"properties":{"parent":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["plans"],"type":"string"}},"type":"object"}},"type":"object"},"projectSpan":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["projects"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"template":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["plans"],"type":"string"}},"type":"object"}},"type":"object"},"workItems":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Plan(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/plans",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deletePlans", {
    name: "deletePlans",
    description: `Deletes a list of Plans.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["plans"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Plan(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/plans",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPlan", {
    name: "getPlan",
    description: `Returns the specified Plan.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"planId":{"type":"string","description":"The Plan ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","planId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/plans/{planId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"planId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deletePlan", {
    name: "deletePlan",
    description: `Deletes the specified Plan.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"planId":{"type":"string","description":"The Plan ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","planId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/plans/{planId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"planId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchPlan", {
    name: "patchPlan",
    description: `Updates the specified Plan.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"planId":{"type":"string","description":"The Plan ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["plans"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"allowedTypes":{"items":{"type":"string"},"type":"array"},"calculationType":{"enum":["timeBased","customFieldBased"],"type":"string"},"capacity":{"type":"number"},"color":{"type":"string"},"defaultEstimate":{"type":"number"},"description":{"properties":{"type":{"enum":["text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"dueDate":{"format":"date","type":"string"},"estimationField":{"type":"string"},"finishedOn":{"format":"date-time","type":"string"},"homePageContent":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"isTemplate":{"type":"boolean"},"name":{"type":"string"},"previousTimeSpent":{"type":"string"},"prioritizationField":{"type":"string"},"sortOrder":{"format":"int32","type":"number"},"startDate":{"format":"date","type":"string"},"startedOn":{"format":"date-time","type":"string"},"status":{"type":"string"},"useReportFromTemplate":{"type":"boolean"}},"type":"object"},"relationships":{"properties":{"parent":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["plans"],"type":"string"}},"type":"object"}},"type":"object"},"projectSpan":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["projects"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"workItems":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Plan body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","planId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/plans/{planId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"planId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getFieldsMetadataForPlan", {
    name: "getFieldsMetadataForPlan",
    description: `Returns fields for the specified resource.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"planId":{"type":"string","description":"The Plan ID."}},"required":["projectId","planId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/plans/{planId}/actions/getFieldsMetadata",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"planId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPlanRelationship", {
    name: "getPlanRelationship",
    description: `Returns a list of Plan Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"planId":{"type":"string","description":"The Plan ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","planId","relationshipId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/plans/{planId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"planId","in":"path"},{"name":"relationshipId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postPlanRelationships", {
    name: "postPlanRelationships",
    description: `Creates the specific Relationships for the Plan.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"planId":{"type":"string","description":"The Plan ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"description":"The Work Item(s) body.","oneOf":[{"properties":{"data":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"}},"type":"object"},{"properties":{"data":{"items":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}],"type":"object"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","planId","relationshipId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/plans/{planId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"planId","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deletePlanRelationship", {
    name: "deletePlanRelationship",
    description: `Removes the specific Relationship from the Plan.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"planId":{"type":"string","description":"The Plan ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Relationship body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","planId","relationshipId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/plans/{planId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"planId","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchPlanRelationships", {
    name: "patchPlanRelationships",
    description: `Updates a list of Plan Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"planId":{"type":"string","description":"The Plan ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"description":"The Work Item(s) body.","oneOf":[{"properties":{"data":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"}},"type":"object"},{"properties":{"data":{"items":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}],"type":"object"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","planId","relationshipId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/plans/{planId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"planId","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getSpaceDocuments", {
    name: "getSpaceDocuments",
    description: `Returns a list of Documents from a given Project Space.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."}},"required":["projectId","spaceId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postDocuments", {
    name: "postDocuments",
    description: `Creates a list of Documents.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["documents"],"type":"string"},"attributes":{"properties":{"autoSuspect":{"type":"boolean"},"homePageContent":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"moduleName":{"type":"string"},"outlineNumbering":{"properties":{"prefix":{"type":"string"}},"type":"object"},"renderingLayouts":{"items":{"properties":{"label":{"type":"string"},"layouter":{"type":"string"},"properties":{"items":{"properties":{"key":{"type":"string"},"value":{"type":"string"}},"type":"object"},"type":"array"},"type":{"type":"string"}},"type":"object"},"type":"array"},"status":{"type":"string"},"structureLinkRole":{"type":"string"},"title":{"type":"string"},"type":{"type":"string"},"usesOutlineNumbering":{"type":"boolean"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Document body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDocument", {
    name: "getDocument",
    description: `Returns the specified Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","documentName"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchDocument", {
    name: "patchDocument",
    description: `Updates the specified Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"workflowAction":{"type":"string","description":"The Workflow Action."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["documents"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"autoSuspect":{"type":"boolean"},"homePageContent":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"outlineNumbering":{"properties":{"prefix":{"type":"string"}},"type":"object"},"renderingLayouts":{"items":{"properties":{"label":{"type":"string"},"layouter":{"type":"string"},"properties":{"items":{"properties":{"key":{"type":"string"},"value":{"type":"string"}},"type":"object"},"type":"array"},"type":{"type":"string"}},"type":"object"},"type":"array"},"status":{"type":"string"},"title":{"type":"string"},"type":{"type":"string"},"usesOutlineNumbering":{"type":"boolean"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Document body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"workflowAction","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["branchDocument", {
    name: "branchDocument",
    description: `Creates a Branch of the Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"revision":{"type":"string","description":"The revision ID."},"requestBody":{"properties":{"copyWorkflowStatusAndSignatures":{"description":"Specifies that workflow status and signatures should be copied to the branched document.","type":"boolean"},"query":{"description":"Specifies optional filtering query.","type":"string"},"targetDocumentName":{"description":"Name for new Document.","type":"string"},"targetProjectId":{"description":"Project where new document will be created.","type":"string"},"targetSpaceId":{"description":"Space where new document will be created.","type":"string"}},"type":"object","description":"Branching parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/actions/branch",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"revision","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["copyDocument", {
    name: "copyDocument",
    description: `Creates a copy of the Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"revision":{"type":"string","description":"The revision ID."},"requestBody":{"properties":{"linkOriginalItemsWithRole":{"description":"Link a copy of the document to the original.","type":"string"},"removeOutgoingLinks":{"description":"Should outgoing links be removed?","type":"boolean"},"targetDocumentName":{"description":"Name for new Document.","type":"string"},"targetProjectId":{"description":"Project where new document will be created.","type":"string"},"targetSpaceId":{"description":"Space where new document will be created.","type":"string"}},"type":"object","description":"Copy Document parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/actions/copy",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"revision","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getFieldsMetadataForDocument", {
    name: "getFieldsMetadataForDocument",
    description: `Returns fields for the specified resource.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Branch Document Name."}},"required":["projectId","spaceId","documentName"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/actions/getFieldsMetadata",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["mergeDocumentFromMaster", {
    name: "mergeDocumentFromMaster",
    description: `Merges Master Work Item changes to the specified Branched Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Branch Document Name."},"requestBody":{"properties":{"createBaseline":{"description":"Specifies whether the Baseline should be created.","type":"boolean"},"userFilter":{"description":"Specifies the query to filter the source Work Items for the merge.","type":"string"}},"type":"object","description":"Merge Document parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/actions/mergeFromMaster",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["mergeDocumentToMaster", {
    name: "mergeDocumentToMaster",
    description: `Merges Work Item changes from specified Branched Document to Master.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Branch Document Name."},"requestBody":{"properties":{"createBaseline":{"description":"Specifies whether the Baseline should be created.","type":"boolean"},"userFilter":{"description":"Specifies the query to filter the source Work Items for the merge.","type":"string"}},"type":"object","description":"Merge Document parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/actions/mergeToMaster",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDocumentAttachments", {
    name: "getDocumentAttachments",
    description: `Returns a list of Document Attachments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","documentName"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postDocumentItemAttachments", {
    name: "postDocumentItemAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDocumentAttachment", {
    name: "getDocumentAttachment",
    description: `Returns the specified Document Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"attachmentId":{"type":"string","description":"The Attachment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","documentName","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"attachmentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchDocumentAttachment", {
    name: "patchDocumentAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"attachmentId":{"type":"string","description":"The Attachment ID."},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","attachmentId"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDocumentAttachmentContent", {
    name: "getDocumentAttachmentContent",
    description: `Downloads the file content for a specified Document Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"attachmentId":{"type":"string","description":"The Attachment ID."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","documentName","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments/{attachmentId}/content",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"attachmentId","in":"path"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDocumentComments", {
    name: "getDocumentComments",
    description: `Returns a list of Document Comments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","documentName"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/comments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postDocumentComments", {
    name: "postDocumentComments",
    description: `Creates a list of Document Comments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["document_comments"],"type":"string"},"attributes":{"properties":{"resolved":{"type":"boolean"},"text":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"}},"type":"object"},"relationships":{"properties":{"author":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"},"parentComment":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["document_comments"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Comment(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/comments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDocumentComment", {
    name: "getDocumentComment",
    description: `Returns the specified Document Comment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"commentId":{"type":"string","description":"The Comment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","documentName","commentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/comments/{commentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"commentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchDocumentComment", {
    name: "patchDocumentComment",
    description: `Updates the specified Document Comment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"commentId":{"type":"string","description":"The Comment ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["document_comments"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"resolved":{"type":"boolean"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Comment body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","commentId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/comments/{commentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"commentId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getAvailableEnumOptionsForDocument", {
    name: "getAvailableEnumOptionsForDocument",
    description: `Returns a list of available options for the requested field in the specified Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"fieldId":{"type":"string","description":"The Field ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["projectId","spaceId","documentName","fieldId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/fields/{fieldId}/actions/getAvailableOptions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"fieldId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getCurrentEnumerationOptionsForDocument", {
    name: "getCurrentEnumerationOptionsForDocument",
    description: `Returns a list of selected options for the requested field in the specified Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"fieldId":{"type":"string","description":"The Field ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","documentName","fieldId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/fields/{fieldId}/actions/getCurrentOptions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"fieldId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDocumentParts", {
    name: "getDocumentParts",
    description: `Returns a list of Document Parts.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","documentName"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/parts",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postDocumentParts", {
    name: "postDocumentParts",
    description: `Creates a list of Document Parts.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["document_parts"],"type":"string"},"attributes":{"properties":{"content":{"description":"Editable only for normal and table document parts.","type":"string"},"headingText":{"description":"Applicable to: heading parts.","type":"string"},"landscape":{"description":"Whether the page break switches to landscape orientation. Applicable to: pagebreak parts.","type":"boolean"},"layout":{"description":"Rendering layout index for the part. Applicable to: workitem parts.","format":"int32","type":"number"},"level":{"description":"Outline level/depth of the part in the document hierarchy. Applicable to: heading, workitem parts.","format":"int32","type":"number"},"sequence":{"description":"Sequence identifier for table of figures entry. Applicable to: tof parts.","type":"string"},"type":{"description":"Possible values: heading, normal, pagebreak, table, toc, tof, wikiblock, workitem. Required for creation.","type":"string"},"wikiText":{"description":"Wiki markup content for the block. Applicable to: wikiblock parts.","type":"string"}},"type":"object"},"relationships":{"properties":{"nextPart":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["document_parts"],"type":"string"}},"type":"object"}},"type":"object"},"previousPart":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["document_parts"],"type":"string"}},"type":"object"}},"type":"object"},"workItem":{"properties":{"data":{"properties":{"id":{"type":"string"},"revision":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Document Part(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/parts",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteDocumentParts", {
    name: "deleteDocumentParts",
    description: `Deletes a list of Document Parts.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["document_parts"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The list of Document Part IDs to delete."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/parts",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getDocumentPart", {
    name: "getDocumentPart",
    description: `Returns the specified Document Part.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"partId":{"type":"string","description":"The Document Part ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","documentName","partId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/parts/{partId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"partId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["moveDocumentParts", {
    name: "moveDocumentParts",
    description: `Moves a Work Item Document Part.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"partId":{"type":"string","description":"The Document Part ID."},"requestBody":{"properties":{"after":{"type":"string"},"before":{"type":"string"},"parent":{"type":"string"}},"type":"object","description":"References for repositioning Work Item Document Part in the Document."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","partId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/parts/{partId}/actions/move",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"},{"name":"partId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["overwriteDocumentParts", {
    name: "overwriteDocumentParts",
    description: `Overwrites multiple Work Item Document Parts.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"documentName":{"type":"string","description":"The Document name."},"requestBody":{"properties":{"partIds":{"description":"The list of Document Part IDs to overwrite.","items":{"type":"string"},"type":"array"}},"required":["partIds"],"type":"object","description":"Parameters for overwriting multiple Work Item Document Parts."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","documentName","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/parts/actions/overwrite",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"documentName","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["importWordDocument", {
    name: "importWordDocument",
    description: `Imports a Word document to create a new Polarion Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"requestBody":{"type":"string","description":"Multipart form data with 'file' (binary .docx) and 'parameters' (JSON object with documentName, title, documentType, and optional configurationId)."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/actions/importWordDocument",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getSpacePages", {
    name: "getSpacePages",
    description: `Returns a list of Pages from a given Project Space.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."}},"required":["projectId","spaceId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postPages", {
    name: "postPages",
    description: `Creates a list of Pages.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["pages"],"type":"string"},"attributes":{"properties":{"homePageContent":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"pageName":{"type":"string"},"title":{"type":"string"}},"type":"object"},"relationships":{"properties":{"author":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Page(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPage", {
    name: "getPage",
    description: `Returns the specified Page.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","pageName"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deletePage", {
    name: "deletePage",
    description: `Deletes the specified Page.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchRichPage", {
    name: "patchRichPage",
    description: `Updates the specified Page.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["pages"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"homePageContent":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"title":{"type":"string"}},"type":"object"},"relationships":{"properties":{"watches":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Page body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPageAttachments", {
    name: "getPageAttachments",
    description: `Returns a list of Page Attachments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","pageName"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postPageAttachments", {
    name: "postPageAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string"},"spaceId":{"type":"string"},"pageName":{"type":"string"},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPageAttachment", {
    name: "getPageAttachment",
    description: `Returns the specified Page Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"attachmentId":{"type":"string","description":"The Attachment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","pageName","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"attachmentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deletePageAttachment", {
    name: "deletePageAttachment",
    description: `Deletes the specified Page Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"attachmentId":{"type":"string","description":"The Attachment ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName","attachmentId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchPageAttachment", {
    name: "patchPageAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"attachmentId":{"type":"string","description":"The Attachment ID."},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName","attachmentId"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPageAttachmentContent", {
    name: "getPageAttachmentContent",
    description: `Downloads the file content for a specified Page Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"attachmentId":{"type":"string","description":"The Attachment ID."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","pageName","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/attachments/{attachmentId}/content",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"attachmentId","in":"path"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPageComments", {
    name: "getPageComments",
    description: `Returns a list of Page Comments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","pageName"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/comments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postPageComments", {
    name: "postPageComments",
    description: `Creates a list of Page Comments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["page_comments"],"type":"string"},"attributes":{"properties":{"resolved":{"type":"boolean"},"text":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"}},"type":"object"},"relationships":{"properties":{"author":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"},"parentComment":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["page_comments"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Comment(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/comments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPageComment", {
    name: "getPageComment",
    description: `Returns the specified Page Comment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"commentId":{"type":"string","description":"The Comment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","pageName","commentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/comments/{commentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"commentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchPageComment", {
    name: "patchPageComment",
    description: `Updates the specified Page Comment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"commentId":{"type":"string","description":"The Comment ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["page_comments"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"resolved":{"type":"boolean"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Comment body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName","commentId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/comments/{commentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"commentId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getPageRelationships", {
    name: "getPageRelationships",
    description: `Returns a list of Page Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"relationshipId":{"type":"string","description":"The Relationship ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","spaceId","pageName","relationshipId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"relationshipId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postPageRelationships", {
    name: "postPageRelationships",
    description: `Creates a list of Rich Page Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"description":"The Relationship body.","oneOf":[{"properties":{"data":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"}},"type":"object"},{"properties":{"data":{"items":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}],"type":"object"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName","relationshipId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deletePageRelationships", {
    name: "deletePageRelationships",
    description: `Deletes a list of Page Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Relationship body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName","relationshipId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchPageRelationships", {
    name: "patchPageRelationships",
    description: `Updates a list of Page Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"pageName":{"type":"string","description":"The Page name."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"description":"The Relationship body.","oneOf":[{"properties":{"data":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"}},"type":"object"},{"properties":{"data":{"items":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}],"type":"object"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","spaceId","pageName","relationshipId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"spaceId","in":"path"},{"name":"pageName","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjectTestParameterDefinitions", {
    name: "getProjectTestParameterDefinitions",
    description: `Returns a list of Test Parameter Definitions for the specified Project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postProjectTestParameterDefinitions", {
    name: "postProjectTestParameterDefinitions",
    description: `Creates a list of Test Parameter Definitions for the specified Project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testparameter_definitions"],"type":"string"},"attributes":{"properties":{"name":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Parameter Definition(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteProjectTestParameterDefinitions", {
    name: "deleteProjectTestParameterDefinitions",
    description: `Deletes a list of Test Parameter Definitions for the specified Project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testparameter_definitions"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Parameter Definition(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjectTestParameterDefinition", {
    name: "getProjectTestParameterDefinition",
    description: `Returns the specified Test Parameter Definition for the specified Project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testParamId":{"type":"string","description":"The Test Parameter."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["projectId","testParamId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testParamId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteProjectTestParameterDefinition", {
    name: "deleteProjectTestParameterDefinition",
    description: `Deletes the specified Test Parameter Definition for the specified Project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testParamId":{"type":"string","description":"The Test Parameter."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testParamId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testParamId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRuns", {
    name: "getTestRuns",
    description: `Returns a list of Test Runs.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."},"templates":{"type":"boolean","description":"If set to true, only templates will be returned, otherwise only actual instances will be returned."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"},{"name":"templates","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestRuns", {
    name: "postTestRuns",
    description: `Creates a list of Test Runs.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testruns"],"type":"string"},"attributes":{"properties":{"finishedOn":{"format":"date-time","type":"string"},"groupId":{"type":"string"},"homePageContent":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"id":{"type":"string"},"idPrefix":{"type":"string"},"isTemplate":{"type":"boolean"},"keepInHistory":{"type":"boolean"},"query":{"type":"string"},"selectTestCasesBy":{"enum":["manualSelection","staticQueryResult","dynamicQueryResult","staticLiveDoc","dynamicLiveDoc","automatedProcess"],"type":"string"},"status":{"type":"string"},"title":{"type":"string"},"type":{"type":"string"},"useReportFromTemplate":{"type":"boolean"}},"type":"object"},"relationships":{"properties":{"document":{"properties":{"data":{"properties":{"id":{"type":"string"},"revision":{"type":"string"},"type":{"enum":["documents"],"type":"string"}},"type":"object"}},"type":"object"},"projectSpan":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["projects"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"summaryDefect":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"},"template":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["testruns"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Run(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRuns", {
    name: "deleteTestRuns",
    description: `Deletes a list of Test Runs.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testruns"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Run(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestRuns", {
    name: "patchTestRuns",
    description: `Updates a list of Test Runs.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testruns"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"finishedOn":{"format":"date-time","type":"string"},"groupId":{"type":"string"},"homePageContent":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"idPrefix":{"type":"string"},"keepInHistory":{"type":"boolean"},"query":{"type":"string"},"selectTestCasesBy":{"enum":["manualSelection","staticQueryResult","dynamicQueryResult","staticLiveDoc","dynamicLiveDoc","automatedProcess"],"type":"string"},"status":{"type":"string"},"title":{"type":"string"},"type":{"type":"string"},"useReportFromTemplate":{"type":"boolean"}},"type":"object"},"relationships":{"properties":{"document":{"properties":{"data":{"properties":{"id":{"type":"string"},"revision":{"type":"string"},"type":{"enum":["documents"],"type":"string"}},"type":"object"}},"type":"object"},"projectSpan":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["projects"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"summaryDefect":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Run(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRun", {
    name: "getTestRun",
    description: `Returns the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRun", {
    name: "deleteTestRun",
    description: `Deletes the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestRun", {
    name: "patchTestRun",
    description: `Updates the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["testruns"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"finishedOn":{"format":"date-time","type":"string"},"groupId":{"type":"string"},"homePageContent":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"idPrefix":{"type":"string"},"keepInHistory":{"type":"boolean"},"query":{"type":"string"},"selectTestCasesBy":{"enum":["manualSelection","staticQueryResult","dynamicQueryResult","staticLiveDoc","dynamicLiveDoc","automatedProcess"],"type":"string"},"status":{"type":"string"},"title":{"type":"string"},"type":{"type":"string"},"useReportFromTemplate":{"type":"boolean"}},"type":"object"},"relationships":{"properties":{"document":{"properties":{"data":{"properties":{"id":{"type":"string"},"revision":{"type":"string"},"type":{"enum":["documents"],"type":"string"}},"type":"object"}},"type":"object"},"projectSpan":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["projects"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"summaryDefect":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Test Run(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getExportExcelTests", {
    name: "getExportExcelTests",
    description: `Exports tests to Excel.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"query":{"type":"string","description":"The query string."},"sortBy":{"type":"string","description":"The property to sort the test results."},"template":{"type":"string","description":"The export template string."}},"required":["projectId","testRunId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/exportTestsToExcel",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"query","in":"query"},{"name":"sortBy","in":"query"},{"name":"template","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getFieldsMetadataForTestRun", {
    name: "getFieldsMetadataForTestRun",
    description: `Returns fields for the specified resource.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."}},"required":["projectId","testRunId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/getFieldsMetadata",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkflowActionsForTestRun", {
    name: "getWorkflowActionsForTestRun",
    description: `Returns a list of Workflow Actions.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/getWorkflowActions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["importExcelTestResults", {
    name: "importExcelTestResults",
    description: `Imports Excel test results.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"type":"string","description":"Excel import meta data and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/importExcelTestResults",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["importXUnitTestResults", {
    name: "importXUnitTestResults",
    description: `Imports XUnit test results.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"type":"string","description":"XUnit File."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/importXUnitTestResults",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/octet-stream",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRunAttachments", {
    name: "getTestRunAttachments",
    description: `Returns a list of Test Run Attachments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string"},"testRunId":{"type":"string"},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestRunAttachments", {
    name: "postTestRunAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string"},"testRunId":{"type":"string"},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRunAttachments", {
    name: "deleteTestRunAttachments",
    description: `Deletes a list of Test Run Attachments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testrun_attachments"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Run Attachment(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRunAttachment", {
    name: "getTestRunAttachment",
    description: `Returns the specified Test Run Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"attachmentId":{"type":"string","description":"The Attachment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"attachmentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRunAttachment", {
    name: "deleteTestRunAttachment",
    description: `Deletes the specified Test Run Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"attachmentId":{"type":"string","description":"The Attachment ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","attachmentId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestRunAttachment", {
    name: "patchTestRunAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string"},"testRunId":{"type":"string"},"attachmentId":{"type":"string"},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","attachmentId"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRunAttachmentContent", {
    name: "getTestRunAttachmentContent",
    description: `Downloads the file content for a specified Test Run Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"attachmentId":{"type":"string","description":"The Attachment ID."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments/{attachmentId}/content",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"attachmentId","in":"path"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRunComments", {
    name: "getTestRunComments",
    description: `Returns a list of Test Run Comments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestRunComments", {
    name: "postTestRunComments",
    description: `Creates a list of Test Run Comments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testrun_comments"],"type":"string"},"attributes":{"properties":{"resolved":{"type":"boolean"},"text":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"title":{"type":"string"}},"type":"object"},"relationships":{"properties":{"author":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"},"parentComment":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["testrun_comments"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Comment(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestRunComments", {
    name: "patchTestRunComments",
    description: `Updates a list of Test Run Comments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testrun_comments"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"resolved":{"type":"boolean"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Comment body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRunComment", {
    name: "getTestRunComment",
    description: `Returns the specified Test Run Comment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"commentId":{"type":"string","description":"The Comment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","commentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments/{commentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"commentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestRunComment", {
    name: "patchTestRunComment",
    description: `Updates the specified Test Run Comment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"commentId":{"type":"string","description":"The Comment ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["testrun_comments"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"resolved":{"type":"boolean"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Comment body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","commentId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments/{commentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"commentId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRunTestParameterDefinitions", {
    name: "getTestRunTestParameterDefinitions",
    description: `Returns a list of Test Parameter Definitions for the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameterdefinitions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestRunParameterDefinitions", {
    name: "postTestRunParameterDefinitions",
    description: `Creates a list of Test Parameter Definitions for the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testparameter_definitions"],"type":"string"},"attributes":{"properties":{"name":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Parameter Definition(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameterdefinitions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRunTestParameterDefinition", {
    name: "getTestRunTestParameterDefinition",
    description: `Returns the specified Test Parameter Definition for the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testParamId":{"type":"string","description":"The Test Parameter."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testParamId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testParamId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRunTestParameterDefinition", {
    name: "deleteTestRunTestParameterDefinition",
    description: `Deletes the specified Test Parameter Definition for the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testParamId":{"type":"string","description":"The Test Parameter."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testParamId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testParamId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRunTestParameters", {
    name: "getTestRunTestParameters",
    description: `Returns a list of Test Parameters for the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestRunTestParameters", {
    name: "postTestRunTestParameters",
    description: `Creates a list of Test Parameters for the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testparameters"],"type":"string"},"attributes":{"properties":{"name":{"type":"string"},"value":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Parameter(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRunTestParameters", {
    name: "deleteTestRunTestParameters",
    description: `Deletes a list of Test Parameters for the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testparameters"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Parameter(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRunTestParameter", {
    name: "getTestRunTestParameter",
    description: `Returns the specified Test Parameter for the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testParamId":{"type":"string","description":"The Test Parameter."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testParamId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters/{testParamId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testParamId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRunTestParameter", {
    name: "deleteTestRunTestParameter",
    description: `Deletes the specified Test Parameter for the specified Test Run.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testParamId":{"type":"string","description":"The Test Parameter."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testParamId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters/{testParamId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testParamId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRecords", {
    name: "getTestRecords",
    description: `Returns a list of Test Records.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."},"testCaseProjectId":{"type":"string","description":"testCaseProjectId"},"testCaseId":{"type":"string","description":"testCaseId"},"testResultId":{"type":"string","description":"testResultId"}},"required":["projectId","testRunId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"},{"name":"testCaseProjectId","in":"query"},{"name":"testCaseId","in":"query"},{"name":"testResultId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestRecords", {
    name: "postTestRecords",
    description: `Creates a list of Test Records.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testrecords"],"type":"string"},"attributes":{"properties":{"comment":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"duration":{"type":"number"},"executed":{"format":"date-time","type":"string"},"result":{"type":"string"},"testCaseRevision":{"type":"string"}},"type":"object"},"relationships":{"properties":{"defect":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"},"executedBy":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"},"testCase":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Record(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestRecords", {
    name: "patchTestRecords",
    description: `Updates a list of Test Records.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testrecords"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"comment":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"duration":{"type":"number"},"executed":{"format":"date-time","type":"string"},"result":{"type":"string"},"testCaseRevision":{"type":"string"}},"type":"object"},"relationships":{"properties":{"defect":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"},"executedBy":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Record(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRecord", {
    name: "getTestRecord",
    description: `Returns the specified Test Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRecord", {
    name: "deleteTestRecord",
    description: `Deletes the specified Test Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestRecord", {
    name: "patchTestRecord",
    description: `Updates the specified Test Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["testrecords"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"comment":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"duration":{"type":"number"},"executed":{"format":"date-time","type":"string"},"result":{"type":"string"},"testCaseRevision":{"type":"string"}},"type":"object"},"relationships":{"properties":{"defect":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"},"executedBy":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Test Record(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getFieldsMetadataForTestRecord", {
    name: "getFieldsMetadataForTestRecord",
    description: `Returns fields for the specified resource.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/actions/getFieldsMetadata",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRecordAttachments", {
    name: "getTestRecordAttachments",
    description: `Returns a list of Test Record Attachments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestRecordAttachments", {
    name: "postTestRecordAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRecordAttachments", {
    name: "deleteTestRecordAttachments",
    description: `Deletes a list of Test Record Attachments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testrecord_attachments"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Record Attachment(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRecordAttachment", {
    name: "getTestRecordAttachment",
    description: `Returns the specified Test Record Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"attachmentId":{"type":"string","description":"The Attachment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"attachmentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRecordAttachment", {
    name: "deleteTestRecordAttachment",
    description: `Deletes the specified Test Record Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"attachmentId":{"type":"string","description":"The Attachment ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","attachmentId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestRecordAttachment", {
    name: "patchTestRecordAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"attachmentId":{"type":"string","description":"The Attachment ID."},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","attachmentId"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRecordAttachmentContent", {
    name: "getTestRecordAttachmentContent",
    description: `Downloads the file content for a specified Test Record Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"attachmentId":{"type":"string","description":"The Attachment ID."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments/{attachmentId}/content",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"attachmentId","in":"path"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRecordTestParameters", {
    name: "getTestRecordTestParameters",
    description: `Returns a list of Test Parameters for the specified Test Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/testparameters",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestRecordTestParameters", {
    name: "postTestRecordTestParameters",
    description: `Creates a list of Test Parameters for the specified Test Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["testparameters"],"type":"string"},"attributes":{"properties":{"name":{"type":"string"},"value":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Parameter(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/testparameters",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestRecordTestParameter", {
    name: "getTestRecordTestParameter",
    description: `Returns the specified Test Parameter for the specified Test Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testParamId":{"type":"string","description":"The Test Parameter."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testParamId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/testparameters/{testParamId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testParamId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestRecordTestParameter", {
    name: "deleteTestRecordTestParameter",
    description: `Deletes the specified Test Parameter for the specified Test Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testParamId":{"type":"string","description":"The Test Parameter."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testParamId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/testparameters/{testParamId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testParamId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestStepResults", {
    name: "getTestStepResults",
    description: `Returns a list of Test Step Results.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestStepResults", {
    name: "postTestStepResults",
    description: `Creates a list of Test Step Results.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["teststep_results"],"type":"string"},"attributes":{"properties":{"comment":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"result":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Step Result(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestStepResults", {
    name: "patchTestStepResults",
    description: `Updates a list of Test Step Results.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["teststep_results"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"comment":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"result":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Step(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestStepResult", {
    name: "getTestStepResult",
    description: `Returns the specified Test Step Result.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testStepIndex":{"type":"string","description":"The Test Step index."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testStepIndex"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testStepIndex","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestStepResult", {
    name: "patchTestStepResult",
    description: `Updates the specified Test Step Result.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testStepIndex":{"type":"string","description":"The Test Step index."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["teststep_results"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"comment":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"result":{"type":"string"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Test Step(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testStepIndex","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testStepIndex","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestStepResultAttachments", {
    name: "getTestStepResultAttachments",
    description: `Returns a list of Attachments for the specified Test Step Result.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testStepIndex":{"type":"string","description":"The Test Step index."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testStepIndex"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testStepIndex","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestStepResultAttachments", {
    name: "postTestStepResultAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testStepIndex":{"type":"string","description":"The Test Step index."},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testStepIndex","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testStepIndex","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestStepResultAttachments", {
    name: "deleteTestStepResultAttachments",
    description: `Deletes a list of Test Step Result Attachments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testStepIndex":{"type":"string","description":"The Test Step index."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["teststepresult_attachments"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Step Result Attachment(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testStepIndex","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testStepIndex","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestStepResultAttachment", {
    name: "getTestStepResultAttachment",
    description: `Returns the specified Test Step Result Attachment for the specified Test Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testStepIndex":{"type":"string","description":"The Test Step index."},"attachmentId":{"type":"string","description":"The Attachment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testStepIndex","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testStepIndex","in":"path"},{"name":"attachmentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestStepResultAttachment", {
    name: "deleteTestStepResultAttachment",
    description: `Deletes the specified Test Step Result Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testStepIndex":{"type":"string","description":"The Test Step index."},"attachmentId":{"type":"string","description":"The Attachment ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testStepIndex","attachmentId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testStepIndex","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestStepResultAttachment", {
    name: "patchTestStepResultAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testStepIndex":{"type":"string","description":"The Test Step index."},"attachmentId":{"type":"string","description":"The Attachment ID."},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testStepIndex","attachmentId"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testStepIndex","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestStepResultAttachmentContent", {
    name: "getTestStepResultAttachmentContent",
    description: `Downloads the file content for a specified Test Step Result Attachment for the specified Test Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"testRunId":{"type":"string","description":"The Test Run ID."},"testCaseProjectId":{"type":"string","description":"The Testcase Project ID."},"testCaseId":{"type":"string","description":"The Testcase ID."},"iteration":{"type":"string","description":"The Iteration Number."},"testStepIndex":{"type":"string","description":"The Test Step index."},"attachmentId":{"type":"string","description":"The Attachment ID."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","testRunId","testCaseProjectId","testCaseId","iteration","testStepIndex","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments/{attachmentId}/content",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"testRunId","in":"path"},{"name":"testCaseProjectId","in":"path"},{"name":"testCaseId","in":"path"},{"name":"iteration","in":"path"},{"name":"testStepIndex","in":"path"},{"name":"attachmentId","in":"path"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItems", {
    name: "getWorkItems",
    description: `Returns a list of Work Items.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postWorkItems", {
    name: "postWorkItems",
    description: `Creates a list of Work Items.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workitems"],"type":"string"},"attributes":{"properties":{"description":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"dueDate":{"format":"date","type":"string"},"hyperlinks":{"items":{"properties":{"role":{"type":"string"},"title":{"type":"string"},"uri":{"type":"string"}},"type":"object"},"type":"array"},"initialEstimate":{"type":"string"},"priority":{"type":"string"},"remainingEstimate":{"type":"string"},"resolution":{"type":"string"},"resolvedOn":{"format":"date-time","type":"string"},"severity":{"type":"string"},"status":{"type":"string"},"timeSpent":{"type":"string"},"title":{"type":"string"},"type":{"type":"string"}},"required":["type"],"type":"object"},"relationships":{"properties":{"assignee":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"author":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"},"categories":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["categories"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"linkedRevisions":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["revisions"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"module":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["documents"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteWorkItems", {
    name: "deleteWorkItems",
    description: `Deletes a list of Work Items.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workitems"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchWorkItems", {
    name: "patchWorkItems",
    description: `Updates a list of Work Items.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workflowAction":{"type":"string","description":"The Workflow Action."},"changeTypeTo":{"type":"string","description":"The Type the Workitem to change to."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workitems"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"description":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"dueDate":{"format":"date","type":"string"},"hyperlinks":{"items":{"properties":{"role":{"type":"string"},"title":{"type":"string"},"uri":{"type":"string"}},"type":"object"},"type":"array"},"initialEstimate":{"type":"string"},"priority":{"type":"string"},"remainingEstimate":{"type":"string"},"resolution":{"type":"string"},"resolvedOn":{"format":"date-time","type":"string"},"severity":{"type":"string"},"status":{"type":"string"},"timeSpent":{"type":"string"},"title":{"type":"string"}},"type":"object"},"relationships":{"properties":{"assignee":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"categories":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["categories"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"linkedRevisions":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["revisions"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"votes":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"watches":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workflowAction","in":"query"},{"name":"changeTypeTo","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItem", {
    name: "getWorkItem",
    description: `Returns the specified Work Item.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchWorkItem", {
    name: "patchWorkItem",
    description: `Updates the specified Work Item.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"workflowAction":{"type":"string","description":"The Workflow Action."},"changeTypeTo":{"type":"string","description":"The Type the Workitem to change to."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["workitems"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"description":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"dueDate":{"format":"date","type":"string"},"hyperlinks":{"items":{"properties":{"role":{"type":"string"},"title":{"type":"string"},"uri":{"type":"string"}},"type":"object"},"type":"array"},"initialEstimate":{"type":"string"},"priority":{"type":"string"},"remainingEstimate":{"type":"string"},"resolution":{"type":"string"},"resolvedOn":{"format":"date-time","type":"string"},"severity":{"type":"string"},"status":{"type":"string"},"timeSpent":{"type":"string"},"title":{"type":"string"}},"type":"object"},"relationships":{"properties":{"assignee":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"categories":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["categories"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"linkedRevisions":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["revisions"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"votes":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"watches":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Work Item body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"workflowAction","in":"query"},{"name":"changeTypeTo","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getFieldsMetadataForWorkItem", {
    name: "getFieldsMetadataForWorkItem",
    description: `Returns fields for the specified resource.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/actions/getFieldsMetadata",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkflowActionsForWorkItem", {
    name: "getWorkflowActionsForWorkItem",
    description: `Returns a list of Workflow Actions.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/actions/getWorkflowActions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["moveFromDocument", {
    name: "moveFromDocument",
    description: `Moves the specified Work Item from the Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/actions/moveFromDocument",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["moveToDocument", {
    name: "moveToDocument",
    description: `Moves the specified Work Item to the Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"nextPart":{"type":"string"},"previousPart":{"type":"string"},"targetDocument":{"type":"string"}},"type":"object","description":"Moving Work Item to Document parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/actions/moveToDocument",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItemApprovals", {
    name: "getWorkItemApprovals",
    description: `Returns a list of instances.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postWorkItemApprovals", {
    name: "postWorkItemApprovals",
    description: `Creates a list of WorkItem Approvals.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workitem_approvals"],"type":"string"},"attributes":{"properties":{"status":{"enum":["waiting","approved","disapproved"],"type":"string"}},"type":"object"},"relationships":{"properties":{"user":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Linked Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteApprovals", {
    name: "deleteApprovals",
    description: `Deletes a list of Work Item Approvals.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workitem_approvals"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Workitem Approval(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchWorkItemApprovals", {
    name: "patchWorkItemApprovals",
    description: `Updates a list of instances.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workitem_approvals"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"status":{"enum":["waiting","approved","disapproved"],"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Run(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItemApproval", {
    name: "getWorkItemApproval",
    description: `Returns the specified instance.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"userId":{"type":"string","description":"The User ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","userId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals/{userId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"userId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteApproval", {
    name: "deleteApproval",
    description: `Deletes the specified Work Item Approval.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"userId":{"type":"string","description":"The User ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","userId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals/{userId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"userId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchWorkItemApproval", {
    name: "patchWorkItemApproval",
    description: `Updates the specified instance.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"userId":{"type":"string","description":"The User ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["workitem_approvals"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"status":{"enum":["waiting","approved","disapproved"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Test Run(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","userId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals/{userId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"userId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItemAttachments", {
    name: "getWorkItemAttachments",
    description: `Returns a list of  Work Item Attachments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string"},"workItemId":{"type":"string"},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postWorkItemAttachments", {
    name: "postWorkItemAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string"},"workItemId":{"type":"string"},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItemAttachment", {
    name: "getWorkItemAttachment",
    description: `Returns the specified Work Item Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"attachmentId":{"type":"string","description":"The Attachment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"attachmentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteWorkItemAttachment", {
    name: "deleteWorkItemAttachment",
    description: `Deletes the specified Work Item Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"attachmentId":{"type":"string","description":"The Attachment ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","attachmentId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchWorkItemAttachment", {
    name: "patchWorkItemAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string"},"workItemId":{"type":"string"},"attachmentId":{"type":"string"},"requestBody":{"type":"string","description":"Attachment metadata and file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","attachmentId"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments/{attachmentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItemAttachmentContent", {
    name: "getWorkItemAttachmentContent",
    description: `Downloads the file content for a specified Work Item Attachment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"attachmentId":{"type":"string","description":"The Attachment ID."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","attachmentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments/{attachmentId}/content",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"attachmentId","in":"path"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getBacklinkedWorkItems", {
    name: "getBacklinkedWorkItems",
    description: `Returns the incoming links from other Work Items (also known as backlinks). Does not pertain to External links.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/backlinkedworkitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postBacklinkedWorkItems", {
    name: "postBacklinkedWorkItems",
    description: `Creates incoming links from other Work Items (backlinks). Does not pertain to External links.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["linkedworkitems"],"type":"string"},"attributes":{"properties":{"revision":{"type":"string"},"role":{"type":"string"},"suspect":{"type":"boolean"}},"type":"object"},"relationships":{"properties":{"sourceWorkItem":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Linked Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/backlinkedworkitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getComments", {
    name: "getComments",
    description: `Returns a list of Work Item Comments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/comments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postComments", {
    name: "postComments",
    description: `Creates a list of Work Item Comments.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workitem_comments"],"type":"string"},"attributes":{"properties":{"resolved":{"type":"boolean"},"text":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"title":{"type":"string"}},"type":"object"},"relationships":{"properties":{"author":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"},"parentComment":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitem_comments"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Comment(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/comments",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getComment", {
    name: "getComment",
    description: `Returns the specified Work Item Comment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"commentId":{"type":"string","description":"The Comment ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","commentId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/comments/{commentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"commentId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchComment", {
    name: "patchComment",
    description: `Updates the specified Work Item Comment.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"commentId":{"type":"string","description":"The Comment ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["workitem_comments"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"resolved":{"type":"boolean"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Comment body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","commentId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/comments/{commentId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"commentId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getExternallyLinkedWorkItems", {
    name: "getExternallyLinkedWorkItems",
    description: `Returns the external links to other Work Items. (The same as the corresponding Java API method.)`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postExternallyLinkedWorkItems", {
    name: "postExternallyLinkedWorkItems",
    description: `Creates a list of Externally Linked Work Items.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["externallylinkedworkitems"],"type":"string"},"attributes":{"properties":{"role":{"type":"string"},"workItemURI":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Externally Linked Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteExternallyLinkedWorkItems", {
    name: "deleteExternallyLinkedWorkItems",
    description: `Deletes a list of Externally Linked Work Items.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["externallylinkedworkitems"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getExternallyLinkedWorkItem", {
    name: "getExternallyLinkedWorkItem",
    description: `Returns the external links to other Work Items. (The same as the corresponding Java API method.)`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"roleId":{"type":"string","description":"The Role ID."},"hostname":{"type":"string","description":"The Target Hostname."},"targetProjectId":{"type":"string","description":"The Target Project ID."},"linkedWorkItemId":{"type":"string","description":"The Linked Work Item ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","roleId","hostname","targetProjectId","linkedWorkItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems/{roleId}/{hostname}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"roleId","in":"path"},{"name":"hostname","in":"path"},{"name":"targetProjectId","in":"path"},{"name":"linkedWorkItemId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteExternallyLinkedWorkItem", {
    name: "deleteExternallyLinkedWorkItem",
    description: `Deletes the specified Externally Linked Work Item.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"roleId":{"type":"string","description":"The Role ID."},"hostname":{"type":"string","description":"The Target Hostname."},"targetProjectId":{"type":"string","description":"The Target Project ID."},"linkedWorkItemId":{"type":"string","description":"The Linked Work Item ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","roleId","hostname","targetProjectId","linkedWorkItemId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems/{roleId}/{hostname}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"roleId","in":"path"},{"name":"hostname","in":"path"},{"name":"targetProjectId","in":"path"},{"name":"linkedWorkItemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getFeatureSelections", {
    name: "getFeatureSelections",
    description: `Returns a list of Feature Selections.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/featureselections",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getFeatureSelection", {
    name: "getFeatureSelection",
    description: `Returns the specified Feature Selection.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"selectionTypeId":{"type":"string","description":"The Selection Type ID."},"targetProjectId":{"type":"string","description":"The Target Project ID."},"targetWorkItemId":{"type":"string","description":"The Target Work Item ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","selectionTypeId","targetProjectId","targetWorkItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/featureselections/{selectionTypeId}/{targetProjectId}/{targetWorkItemId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"selectionTypeId","in":"path"},{"name":"targetProjectId","in":"path"},{"name":"targetWorkItemId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getAvailableEnumOptionsForWorkItem", {
    name: "getAvailableEnumOptionsForWorkItem",
    description: `Returns a list of available options for the requested field for the specified Work Item.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"fieldId":{"type":"string","description":"The Field ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["projectId","workItemId","fieldId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/fields/{fieldId}/actions/getAvailableOptions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"fieldId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getCurrentEnumOptionsForWorkItem", {
    name: "getCurrentEnumOptionsForWorkItem",
    description: `Returns a list of selected options for the requested field for specific Work Item.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"fieldId":{"type":"string","description":"The Field ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","fieldId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/fields/{fieldId}/actions/getCurrentOptions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"fieldId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getOslcResources", {
    name: "getOslcResources",
    description: `Returns a list of instances.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedoslcresources",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postOslcResources", {
    name: "postOslcResources",
    description: `Creates a list of instances.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["linkedoslcresources"],"type":"string"},"attributes":{"properties":{"label":{"type":"string"},"role":{"type":"string"},"uri":{"type":"string"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Linked Oslc Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedoslcresources",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteOslcResources", {
    name: "deleteOslcResources",
    description: `Deletes a list of instances.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["linkedoslcresources"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Linked Oslc Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedoslcresources",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getLinkedWorkItems", {
    name: "getLinkedWorkItems",
    description: `Returns the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postLinkedWorkItems", {
    name: "postLinkedWorkItems",
    description: `Creates the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["linkedworkitems"],"type":"string"},"attributes":{"properties":{"revision":{"type":"string"},"role":{"type":"string"},"suspect":{"type":"boolean"}},"type":"object"},"relationships":{"properties":{"workItem":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["workitems"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Linked Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteLinkedWorkItems", {
    name: "deleteLinkedWorkItems",
    description: `Deletes the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["linkedworkitems"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Linked Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getLinkedWorkItem", {
    name: "getLinkedWorkItem",
    description: `Returns the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"roleId":{"type":"string","description":"The Role ID."},"targetProjectId":{"type":"string","description":"The Target Project ID."},"linkedWorkItemId":{"type":"string","description":"The Linked Work Item ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","roleId","targetProjectId","linkedWorkItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems/{roleId}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"roleId","in":"path"},{"name":"targetProjectId","in":"path"},{"name":"linkedWorkItemId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteLinkedWorkItem", {
    name: "deleteLinkedWorkItem",
    description: `Deletes the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"roleId":{"type":"string","description":"The Role ID."},"targetProjectId":{"type":"string","description":"The Target Project ID."},"linkedWorkItemId":{"type":"string","description":"The Linked Work Item ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","roleId","targetProjectId","linkedWorkItemId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems/{roleId}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"roleId","in":"path"},{"name":"targetProjectId","in":"path"},{"name":"linkedWorkItemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchLinkedWorkItem", {
    name: "patchLinkedWorkItem",
    description: `Updates the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"roleId":{"type":"string","description":"The Role ID."},"targetProjectId":{"type":"string","description":"The Target Project ID."},"linkedWorkItemId":{"type":"string","description":"The Linked Work Item ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["linkedworkitems"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"revision":{"type":"string"},"suspect":{"type":"boolean"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Linked Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","roleId","targetProjectId","linkedWorkItemId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems/{roleId}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"roleId","in":"path"},{"name":"targetProjectId","in":"path"},{"name":"linkedWorkItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItemsRelationships", {
    name: "getWorkItemsRelationships",
    description: `Returns a list of Work Item Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","relationshipId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"relationshipId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postWorkItemRelationships", {
    name: "postWorkItemRelationships",
    description: `Creates a list of Work Item Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"description":"The Relationship body.","oneOf":[{"properties":{"data":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"}},"type":"object"},{"properties":{"data":{"items":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}],"type":"object"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","relationshipId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteWorkItemsRelationship", {
    name: "deleteWorkItemsRelationship",
    description: `Deletes a list of Work Item Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Relationship body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","relationshipId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchWorkItemRelationships", {
    name: "patchWorkItemRelationships",
    description: `Updates a list of Work Item Relationships.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"relationshipId":{"type":"string","description":"The Relationship ID."},"requestBody":{"description":"The Relationship body.","oneOf":[{"properties":{"data":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"}},"type":"object"},{"properties":{"data":{"items":{"properties":{"id":{"example":"MyResourceId","type":"string"},"type":{"enum":["collections","categories","documents","document_attachments","document_comments","document_parts","enumerations","globalroles","icons","jobs","linkedworkitems","externallylinkedworkitems","linkedoslcresources","llms","pages","page_attachments","page_comments","plans","projectroles","projectgroups","projects","projecttemplates","spaces","testparameters","testparameter_definitions","testrecords","teststep_results","testruns","testrun_attachments","teststepresult_attachments","testrun_comments","usergroups","users","workitems","workitem_attachments","workitem_approvals","workitem_comments","featureselections","teststeps","workrecords","revisions","testrecord_attachments","license_slots","license_types","license","metadata","license_assignments","customfields"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}],"type":"object"},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","relationshipId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/relationships/{relationshipId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"relationshipId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItemTestParameterDefinitions", {
    name: "getWorkItemTestParameterDefinitions",
    description: `Returns a list of Test Parameter Definitions for the specified Work Item.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/testparameterdefinitions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkItemTestParameterDefinition", {
    name: "getWorkItemTestParameterDefinition",
    description: `Returns the specified Test Parameter Definition for the specified Work Item.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"testParamId":{"type":"string","description":"The Test Parameter."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","testParamId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"testParamId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestSteps", {
    name: "getTestSteps",
    description: `Returns a list of Test Steps.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postTestSteps", {
    name: "postTestSteps",
    description: `Creates a list of Test Steps.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["teststeps"],"type":"string"},"attributes":{"properties":{"keys":{"items":{"type":"string"},"type":"array"},"values":{"items":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Step(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestSteps", {
    name: "deleteTestSteps",
    description: `Deletes a list of Test Steps.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["teststeps"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Step(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestSteps", {
    name: "patchTestSteps",
    description: `Updates a list of Test Steps.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["teststeps"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"keys":{"items":{"type":"string"},"type":"array"},"values":{"items":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Test Step(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getTestStep", {
    name: "getTestStep",
    description: `Returns the specified Test Step.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"testStepIndex":{"type":"string","description":"The Test Step index."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","testStepIndex"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps/{testStepIndex}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"testStepIndex","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteTestStep", {
    name: "deleteTestStep",
    description: `Deletes the specified Test Step.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"testStepIndex":{"type":"string","description":"The Test Step index."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","testStepIndex"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps/{testStepIndex}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"testStepIndex","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchTestStep", {
    name: "patchTestStep",
    description: `Updates the specified Test Step.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"testStepIndex":{"type":"string","description":"The Test Step index."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["teststeps"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"keys":{"items":{"type":"string"},"type":"array"},"values":{"items":{"properties":{"type":{"enum":["text/html","text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object","description":"The Test Step(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","testStepIndex","requestBody"]},
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps/{testStepIndex}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"testStepIndex","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkRecords", {
    name: "getWorkRecords",
    description: `Returns a list of instances.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postWorkRecords", {
    name: "postWorkRecords",
    description: `Creates a list of Work Records.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workrecords"],"type":"string"},"attributes":{"properties":{"comment":{"type":"string"},"date":{"format":"date","type":"string"},"timeSpent":{"type":"string"},"type":{"type":"string"}},"type":"object"},"relationships":{"properties":{"user":{"properties":{"data":{"properties":{"id":{"type":"string"},"type":{"enum":["users"],"type":"string"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The Linked Work Item(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteWorkRecords", {
    name: "deleteWorkRecords",
    description: `Deletes a list of Work Records.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["workrecords"],"type":"string"},"id":{"type":"string"}},"type":"object"},"type":"array"}},"type":"object","description":"The Work Record(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","requestBody"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getWorkRecord", {
    name: "getWorkRecord",
    description: `Returns the specified instance.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"workRecordId":{"type":"string","description":"The Work Record ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["projectId","workItemId","workRecordId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords/{workRecordId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"workRecordId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteWorkRecord", {
    name: "deleteWorkRecord",
    description: `Deletes the specified Work Record.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"workItemId":{"type":"string","description":"The Work Item ID."},"workRecordId":{"type":"string","description":"The Work Record ID."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","workItemId","workRecordId"]},
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords/{workRecordId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"workItemId","in":"path"},{"name":"workRecordId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["moveWorkItemsToDocument", {
    name: "moveWorkItemsToDocument",
    description: `Moves multiple Work Items to the Document.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"requestBody":{"properties":{"targetDocument":{"type":"string"},"workItemGroups":{"items":{"properties":{"nextPart":{"type":"string"},"previousPart":{"type":"string"},"workItemIds":{"items":{"description":"The Work Item's path in the following format: ProjectId/workItemId","type":"string"},"type":"array"}},"type":"object"},"type":"array"}},"type":"object","description":"Moving Work Items to Document parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/actions/moveToDocument",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getAvailableEnumOptionsForWorkItemType", {
    name: "getAvailableEnumOptionsForWorkItemType",
    description: `Returns a list of available options for the requested field for the specified Work Item Type.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string","description":"The Project ID."},"fieldId":{"type":"string","description":"The Field ID."},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"type":{"type":"string","description":"The Type of the object. Use '~' without quotes to represent no target Type."}},"required":["projectId","fieldId"]},
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/fields/{fieldId}/actions/getAvailableOptions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"fieldId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"type","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["createProject", {
    name: "createProject",
    description: `Creates a new Project`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"location":{"description":"Location of the new Project to be created.","type":"string"},"params":{"description":"Parameters of new Project to be created.","type":["object","null"]},"projectId":{"description":"Id of the new Project to be created.","type":"string"},"templateId":{"description":"Id of the template to create the new Project from.","type":["string","null"]},"trackerPrefix":{"description":"Tracker prefix of the new Project to be created.","type":"string"}},"type":"object","description":"Create project parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/projects/actions/createProject",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["markProject", {
    name: "markProject",
    description: `Marks the Project.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"location":{"description":"Location of the new Project to be created.","type":"string"},"params":{"description":"Parameters of new Project to be created.","type":["object","null"]},"projectId":{"description":"Id of the new Project to be created.","type":"string"},"templateId":{"description":"Id of the template to create the new Project from.","type":["string","null"]},"trackerPrefix":{"description":"Tracker prefix of the new Project to be created.","type":"string"}},"type":"object","description":"Create project parameters."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/projects/actions/markProject",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getProjectTemplates", {
    name: "getProjectTemplates",
    description: `Returns a list of Project Templates.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}}},
    method: "get",
    pathTemplate: "/projecttemplates",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getRevisions", {
    name: "getRevisions",
    description: `Returns a list of instances.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."}}},
    method: "get",
    pathTemplate: "/revisions",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getRevision", {
    name: "getRevision",
    description: `Returns the specified instance.`,
    inputSchema: {"type":"object","properties":{"repositoryName":{"type":"string","description":"The Repository Name."},"revision":{"type":"string","description":"The revision ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["repositoryName","revision"]},
    method: "get",
    pathTemplate: "/revisions/{repositoryName}/{revision}",
    executionParameters: [{"name":"repositoryName","in":"path"},{"name":"revision","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getRole", {
    name: "getRole",
    description: `Returns the specified Global Role.`,
    inputSchema: {"type":"object","properties":{"roleId":{"type":"string","description":"The Role ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."}},"required":["roleId"]},
    method: "get",
    pathTemplate: "/roles/{roleId}",
    executionParameters: [{"name":"roleId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getRepositorySpacePages", {
    name: "getRepositorySpacePages",
    description: `Returns a list of Pages in a given Space on the Repository level.`,
    inputSchema: {"type":"object","properties":{"spaceId":{"type":"string","description":"The Space ID. (Use '_default' without quotes to address the default Space.)"},"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}},"required":["spaceId"]},
    method: "get",
    pathTemplate: "/spaces/{spaceId}/pages",
    executionParameters: [{"name":"spaceId","in":"path"},{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getCurrentUser", {
    name: "getCurrentUser",
    description: `Returns the current User.`,
    inputSchema: {"type":"object","properties":{"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}}},
    method: "get",
    pathTemplate: "/user",
    executionParameters: [{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getUserGroup", {
    name: "getUserGroup",
    description: `Returns the specified User Group.`,
    inputSchema: {"type":"object","properties":{"groupId":{"type":"string","description":"The Group ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["groupId"]},
    method: "get",
    pathTemplate: "/usergroups/{groupId}",
    executionParameters: [{"name":"groupId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getUsers", {
    name: "getUsers",
    description: `Returns a list of Users.`,
    inputSchema: {"type":"object","properties":{"page[size]":{"type":"number","format":"int32","description":"Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"page[number]":{"type":"number","format":"int32","description":"Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"query":{"type":"string","description":"The query string."},"sort":{"type":"string","description":"The sort string."},"revision":{"type":"string","description":"The revision ID."}}},
    method: "get",
    pathTemplate: "/users",
    executionParameters: [{"name":"page[size]","in":"query"},{"name":"page[number]","in":"query"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"query","in":"query"},{"name":"sort","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["postUsers", {
    name: "postUsers",
    description: `Creates a list of Users.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"properties":{"data":{"items":{"properties":{"type":{"enum":["users"],"type":"string"},"attributes":{"properties":{"description":{"properties":{"type":{"enum":["text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"disabledNotifications":{"type":"boolean"},"email":{"type":"string"},"id":{"type":"string"},"initials":{"type":"string"},"name":{"type":"string"}},"required":["id"],"type":"object"},"relationships":{"properties":{"globalRoles":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["globalroles"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"projectRoles":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["projectroles"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"userGroups":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["usergroups"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"},"type":"array"}},"type":"object","description":"The User(s) body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/users",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getUser", {
    name: "getUser",
    description: `Returns the specified User.`,
    inputSchema: {"type":"object","properties":{"userId":{"type":"string","description":"The User ID."},"fields":{"type":"object","additionalProperties":{"type":"string","description":"Comma-separated list of fields to include for this resource type"},"description":"Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"include":{"type":"string","description":"Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20250606201928474.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details."},"revision":{"type":"string","description":"The revision ID."}},"required":["userId"]},
    method: "get",
    pathTemplate: "/users/{userId}",
    executionParameters: [{"name":"userId","in":"path"},{"name":"fields","in":"query"},{"name":"include","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["patchUser", {
    name: "patchUser",
    description: `Updates the specified User.`,
    inputSchema: {"type":"object","properties":{"userId":{"type":"string","description":"The User ID."},"requestBody":{"properties":{"data":{"properties":{"type":{"enum":["users"],"type":"string"},"id":{"type":"string"},"attributes":{"properties":{"description":{"properties":{"type":{"enum":["text/plain"],"type":"string"},"value":{"type":"string"}},"type":"object"},"disabledNotifications":{"type":"boolean"},"email":{"type":"string"},"initials":{"type":"string"},"name":{"type":"string"}},"type":"object"},"relationships":{"properties":{"globalRoles":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["globalroles"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"projectRoles":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["projectroles"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"},"userGroups":{"properties":{"data":{"items":{"properties":{"id":{"type":"string"},"type":{"enum":["usergroups"],"type":"string"}},"type":"object"},"type":"array"}},"type":"object"}},"type":"object"}},"type":"object"}},"type":"object","description":"The User body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["userId","requestBody"]},
    method: "patch",
    pathTemplate: "/users/{userId}",
    executionParameters: [{"name":"userId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getAvatar", {
    name: "getAvatar",
    description: `Returns the specified User Avatar.`,
    inputSchema: {"type":"object","properties":{"userId":{"type":"string","description":"The User ID."}},"required":["userId"]},
    method: "get",
    pathTemplate: "/users/{userId}/actions/getAvatar",
    executionParameters: [{"name":"userId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["setLicense", {
    name: "setLicense",
    description: `Sets the User's license.`,
    inputSchema: {"type":"object","properties":{"userId":{"type":"string","description":"The User ID."},"requestBody":{"properties":{"concurrent":{"description":"Is concurrent user","type":"boolean"},"group":{"description":"License group","type":"string"},"license":{"description":"User's license type","enum":["REVIEWER","XReviewer","XBase","XEssentials","XPro","XStandard","XEnterprise","XAdvanced","XExtended","XPremium","XAutomotive","PRO","REQUIREMENTS","QA","ALM"],"type":"string"}},"type":"object","description":"The user license body."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["userId","requestBody"]},
    method: "post",
    pathTemplate: "/users/{userId}/actions/setLicense",
    executionParameters: [{"name":"userId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["updateAvatar", {
    name: "updateAvatar",
    description: `Updates the specified User Avatar.`,
    inputSchema: {"type":"object","properties":{"userId":{"type":"string","description":"The User ID."},"requestBody":{"type":"string","description":"Avatar file data."},"dry_run":{"type":"boolean","description":"If true, validate and return the request that would be sent without calling Polarion."}},"required":["userId"]},
    method: "post",
    pathTemplate: "/users/{userId}/actions/updateAvatar",
    executionParameters: [{"name":"userId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"bearerAuth":[]}]
  }]]);

export const securitySchemes = {
    "bearerAuth": {
      "bearerFormat": "JWT",
      "scheme": "bearer",
      "type": "http"
    }
  };
