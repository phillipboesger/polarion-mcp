import type { McpToolDefinition } from "./types.js";

export const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([

  ["getDefaultIcons", {
    name: "getDefaultIcons",
    description: `Returns a list of Icons from the default context.`,
    inputSchema: { "type": "object", "properties": { "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } } },
    method: "get",
    pathTemplate: "/enumerations/defaulticons",
    executionParameters: [{ "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getDefaultIcon", {
    name: "getDefaultIcon",
    description: `Returns the specified Icon from the default context.`,
    inputSchema: { "type": "object", "properties": { "iconId": { "type": "string", "description": "The Icon ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["iconId"] },
    method: "get",
    pathTemplate: "/enumerations/defaulticons/{iconId}",
    executionParameters: [{ "name": "iconId", "in": "path" }, { "name": "fields", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getDocumentAttachment", {
    name: "getDocumentAttachment",
    description: `Returns the specified Document Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "documentName", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchDocumentAttachment", {
    name: "patchDocumentAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "spaceId", "documentName", "attachmentId"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "attachmentId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getDocumentAttachments", {
    name: "getDocumentAttachments",
    description: `Returns a list of Document Attachments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "documentName"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postDocumentItemAttachments", {
    name: "postDocumentItemAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "spaceId", "documentName", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getDocumentAttachmentContent", {
    name: "getDocumentAttachmentContent",
    description: `Downloads the file content for a specified Document Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "documentName", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/attachments/{attachmentId}/content",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getDocumentComment", {
    name: "getDocumentComment",
    description: `Returns the specified Document Comment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "commentId": { "type": "string", "description": "The Comment ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "documentName", "commentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/comments/{commentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "commentId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchDocumentComment", {
    name: "patchDocumentComment",
    description: `Updates the specified Document Comment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "commentId": { "type": "string", "description": "The Comment ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["document_comments"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "resolved": { "type": "boolean" } } } } } }, "description": "The Comment body." } }, "required": ["projectId", "spaceId", "documentName", "commentId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/comments/{commentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "commentId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getDocumentComments", {
    name: "getDocumentComments",
    description: `Returns a list of Document Comments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "documentName"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/comments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postDocumentComments", {
    name: "postDocumentComments",
    description: `Creates a list of Document Comments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["document_comments"] }, "attributes": { "type": "object", "properties": { "resolved": { "type": "boolean" }, "text": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } } } }, "relationships": { "type": "object", "properties": { "author": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } }, "parentComment": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["document_comments"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Comment(s) body." } }, "required": ["projectId", "spaceId", "documentName", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/comments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getDocumentParts", {
    name: "getDocumentParts",
    description: `Returns a list of Document Parts.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "documentName"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/parts",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postDocumentParts", {
    name: "postDocumentParts",
    description: `Creates a list of Document Parts.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["document_parts"] }, "attributes": { "type": "object", "properties": { "level": { "type": "number", "format": "int32" }, "type": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "nextPart": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["document_parts"] }, "id": { "type": "string" } } } } }, "previousPart": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["document_parts"] }, "id": { "type": "string" } } } } }, "workItem": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" }, "revision": { "type": "string" } } } } } } } } } } }, "description": "The Document Part(s) body." } }, "required": ["projectId", "spaceId", "documentName", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/parts",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getDocumentPart", {
    name: "getDocumentPart",
    description: `Returns the specified Document Part.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "partId": { "type": "string", "description": "The Document Part ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "documentName", "partId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/parts/{partId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "partId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getDocument", {
    name: "getDocument",
    description: `Returns the specified Document.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "documentName"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchDocument", {
    name: "patchDocument",
    description: `Updates the specified Document.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "workflowAction": { "type": "string", "description": "The Workflow Action." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["documents"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "autoSuspect": { "type": "boolean" }, "homePageContent": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "outlineNumbering": { "type": "object", "properties": { "prefix": { "type": "string" } } }, "renderingLayouts": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string" }, "label": { "type": "string" }, "layouter": { "type": "string" }, "properties": { "type": "array", "items": { "type": "object", "properties": { "key": { "type": "string" }, "value": { "type": "string" } } } } } } }, "status": { "type": "string" }, "title": { "type": "string" }, "type": { "type": "string" }, "usesOutlineNumbering": { "type": "boolean" } } } } } }, "description": "The Document body." } }, "required": ["projectId", "spaceId", "documentName", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "workflowAction", "in": "query" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["branchDocument", {
    name: "branchDocument",
    description: `Creates a Branch of the Document.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "revision": { "type": "string", "description": "The revision ID." }, "requestBody": { "type": "object", "properties": { "targetProjectId": { "type": "string", "description": "Project where new document will be created." }, "targetSpaceId": { "type": "string", "description": "Space where new document will be created." }, "targetDocumentName": { "type": "string", "description": "Name for new Document." }, "copyWorkflowStatusAndSignatures": { "type": "boolean", "description": "Specifies that workflow status and signatures should be copied to the branched document." }, "query": { "type": "string", "description": "Specifies optional filtering query." } }, "description": "Branching parameters." } }, "required": ["projectId", "spaceId", "documentName", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/actions/branch",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["copyDocument", {
    name: "copyDocument",
    description: `Creates a copy of the Document.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "revision": { "type": "string", "description": "The revision ID." }, "requestBody": { "type": "object", "properties": { "targetProjectId": { "type": "string", "description": "Project where new document will be created." }, "targetSpaceId": { "type": "string", "description": "Space where new document will be created." }, "targetDocumentName": { "type": "string", "description": "Name for new Document." }, "removeOutgoingLinks": { "type": "boolean", "description": "Should outgoing links be removed?" }, "linkOriginalItemsWithRole": { "type": "string", "description": "Link a copy of the document to the original." } }, "description": "Copy Document parameters." } }, "required": ["projectId", "spaceId", "documentName", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/actions/copy",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postDocuments", {
    name: "postDocuments",
    description: `Creates a list of Documents.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["documents"] }, "attributes": { "type": "object", "properties": { "autoSuspect": { "type": "boolean" }, "homePageContent": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "moduleName": { "type": "string" }, "outlineNumbering": { "type": "object", "properties": { "prefix": { "type": "string" } } }, "renderingLayouts": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string" }, "label": { "type": "string" }, "layouter": { "type": "string" }, "properties": { "type": "array", "items": { "type": "object", "properties": { "key": { "type": "string" }, "value": { "type": "string" } } } } } } }, "status": { "type": "string" }, "structureLinkRole": { "type": "string" }, "title": { "type": "string" }, "type": { "type": "string" }, "usesOutlineNumbering": { "type": "boolean" } } } } } } }, "description": "The Document body." } }, "required": ["projectId", "spaceId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getAvailableEnumOptionsForDocument", {
    name: "getAvailableEnumOptionsForDocument",
    description: `Returns a list of available options for the requested field in the specified Document.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "fieldId": { "type": "string", "description": "The Field ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["projectId", "spaceId", "documentName", "fieldId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/fields/{fieldId}/actions/getAvailableOptions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "fieldId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getCurrentEnumerationOptionsForDocument", {
    name: "getCurrentEnumerationOptionsForDocument",
    description: `Returns a list of selected options for the requested field in the specified Document.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Document name." }, "fieldId": { "type": "string", "description": "The Field ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "documentName", "fieldId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/fields/{fieldId}/actions/getCurrentOptions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }, { "name": "fieldId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["mergeDocumentFromMaster", {
    name: "mergeDocumentFromMaster",
    description: `Merges Master Work Item changes to the specified Branched Document.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Branch Document Name." }, "requestBody": { "type": "object", "properties": { "createBaseline": { "type": "boolean", "description": "Specifies whether the Baseline should be created." }, "userFilter": { "type": "string", "description": "Specifies the query to filter the source Work Items for the merge." } }, "description": "Merge Document parameters." } }, "required": ["projectId", "spaceId", "documentName"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/actions/mergeFromMaster",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["mergeDocumentToMaster", {
    name: "mergeDocumentToMaster",
    description: `Merges Work Item changes from specified Branched Document to Master.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "documentName": { "type": "string", "description": "The Branch Document Name." }, "requestBody": { "type": "object", "properties": { "createBaseline": { "type": "boolean", "description": "Specifies whether the Baseline should be created." }, "userFilter": { "type": "string", "description": "Specifies the query to filter the source Work Items for the merge." } }, "description": "Merge Document parameters." } }, "required": ["projectId", "spaceId", "documentName"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}/actions/mergeToMaster",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "documentName", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getAvailableEnumOptionsForDocumentType", {
    name: "getAvailableEnumOptionsForDocumentType",
    description: `Returns a list of available options for the requested field for the specified Document type.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "fieldId": { "type": "string", "description": "The Field ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "type": { "type": "string", "description": "The Type of the object." } }, "required": ["projectId", "fieldId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/documents/fields/{fieldId}/actions/getAvailableOptions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "fieldId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "type", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getExternallyLinkedWorkItems", {
    name: "getExternallyLinkedWorkItems",
    description: `Returns the external links to other Work Items. (The same as the corresponding Java API method.)`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postExternallyLinkedWorkItems", {
    name: "postExternallyLinkedWorkItems",
    description: `Creates a list of Externally Linked Work Items.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["externallylinkedworkitems"] }, "attributes": { "type": "object", "properties": { "role": { "type": "string" }, "workItemURI": { "type": "string" } } } } } } }, "description": "The Externally Linked Work Item(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteExternallyLinkedWorkItems", {
    name: "deleteExternallyLinkedWorkItems",
    description: `Deletes a list of Externally Linked Work Items.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["externallylinkedworkitems"] }, "id": { "type": "string" } } } } }, "description": "The Work Item(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getExternallyLinkedWorkItem", {
    name: "getExternallyLinkedWorkItem",
    description: `Returns the external links to other Work Items. (The same as the corresponding Java API method.)`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "roleId": { "type": "string", "description": "The Role ID." }, "hostname": { "type": "string", "description": "The Target Hostname." }, "targetProjectId": { "type": "string", "description": "The Target Project ID." }, "linkedWorkItemId": { "type": "string", "description": "The Linked Work Item ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "roleId", "hostname", "targetProjectId", "linkedWorkItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems/{roleId}/{hostname}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "roleId", "in": "path" }, { "name": "hostname", "in": "path" }, { "name": "targetProjectId", "in": "path" }, { "name": "linkedWorkItemId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteExternallyLinkedWorkItem", {
    name: "deleteExternallyLinkedWorkItem",
    description: `Deletes the specified Externally Linked Work Item.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "roleId": { "type": "string", "description": "The Role ID." }, "hostname": { "type": "string", "description": "The Target Hostname." }, "targetProjectId": { "type": "string", "description": "The Target Project ID." }, "linkedWorkItemId": { "type": "string", "description": "The Linked Work Item ID." } }, "required": ["projectId", "workItemId", "roleId", "hostname", "targetProjectId", "linkedWorkItemId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/externallylinkedworkitems/{roleId}/{hostname}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "roleId", "in": "path" }, { "name": "hostname", "in": "path" }, { "name": "targetProjectId", "in": "path" }, { "name": "linkedWorkItemId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getFeatureSelection", {
    name: "getFeatureSelection",
    description: `Returns the specified Feature Selection.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "selectionTypeId": { "type": "string", "description": "The Selection Type ID." }, "targetProjectId": { "type": "string", "description": "The Target Project ID." }, "targetWorkItemId": { "type": "string", "description": "The Target Work Item ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "selectionTypeId", "targetProjectId", "targetWorkItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/featureselections/{selectionTypeId}/{targetProjectId}/{targetWorkItemId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "selectionTypeId", "in": "path" }, { "name": "targetProjectId", "in": "path" }, { "name": "targetWorkItemId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getFeatureSelections", {
    name: "getFeatureSelections",
    description: `Returns a list of Feature Selections.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/featureselections",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["branchDocuments", {
    name: "branchDocuments",
    description: `Creates Branches of Documents.`,
    inputSchema: { "type": "object", "properties": { "requestBody": { "required": ["documentConfigurations"], "type": "object", "properties": { "documentConfigurations": { "minItems": 1, "type": "array", "items": { "required": ["sourceDocument"], "type": "object", "properties": { "sourceDocument": { "type": "string", "description": "Reference path of the source Document." }, "sourceRevision": { "type": "string", "description": "Revision of the source Document." }, "targetProjectId": { "type": "string", "description": "Project where new document will be created." }, "targetSpaceId": { "type": "string", "description": "Space where new document will be created." }, "targetDocumentName": { "type": "string", "description": "Name for new Document." }, "copyWorkflowStatusAndSignatures": { "type": "boolean", "description": "Specifies that workflow status and signatures should be copied to the branched document." }, "query": { "type": "string", "description": "Specifies optional filtering query." }, "targetDocumentTitle": { "type": "string", "description": "Title for new Document." }, "updateTitleHeading": { "type": "boolean", "description": "Specifies that title heading of the target Document should be set to the new Document's title." }, "overwriteWorkItems": { "type": "boolean", "description": "Specifies that Work Items in the branched Document should be overwritten (instead of being referenced)." }, "initializedFields": { "type": "array", "description": "Specifies fields of overwritten Work Items that should be initialized (instead of being copied from source Work Items).", "items": { "type": "string" } } } } } }, "description": "Branching parameters." } }, "required": ["requestBody"] },
    method: "post",
    pathTemplate: "/all/documents/actions/branch",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postGlobalEnumeration", {
    name: "postGlobalEnumeration",
    description: `Creates a list of Enumerations in the Global context.`,
    inputSchema: { "type": "object", "properties": { "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["enumerations"] }, "attributes": { "type": "object", "properties": { "enumContext": { "type": "string" }, "enumName": { "type": "string" }, "options": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "color": { "type": "string" }, "description": { "type": "string" }, "hidden": { "type": "boolean" }, "default": { "type": "boolean" }, "parent": { "type": "boolean" }, "oppositeName": { "type": "string" }, "columnWidth": { "type": "string" }, "iconURL": { "type": "string" }, "createDefect": { "type": "boolean" }, "templateWorkItem": { "type": "string" }, "minValue": { "type": "number" }, "requiresSignatureForTestCaseExecution": { "type": "boolean" }, "terminal": { "type": "boolean" } } } }, "targetType": { "type": "string" } } } } } } }, "description": "The Enumeration(s) body." } }, "required": ["requestBody"] },
    method: "post",
    pathTemplate: "/enumerations",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getGlobalEnumeration", {
    name: "getGlobalEnumeration",
    description: `Returns the specified Enumeration from the Global context.`,
    inputSchema: { "type": "object", "properties": { "enumContext": { "type": "string", "description": "The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)" }, "enumName": { "type": "string", "description": "The Enumeration Name." }, "targetType": { "type": "string", "description": "The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)" }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["enumContext", "enumName", "targetType"] },
    method: "get",
    pathTemplate: "/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{ "name": "enumContext", "in": "path" }, { "name": "enumName", "in": "path" }, { "name": "targetType", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteGlobalEnumeration", {
    name: "deleteGlobalEnumeration",
    description: `Deletes the specified Enumeration from the Global context.`,
    inputSchema: { "type": "object", "properties": { "enumContext": { "type": "string", "description": "The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)" }, "enumName": { "type": "string", "description": "The Enumeration Name." }, "targetType": { "type": "string", "description": "The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)" } }, "required": ["enumContext", "enumName", "targetType"] },
    method: "delete",
    pathTemplate: "/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{ "name": "enumContext", "in": "path" }, { "name": "enumName", "in": "path" }, { "name": "targetType", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchGlobalEnumeration", {
    name: "patchGlobalEnumeration",
    description: `Updates the specified Enumeration in the Global context.`,
    inputSchema: { "type": "object", "properties": { "enumContext": { "type": "string", "description": "The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)" }, "enumName": { "type": "string", "description": "The Enumeration Name." }, "targetType": { "type": "string", "description": "The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)" }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["enumerations"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "options": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "color": { "type": "string" }, "description": { "type": "string" }, "hidden": { "type": "boolean" }, "default": { "type": "boolean" }, "parent": { "type": "boolean" }, "oppositeName": { "type": "string" }, "columnWidth": { "type": "string" }, "iconURL": { "type": "string" }, "createDefect": { "type": "boolean" }, "templateWorkItem": { "type": "string" }, "minValue": { "type": "number" }, "requiresSignatureForTestCaseExecution": { "type": "boolean" }, "terminal": { "type": "boolean" } } } } } } } } }, "description": "The Enumeration(s) body." } }, "required": ["enumContext", "enumName", "targetType", "requestBody"] },
    method: "patch",
    pathTemplate: "/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{ "name": "enumContext", "in": "path" }, { "name": "enumName", "in": "path" }, { "name": "targetType", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getGlobalIcon", {
    name: "getGlobalIcon",
    description: `Returns the specified Icon from the Global context.`,
    inputSchema: { "type": "object", "properties": { "iconId": { "type": "string", "description": "The Icon ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["iconId"] },
    method: "get",
    pathTemplate: "/enumerations/icons/{iconId}",
    executionParameters: [{ "name": "iconId", "in": "path" }, { "name": "fields", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getGlobalIcons", {
    name: "getGlobalIcons",
    description: `Returns a list of Icons from the Global context.`,
    inputSchema: { "type": "object", "properties": { "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } } },
    method: "get",
    pathTemplate: "/enumerations/icons",
    executionParameters: [{ "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postGlobalIcons", {
    name: "postGlobalIcons",
    description: `Icons are identified by order`,
    inputSchema: { "type": "object", "properties": { "requestBody": { "type": "string", "description": "Icon meta data and file data" } }, "required": ["requestBody"] },
    method: "post",
    pathTemplate: "/enumerations/icons",
    executionParameters: [],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getRole", {
    name: "getRole",
    description: `Returns the specified Global Role.`,
    inputSchema: { "type": "object", "properties": { "roleId": { "type": "string", "description": "The Role ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["roleId"] },
    method: "get",
    pathTemplate: "/roles/{roleId}",
    executionParameters: [{ "name": "roleId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getAllWorkItems", {
    name: "getAllWorkItems",
    description: `Returns a list of Work Items from the Global context.`,
    inputSchema: { "type": "object", "properties": { "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "query": { "type": "string", "description": "The query string." }, "sort": { "type": "string", "description": "The sort string." }, "revision": { "type": "string", "description": "The revision ID." } } },
    method: "get",
    pathTemplate: "/all/workitems",
    executionParameters: [{ "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "query", "in": "query" }, { "name": "sort", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteAllWorkItems", {
    name: "deleteAllWorkItems",
    description: `Deletes a list of Work Items from the Global context.`,
    inputSchema: { "type": "object", "properties": { "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } }, "description": "The Work Item(s) body." } }, "required": ["requestBody"] },
    method: "delete",
    pathTemplate: "/all/workitems",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchAllWorkItems", {
    name: "patchAllWorkItems",
    description: `Updates a list of Work Items in the Global context.`,
    inputSchema: { "type": "object", "properties": { "workflowAction": { "type": "string", "description": "The Workflow Action." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "description": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "dueDate": { "type": "string", "format": "date" }, "hyperlinks": { "type": "array", "items": { "type": "object", "properties": { "role": { "type": "string" }, "uri": { "type": "string" } } } }, "initialEstimate": { "type": "string" }, "priority": { "type": "string" }, "remainingEstimate": { "type": "string" }, "resolution": { "type": "string" }, "resolvedOn": { "type": "string", "format": "date-time" }, "severity": { "type": "string" }, "status": { "type": "string" }, "timeSpent": { "type": "string" }, "title": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "assignee": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } }, "categories": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories"] }, "id": { "type": "string" } } } } } }, "linkedRevisions": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["revisions"] }, "id": { "type": "string" } } } } } }, "votes": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } }, "watches": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } } } } } } } }, "description": "The Work Item(s) body." } }, "required": ["requestBody"] },
    method: "patch",
    pathTemplate: "/all/workitems",
    executionParameters: [{ "name": "workflowAction", "in": "query" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getJobResultFileContent", {
    name: "getJobResultFileContent",
    description: `Downloads the file content for a specified job.`,
    inputSchema: { "type": "object", "properties": { "jobId": { "type": "string", "description": "The Job ID." }, "filename": { "type": "string", "description": "The Download File Name." } }, "required": ["jobId", "filename"] },
    method: "get",
    pathTemplate: "/jobs/{jobId}/actions/download/{filename}",
    executionParameters: [{ "name": "jobId", "in": "path" }, { "name": "filename", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getJob", {
    name: "getJob",
    description: `Returns the specified Job.`,
    inputSchema: { "type": "object", "properties": { "jobId": { "type": "string", "description": "The Job ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["jobId"] },
    method: "get",
    pathTemplate: "/jobs/{jobId}",
    executionParameters: [{ "name": "jobId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getOslcResources", {
    name: "getOslcResources",
    description: `Returns a list of instances.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "query": { "type": "string", "description": "The query string." }, "sort": { "type": "string", "description": "The sort string." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedoslcresources",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "query", "in": "query" }, { "name": "sort", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postOslcResources", {
    name: "postOslcResources",
    description: `Creates a list of instances.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["linkedoslcresources"] }, "attributes": { "type": "object", "properties": { "label": { "type": "string" }, "role": { "type": "string" }, "uri": { "type": "string" } } } } } } }, "description": "The Linked Oslc Item(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedoslcresources",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteOslcResources", {
    name: "deleteOslcResources",
    description: `Deletes a list of instances.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["linkedoslcresources"] }, "id": { "type": "string" } } } } }, "description": "The Linked Oslc Item(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedoslcresources",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getLinkedWorkItem", {
    name: "getLinkedWorkItem",
    description: `Returns the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "roleId": { "type": "string", "description": "The Role ID." }, "targetProjectId": { "type": "string", "description": "The Target Project ID." }, "linkedWorkItemId": { "type": "string", "description": "The Linked Work Item ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "roleId", "targetProjectId", "linkedWorkItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems/{roleId}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "roleId", "in": "path" }, { "name": "targetProjectId", "in": "path" }, { "name": "linkedWorkItemId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteLinkedWorkItem", {
    name: "deleteLinkedWorkItem",
    description: `Deletes the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "roleId": { "type": "string", "description": "The Role ID." }, "targetProjectId": { "type": "string", "description": "The Target Project ID." }, "linkedWorkItemId": { "type": "string", "description": "The Linked Work Item ID." } }, "required": ["projectId", "workItemId", "roleId", "targetProjectId", "linkedWorkItemId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems/{roleId}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "roleId", "in": "path" }, { "name": "targetProjectId", "in": "path" }, { "name": "linkedWorkItemId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchLinkedWorkItem", {
    name: "patchLinkedWorkItem",
    description: `Updates the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "roleId": { "type": "string", "description": "The Role ID." }, "targetProjectId": { "type": "string", "description": "The Target Project ID." }, "linkedWorkItemId": { "type": "string", "description": "The Linked Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["linkedworkitems"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "revision": { "type": "string" }, "suspect": { "type": "boolean" } } } } } }, "description": "The Linked Work Item(s) body." } }, "required": ["projectId", "workItemId", "roleId", "targetProjectId", "linkedWorkItemId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems/{roleId}/{targetProjectId}/{linkedWorkItemId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "roleId", "in": "path" }, { "name": "targetProjectId", "in": "path" }, { "name": "linkedWorkItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getLinkedWorkItems", {
    name: "getLinkedWorkItems",
    description: `Returns the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postLinkedWorkItems", {
    name: "postLinkedWorkItems",
    description: `Creates the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["linkedworkitems"] }, "attributes": { "type": "object", "properties": { "revision": { "type": "string" }, "role": { "type": "string" }, "suspect": { "type": "boolean" } } }, "relationships": { "type": "object", "properties": { "workItem": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Linked Work Item(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteLinkedWorkItems", {
    name: "deleteLinkedWorkItems",
    description: `Deletes the direct outgoing links to other Work Items. (The same as the corresponding Java API method.)  Does not pertain to external links or backlinks.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["linkedworkitems"] }, "id": { "type": "string" } } } } }, "description": "The Linked Work Item(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/linkedworkitems",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getPlans", {
    name: "getPlans",
    description: `Returns a list of Plans.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "query": { "type": "string", "description": "The query string." }, "sort": { "type": "string", "description": "The sort string." }, "revision": { "type": "string", "description": "The revision ID." }, "templates": { "type": "boolean", "description": "If set to true, only templates will be returned, otherwise only actual instances will be returned." } }, "required": ["projectId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/plans",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "query", "in": "query" }, { "name": "sort", "in": "query" }, { "name": "revision", "in": "query" }, { "name": "templates", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postPlans", {
    name: "postPlans",
    description: `Creates a list of Plans.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["plans"] }, "attributes": { "type": "object", "properties": { "allowedTypes": { "type": "array", "items": { "type": "string" } }, "calculationType": { "type": "string", "enum": ["timeBased", "customFieldBased"] }, "capacity": { "type": "number" }, "color": { "type": "string" }, "defaultEstimate": { "type": "number" }, "description": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/plain"] }, "value": { "type": "string" } } }, "dueDate": { "type": "string", "format": "date" }, "estimationField": { "type": "string" }, "finishedOn": { "type": "string", "format": "date-time" }, "homePageContent": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "id": { "type": "string" }, "isTemplate": { "type": "boolean" }, "name": { "type": "string" }, "previousTimeSpent": { "type": "string" }, "prioritizationField": { "type": "string" }, "sortOrder": { "type": "number", "format": "int32" }, "startDate": { "type": "string", "format": "date" }, "startedOn": { "type": "string", "format": "date-time" }, "status": { "type": "string" }, "useReportFromTemplate": { "type": "boolean" } } }, "relationships": { "type": "object", "properties": { "parent": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["plans"] }, "id": { "type": "string" } } } } }, "projectSpan": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["projects"] }, "id": { "type": "string" } } } } } }, "template": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["plans"] }, "id": { "type": "string" } } } } }, "workItems": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } } } } } } } } }, "description": "The Plan(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/plans",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deletePlans", {
    name: "deletePlans",
    description: `Deletes a list of Plans.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["plans"] }, "id": { "type": "string" } } } } }, "description": "The Plan(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/plans",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getPlan", {
    name: "getPlan",
    description: `Returns the specified Plan.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "planId": { "type": "string", "description": "The Plan ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "planId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/plans/{planId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "planId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deletePlan", {
    name: "deletePlan",
    description: `Deletes the specified Plan.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "planId": { "type": "string", "description": "The Plan ID." } }, "required": ["projectId", "planId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/plans/{planId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "planId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchPlan", {
    name: "patchPlan",
    description: `Updates the specified Plan.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "planId": { "type": "string", "description": "The Plan ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["plans"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "allowedTypes": { "type": "array", "items": { "type": "string" } }, "calculationType": { "type": "string", "enum": ["timeBased", "customFieldBased"] }, "capacity": { "type": "number" }, "color": { "type": "string" }, "defaultEstimate": { "type": "number" }, "description": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/plain"] }, "value": { "type": "string" } } }, "dueDate": { "type": "string", "format": "date" }, "estimationField": { "type": "string" }, "finishedOn": { "type": "string", "format": "date-time" }, "homePageContent": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "isTemplate": { "type": "boolean" }, "name": { "type": "string" }, "previousTimeSpent": { "type": "string" }, "prioritizationField": { "type": "string" }, "sortOrder": { "type": "number", "format": "int32" }, "startDate": { "type": "string", "format": "date" }, "startedOn": { "type": "string", "format": "date-time" }, "status": { "type": "string" }, "useReportFromTemplate": { "type": "boolean" } } }, "relationships": { "type": "object", "properties": { "parent": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["plans"] }, "id": { "type": "string" } } } } }, "projectSpan": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["projects"] }, "id": { "type": "string" } } } } } }, "workItems": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Plan body." } }, "required": ["projectId", "planId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/plans/{planId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "planId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getPlanRelationship", {
    name: "getPlanRelationship",
    description: `Returns a list of Plan Relationships.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "planId": { "type": "string", "description": "The Plan ID." }, "relationshipId": { "type": "string", "description": "The Relationship ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "planId", "relationshipId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/plans/{planId}/relationships/{relationshipId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "planId", "in": "path" }, { "name": "relationshipId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postPlanRelationships", {
    name: "postPlanRelationships",
    description: `Creates the specific Relationships for the Plan.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "planId": { "type": "string", "description": "The Plan ID." }, "relationshipId": { "type": "string", "description": "The Relationship ID." }, "requestBody": { "type": "object", "description": "The Work Item(s) body.", "oneOf": [{ "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string", "example": "MyProjectId/MyResourceId" } } } } }, { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string", "example": "MyProjectId/MyResourceId" } } } } } }] } }, "required": ["projectId", "planId", "relationshipId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/plans/{planId}/relationships/{relationshipId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "planId", "in": "path" }, { "name": "relationshipId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deletePlanRelationship", {
    name: "deletePlanRelationship",
    description: `Removes the specific Relationship from the Plan.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "planId": { "type": "string", "description": "The Plan ID." }, "relationshipId": { "type": "string", "description": "The Relationship ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string" } } } } }, "description": "The Relationship body." } }, "required": ["projectId", "planId", "relationshipId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/plans/{planId}/relationships/{relationshipId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "planId", "in": "path" }, { "name": "relationshipId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchPlanRelationships", {
    name: "patchPlanRelationships",
    description: `Updates a list of Plan Relationships.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "planId": { "type": "string", "description": "The Plan ID." }, "relationshipId": { "type": "string", "description": "The Relationship ID." }, "requestBody": { "type": "object", "description": "The Work Item(s) body.", "oneOf": [{ "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string", "example": "MyProjectId/MyResourceId" } } } } }, { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string", "example": "MyProjectId/MyResourceId" } } } } } }] } }, "required": ["projectId", "planId", "relationshipId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/plans/{planId}/relationships/{relationshipId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "planId", "in": "path" }, { "name": "relationshipId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getProjectEnumeration", {
    name: "getProjectEnumeration",
    description: `Returns the specified Enumeration from the Project context.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "enumContext": { "type": "string", "description": "The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)" }, "enumName": { "type": "string", "description": "The Enumeration Name." }, "targetType": { "type": "string", "description": "The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)" }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["projectId", "enumContext", "enumName", "targetType"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "enumContext", "in": "path" }, { "name": "enumName", "in": "path" }, { "name": "targetType", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteProjectEnumeration", {
    name: "deleteProjectEnumeration",
    description: `Deletes the specified Enumeration from the Project context.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "enumContext": { "type": "string", "description": "The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)" }, "enumName": { "type": "string", "description": "The Enumeration Name." }, "targetType": { "type": "string", "description": "The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)" } }, "required": ["projectId", "enumContext", "enumName", "targetType"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "enumContext", "in": "path" }, { "name": "enumName", "in": "path" }, { "name": "targetType", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchProjectEnumeration", {
    name: "patchProjectEnumeration",
    description: `Updates the specified Enumeration in the Project context.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "enumContext": { "type": "string", "description": "The Enumeration context. (Allowed values are '~', 'plans', 'testing' and 'documents'. Use '~' for Work Item or general enumerations.)" }, "enumName": { "type": "string", "description": "The Enumeration Name." }, "targetType": { "type": "string", "description": "The Enumeration target type. (Use '~' when there is no specific type for the enumeration.)" }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["enumerations"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "options": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "color": { "type": "string" }, "description": { "type": "string" }, "hidden": { "type": "boolean" }, "default": { "type": "boolean" }, "parent": { "type": "boolean" }, "oppositeName": { "type": "string" }, "columnWidth": { "type": "string" }, "iconURL": { "type": "string" }, "createDefect": { "type": "boolean" }, "templateWorkItem": { "type": "string" }, "minValue": { "type": "number" }, "requiresSignatureForTestCaseExecution": { "type": "boolean" }, "terminal": { "type": "boolean" } } } } } } } } }, "description": "The Enumeration(s) body." } }, "required": ["projectId", "enumContext", "enumName", "targetType", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/enumerations/{enumContext}/{enumName}/{targetType}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "enumContext", "in": "path" }, { "name": "enumName", "in": "path" }, { "name": "targetType", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postProjectEnumeration", {
    name: "postProjectEnumeration",
    description: `Creates a list of Enumerations in the Project context.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["enumerations"] }, "attributes": { "type": "object", "properties": { "enumContext": { "type": "string" }, "enumName": { "type": "string" }, "options": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "color": { "type": "string" }, "description": { "type": "string" }, "hidden": { "type": "boolean" }, "default": { "type": "boolean" }, "parent": { "type": "boolean" }, "oppositeName": { "type": "string" }, "columnWidth": { "type": "string" }, "iconURL": { "type": "string" }, "createDefect": { "type": "boolean" }, "templateWorkItem": { "type": "string" }, "minValue": { "type": "number" }, "requiresSignatureForTestCaseExecution": { "type": "boolean" }, "terminal": { "type": "boolean" } } } }, "targetType": { "type": "string" } } } } } } }, "description": "The Enumeration(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/enumerations",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getProjectIcon", {
    name: "getProjectIcon",
    description: `Returns the specified Icon from the Project context.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "iconId": { "type": "string", "description": "The Icon ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["projectId", "iconId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/enumerations/icons/{iconId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "iconId", "in": "path" }, { "name": "fields", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getProjectIcons", {
    name: "getProjectIcons",
    description: `Returns a list of Icons from the Project context.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["projectId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/enumerations/icons",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postProjectIcons", {
    name: "postProjectIcons",
    description: `Icons are identified by order`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string" }, "requestBody": { "type": "string", "description": "Icon meta data and file data" } }, "required": ["projectId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/enumerations/icons",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getProjectTemplates", {
    name: "getProjectTemplates",
    description: `Returns a list of Project Templates.`,
    inputSchema: { "type": "object", "properties": { "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } } },
    method: "get",
    pathTemplate: "/projecttemplates",
    executionParameters: [{ "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["markProject", {
    name: "markProject",
    description: `Marks the Project.`,
    inputSchema: { "type": "object", "properties": { "requestBody": { "type": "object", "properties": { "projectId": { "type": "string", "description": "Id of the new Project to be created." }, "trackerPrefix": { "type": "string", "description": "Tracker prefix of the new Project to be created." }, "location": { "type": "string", "description": "Location of the new Project to be created." }, "templateId": { "type": ["string", "null"], "description": "Id of the template to create the new Project from." }, "params": { "type": ["object", "null"], "description": "params of new Project to be created." } }, "description": "Create project parameters." } }, "required": ["requestBody"] },
    method: "post",
    pathTemplate: "/projects/actions/markProject",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["moveProjectAction", {
    name: "moveProjectAction",
    description: `Moves project to a different location`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "location": { "type": "string", "description": "Location of the new Project to be created." } }, "description": "Move project parameters." } }, "required": ["projectId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/actions/moveProject",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getProject", {
    name: "getProject",
    description: `Returns the specified Project.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteProject", {
    name: "deleteProject",
    description: `Deletes the specified Project.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." } }, "required": ["projectId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchProject", {
    name: "patchProject",
    description: `Updates the specified Project.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["projects"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "active": { "type": "boolean" }, "color": { "type": "string" }, "description": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/plain"] }, "value": { "type": "string" } } }, "finish": { "type": "string", "format": "date" }, "icon": { "type": "string" }, "lockWorkRecordsDate": { "type": "string", "format": "date" }, "name": { "type": "string" }, "start": { "type": "string", "format": "date" }, "trackerPrefix": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "lead": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } } } } } }, "description": "The Project body." } }, "required": ["projectId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getProjectTestParameterDefinitions", {
    name: "getProjectTestParameterDefinitions",
    description: `Returns a list of Test Parameter Definitions for the specified Project.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["projectId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postProjectTestParameterDefinitions", {
    name: "postProjectTestParameterDefinitions",
    description: `Creates a list of Test Parameter Definitions for the specified Project.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testparameter_definitions"] }, "attributes": { "type": "object", "properties": { "name": { "type": "string" } } } } } } }, "description": "The Test Parameter Definition(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteProjectTestParameterDefinitions", {
    name: "deleteProjectTestParameterDefinitions",
    description: `Deletes a list of Test Parameter Definitions for the specified Project.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testparameter_definitions"] }, "id": { "type": "string" } } } } }, "description": "The Test Parameter Definition(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getProjectTestParameterDefinition", {
    name: "getProjectTestParameterDefinition",
    description: `Returns the specified Test Parameter Definition for the specified Project.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testParamId": { "type": "string", "description": "The Test Parameter." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["projectId", "testParamId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testParamId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteProjectTestParameterDefinition", {
    name: "deleteProjectTestParameterDefinition",
    description: `Deletes the specified Test Parameter Definition for the specified Project.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testParamId": { "type": "string", "description": "The Test Parameter." } }, "required": ["projectId", "testParamId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testParamId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["createProject", {
    name: "createProject",
    description: `Creates a new Project`,
    inputSchema: { "type": "object", "properties": { "requestBody": { "type": "object", "properties": { "projectId": { "type": "string", "description": "Id of the new Project to be created." }, "trackerPrefix": { "type": "string", "description": "Tracker prefix of the new Project to be created." }, "location": { "type": "string", "description": "Location of the new Project to be created." }, "templateId": { "type": ["string", "null"], "description": "Id of the template to create the new Project from." }, "params": { "type": ["object", "null"], "description": "params of new Project to be created." } }, "description": "Create project parameters." } }, "required": ["requestBody"] },
    method: "post",
    pathTemplate: "/projects/actions/createProject",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["unmarkProject", {
    name: "unmarkProject",
    description: `Unmarks the Project.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." } }, "required": ["projectId"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/actions/unmarkProject",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getProjects", {
    name: "getProjects",
    description: `Returns a list of Projects.`,
    inputSchema: { "type": "object", "properties": { "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "query": { "type": "string", "description": "The query string." }, "sort": { "type": "string", "description": "The sort string." }, "revision": { "type": "string", "description": "The revision ID." } } },
    method: "get",
    pathTemplate: "/projects",
    executionParameters: [{ "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "query", "in": "query" }, { "name": "sort", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getRevision", {
    name: "getRevision",
    description: `Returns the specified instance.`,
    inputSchema: { "type": "object", "properties": { "repositoryName": { "type": "string", "description": "The Repository Name." }, "revision": { "type": "string", "description": "The revision ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["repositoryName", "revision"] },
    method: "get",
    pathTemplate: "/revisions/{repositoryName}/{revision}",
    executionParameters: [{ "name": "repositoryName", "in": "path" }, { "name": "revision", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getRevisions", {
    name: "getRevisions",
    description: `Returns a list of instances.`,
    inputSchema: { "type": "object", "properties": { "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "query": { "type": "string", "description": "The query string." }, "sort": { "type": "string", "description": "The sort string." } } },
    method: "get",
    pathTemplate: "/revisions",
    executionParameters: [{ "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "query", "in": "query" }, { "name": "sort", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postPageAttachments", {
    name: "postPageAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string" }, "spaceId": { "type": "string" }, "pageName": { "type": "string" }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "spaceId", "pageName", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "pageName", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getPageAttachment", {
    name: "getPageAttachment",
    description: `Returns the specified Page Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "pageName": { "type": "string", "description": "The Page name." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "pageName", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "pageName", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getPageAttachmentContent", {
    name: "getPageAttachmentContent",
    description: `Downloads the file content for a specified Page Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "pageName": { "type": "string", "description": "The Page name." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "pageName", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}/attachments/{attachmentId}/content",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "pageName", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getPage", {
    name: "getPage",
    description: `Returns the specified Page.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "pageName": { "type": "string", "description": "The Page name." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "spaceId", "pageName"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "pageName", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchRichPage", {
    name: "patchRichPage",
    description: `Updates the specified Page.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "spaceId": { "type": "string", "description": "The Space ID. (Use '_default' without quotes to address the default Space.)" }, "pageName": { "type": "string", "description": "The Page name." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["pages"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "title": { "type": "string" } } } } } }, "description": "The Page body." } }, "required": ["projectId", "spaceId", "pageName", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/spaces/{spaceId}/pages/{pageName}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "spaceId", "in": "path" }, { "name": "pageName", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRecordAttachment", {
    name: "getTestRecordAttachment",
    description: `Returns the specified Test Record Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRecordAttachment", {
    name: "deleteTestRecordAttachment",
    description: `Deletes the specified Test Record Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "attachmentId": { "type": "string", "description": "The Attachment ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "attachmentId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "attachmentId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestRecordAttachment", {
    name: "patchTestRecordAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "attachmentId"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "attachmentId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRecordAttachmentContent", {
    name: "getTestRecordAttachmentContent",
    description: `Downloads the file content for a specified Test Record Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments/{attachmentId}/content",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRecordAttachments", {
    name: "getTestRecordAttachments",
    description: `Returns a list of Test Record Attachments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestRecordAttachments", {
    name: "postTestRecordAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRecordAttachments", {
    name: "deleteTestRecordAttachments",
    description: `Deletes a list of Test Record Attachments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testrecord_attachments"] }, "id": { "type": "string" } } } } }, "description": "The Test Record Attachment(s) body." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRecords", {
    name: "getTestRecords",
    description: `Returns a list of Test Records.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." }, "testCaseProjectId": { "type": "string", "description": "testCaseProjectId" }, "testCaseId": { "type": "string", "description": "testCaseId" }, "testResultId": { "type": "string", "description": "testResultId" } }, "required": ["projectId", "testRunId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }, { "name": "testCaseProjectId", "in": "query" }, { "name": "testCaseId", "in": "query" }, { "name": "testResultId", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestRecords", {
    name: "postTestRecords",
    description: `Creates a list of Test Records.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testrecords"] }, "attributes": { "type": "object", "properties": { "comment": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "duration": { "type": "number" }, "executed": { "type": "string", "format": "date-time" }, "result": { "type": "string" }, "testCaseRevision": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "defect": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } }, "executedBy": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } }, "testCase": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Test Record(s) body." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestRecords", {
    name: "patchTestRecords",
    description: `Updates a list of Test Records.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testrecords"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "comment": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "duration": { "type": "number" }, "executed": { "type": "string", "format": "date-time" }, "result": { "type": "string" }, "testCaseRevision": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "defect": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } }, "executedBy": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Test Record(s) body." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRecord", {
    name: "getTestRecord",
    description: `Returns the specified Test Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRecord", {
    name: "deleteTestRecord",
    description: `Deletes the specified Test Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestRecord", {
    name: "patchTestRecord",
    description: `Updates the specified Test Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testrecords"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "comment": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "duration": { "type": "number" }, "executed": { "type": "string", "format": "date-time" }, "result": { "type": "string" }, "testCaseRevision": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "defect": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } }, "executedBy": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } } } } } }, "description": "The Test Record(s) body." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRecordTestParameters", {
    name: "getTestRecordTestParameters",
    description: `Returns a list of Test Parameters for the specified Test Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/testparameters",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestRecordTestParameters", {
    name: "postTestRecordTestParameters",
    description: `Creates a list of Test Parameters for the specified Test Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testparameters"] }, "attributes": { "type": "object", "properties": { "name": { "type": "string" }, "value": { "type": "string" } } } } } } }, "description": "The Test Parameter(s) body." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/testparameters",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRecordTestParameter", {
    name: "getTestRecordTestParameter",
    description: `Returns the specified Test Parameter for the specified Test Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testParamId": { "type": "string", "description": "The Test Parameter." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testParamId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/testparameters/{testParamId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testParamId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRecordTestParameter", {
    name: "deleteTestRecordTestParameter",
    description: `Deletes the specified Test Parameter for the specified Test Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testParamId": { "type": "string", "description": "The Test Parameter." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testParamId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/testparameters/{testParamId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testParamId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRunAttachment", {
    name: "getTestRunAttachment",
    description: `Returns the specified Test Run Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRunAttachment", {
    name: "deleteTestRunAttachment",
    description: `Deletes the specified Test Run Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "attachmentId": { "type": "string", "description": "The Attachment ID." } }, "required": ["projectId", "testRunId", "attachmentId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "attachmentId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestRunAttachment", {
    name: "patchTestRunAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string" }, "testRunId": { "type": "string" }, "attachmentId": { "type": "string" }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "testRunId", "attachmentId"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "attachmentId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRunAttachmentContent", {
    name: "getTestRunAttachmentContent",
    description: `Downloads the file content for a specified Test Run Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments/{attachmentId}/content",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRunAttachments", {
    name: "getTestRunAttachments",
    description: `Returns a list of Test Run Attachments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string" }, "testRunId": { "type": "string" }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestRunAttachments", {
    name: "postTestRunAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string" }, "testRunId": { "type": "string" }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRunAttachments", {
    name: "deleteTestRunAttachments",
    description: `Deletes a list of Test Run Attachments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testrun_attachments"] }, "id": { "type": "string" } } } } }, "description": "The Test Run Attachment(s) body." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRunComments", {
    name: "getTestRunComments",
    description: `Returns a list of Test Run Comments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestRunComments", {
    name: "postTestRunComments",
    description: `Creates a list of Test Run Comments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testrun_comments"] }, "attributes": { "type": "object", "properties": { "resolved": { "type": "boolean" }, "text": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "title": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "author": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } }, "parentComment": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testrun_comments"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Comment(s) body." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestRunComments", {
    name: "patchTestRunComments",
    description: `Updates a list of Test Run Comments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testrun_comments"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "resolved": { "type": "boolean" } } } } } } }, "description": "The Comment body." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRunComment", {
    name: "getTestRunComment",
    description: `Returns the specified Test Run Comment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "commentId": { "type": "string", "description": "The Comment ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "commentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments/{commentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "commentId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestRunComment", {
    name: "patchTestRunComment",
    description: `Updates the specified Test Run Comment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "commentId": { "type": "string", "description": "The Comment ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testrun_comments"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "resolved": { "type": "boolean" } } } } } }, "description": "The Comment body." } }, "required": ["projectId", "testRunId", "commentId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/comments/{commentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "commentId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRuns", {
    name: "getTestRuns",
    description: `Returns a list of Test Runs.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "query": { "type": "string", "description": "The query string." }, "sort": { "type": "string", "description": "The sort string." }, "revision": { "type": "string", "description": "The revision ID." }, "templates": { "type": "boolean", "description": "If set to true, only templates will be returned, otherwise only actual instances will be returned." } }, "required": ["projectId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "query", "in": "query" }, { "name": "sort", "in": "query" }, { "name": "revision", "in": "query" }, { "name": "templates", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestRuns", {
    name: "postTestRuns",
    description: `Creates a list of Test Runs.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testruns"] }, "attributes": { "type": "object", "properties": { "finishedOn": { "type": "string", "format": "date-time" }, "groupId": { "type": "string" }, "homePageContent": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "id": { "type": "string" }, "idPrefix": { "type": "string" }, "isTemplate": { "type": "boolean" }, "keepInHistory": { "type": "boolean" }, "query": { "type": "string" }, "selectTestCasesBy": { "type": "string", "enum": ["manualSelection", "staticQueryResult", "dynamicQueryResult", "staticLiveDoc", "dynamicLiveDoc", "automatedProcess"] }, "status": { "type": "string" }, "title": { "type": "string" }, "type": { "type": "string" }, "useReportFromTemplate": { "type": "boolean" } } }, "relationships": { "type": "object", "properties": { "document": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["documents"] }, "id": { "type": "string" }, "revision": { "type": "string" } } } } }, "projectSpan": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["projects"] }, "id": { "type": "string" } } } } } }, "summaryDefect": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } }, "template": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testruns"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Test Run(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRuns", {
    name: "deleteTestRuns",
    description: `Deletes a list of Test Runs.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testruns"] }, "id": { "type": "string" } } } } }, "description": "The Test Run(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestRuns", {
    name: "patchTestRuns",
    description: `Updates a list of Test Runs.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testruns"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "finishedOn": { "type": "string", "format": "date-time" }, "groupId": { "type": "string" }, "homePageContent": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "idPrefix": { "type": "string" }, "keepInHistory": { "type": "boolean" }, "query": { "type": "string" }, "selectTestCasesBy": { "type": "string", "enum": ["manualSelection", "staticQueryResult", "dynamicQueryResult", "staticLiveDoc", "dynamicLiveDoc", "automatedProcess"] }, "status": { "type": "string" }, "title": { "type": "string" }, "type": { "type": "string" }, "useReportFromTemplate": { "type": "boolean" } } }, "relationships": { "type": "object", "properties": { "document": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["documents"] }, "id": { "type": "string" }, "revision": { "type": "string" } } } } }, "projectSpan": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["projects"] }, "id": { "type": "string" } } } } } }, "summaryDefect": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Test Run(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRun", {
    name: "getTestRun",
    description: `Returns the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRun", {
    name: "deleteTestRun",
    description: `Deletes the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." } }, "required": ["projectId", "testRunId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestRun", {
    name: "patchTestRun",
    description: `Updates the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testruns"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "finishedOn": { "type": "string", "format": "date-time" }, "groupId": { "type": "string" }, "homePageContent": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "idPrefix": { "type": "string" }, "keepInHistory": { "type": "boolean" }, "query": { "type": "string" }, "selectTestCasesBy": { "type": "string", "enum": ["manualSelection", "staticQueryResult", "dynamicQueryResult", "staticLiveDoc", "dynamicLiveDoc", "automatedProcess"] }, "status": { "type": "string" }, "title": { "type": "string" }, "type": { "type": "string" }, "useReportFromTemplate": { "type": "boolean" } } }, "relationships": { "type": "object", "properties": { "document": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["documents"] }, "id": { "type": "string" }, "revision": { "type": "string" } } } } }, "projectSpan": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["projects"] }, "id": { "type": "string" } } } } } }, "summaryDefect": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } } } } } } }, "description": "The Test Run(s) body." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["importXUnitTestResults", {
    name: "importXUnitTestResults",
    description: `Imports XUnit test results.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "string", "description": "XUnit File." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/importXUnitTestResults",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/octet-stream",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["importExcelTestResults", {
    name: "importExcelTestResults",
    description: `Imports Excel test results.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "string", "description": "Excel import meta data and file data." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/importExcelTestResults",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getExportExcelTests", {
    name: "getExportExcelTests",
    description: `Exports tests to Excel.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "query": { "type": "string", "description": "The query string." }, "sortBy": { "type": "string", "description": "The property to sort the test results." }, "template": { "type": "string", "description": "The export template string." } }, "required": ["projectId", "testRunId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/exportTestsToExcel",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "query", "in": "query" }, { "name": "sortBy", "in": "query" }, { "name": "template", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["exportExcelTests", {
    name: "exportExcelTests",
    description: `Exports tests to Excel.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "query": { "type": "string" }, "sortby": { "type": "string" }, "template": { "type": "string" } }, "description": "Exports tests to Excel body." } }, "required": ["projectId", "testRunId"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/exportTestsToExcel",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRunTestParameterDefinitions", {
    name: "getTestRunTestParameterDefinitions",
    description: `Returns a list of Test Parameter Definitions for the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameterdefinitions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestRunParameterDefinitions", {
    name: "postTestRunParameterDefinitions",
    description: `Creates a list of Test Parameter Definitions for the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testparameter_definitions"] }, "attributes": { "type": "object", "properties": { "name": { "type": "string" } } } } } } }, "description": "The Test Parameter Definition(s) body." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameterdefinitions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRunTestParameterDefinition", {
    name: "getTestRunTestParameterDefinition",
    description: `Returns the specified Test Parameter Definition for the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testParamId": { "type": "string", "description": "The Test Parameter." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testParamId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testParamId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRunTestParameterDefinition", {
    name: "deleteTestRunTestParameterDefinition",
    description: `Deletes the specified Test Parameter Definition for the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testParamId": { "type": "string", "description": "The Test Parameter." } }, "required": ["projectId", "testRunId", "testParamId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testParamId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRunTestParameters", {
    name: "getTestRunTestParameters",
    description: `Returns a list of Test Parameters for the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestRunTestParameters", {
    name: "postTestRunTestParameters",
    description: `Creates a list of Test Parameters for the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testparameters"] }, "attributes": { "type": "object", "properties": { "name": { "type": "string" }, "value": { "type": "string" } } } } } } }, "description": "The Test Parameter(s) body." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRunTestParameters", {
    name: "deleteTestRunTestParameters",
    description: `Deletes a list of Test Parameters for the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["testparameters"] }, "id": { "type": "string" } } } } }, "description": "The Test Parameter(s) body." } }, "required": ["projectId", "testRunId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestRunTestParameter", {
    name: "getTestRunTestParameter",
    description: `Returns the specified Test Parameter for the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testParamId": { "type": "string", "description": "The Test Parameter." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testParamId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters/{testParamId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testParamId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestRunTestParameter", {
    name: "deleteTestRunTestParameter",
    description: `Deletes the specified Test Parameter for the specified Test Run.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testParamId": { "type": "string", "description": "The Test Parameter." } }, "required": ["projectId", "testRunId", "testParamId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testparameters/{testParamId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testParamId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkflowActionsForTestRun", {
    name: "getWorkflowActionsForTestRun",
    description: `Returns a list of Workflow Actions.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/actions/getWorkflowActions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestStepResult", {
    name: "getTestStepResult",
    description: `Returns the specified Test Step Result.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testStepIndex"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testStepIndex", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestStepResult", {
    name: "patchTestStepResult",
    description: `Updates the specified Test Step Result.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["teststep_results"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "comment": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "result": { "type": "string" } } } } } }, "description": "The Test Step(s) body." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testStepIndex", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testStepIndex", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestStepResults", {
    name: "getTestStepResults",
    description: `Returns a list of Test Step Results.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestStepResults", {
    name: "postTestStepResults",
    description: `Creates a list of Test Step Results.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["teststep_results"] }, "attributes": { "type": "object", "properties": { "comment": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "result": { "type": "string" } } } } } } }, "description": "The Test Step Result(s) body." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestStepResults", {
    name: "patchTestStepResults",
    description: `Updates a list of Test Step Results.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["teststep_results"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "comment": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "result": { "type": "string" } } } } } } }, "description": "The Test Step(s) body." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestStep", {
    name: "getTestStep",
    description: `Returns the specified Test Step.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "testStepIndex"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps/{testStepIndex}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "testStepIndex", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestStep", {
    name: "deleteTestStep",
    description: `Deletes the specified Test Step.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "testStepIndex": { "type": "string", "description": "The Test Step index." } }, "required": ["projectId", "workItemId", "testStepIndex"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps/{testStepIndex}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "testStepIndex", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestStep", {
    name: "patchTestStep",
    description: `Updates the specified Test Step.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["teststeps"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "keys": { "type": "array", "items": { "type": "string" } }, "values": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } } } } } } } }, "description": "The Test Step(s) body." } }, "required": ["projectId", "workItemId", "testStepIndex", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps/{testStepIndex}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "testStepIndex", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestSteps", {
    name: "getTestSteps",
    description: `Returns a list of Test Steps.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestSteps", {
    name: "postTestSteps",
    description: `Creates a list of Test Steps.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["teststeps"] }, "attributes": { "type": "object", "properties": { "keys": { "type": "array", "items": { "type": "string" } }, "values": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } } } } } } } } }, "description": "The Test Step(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestSteps", {
    name: "deleteTestSteps",
    description: `Deletes a list of Test Steps.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["teststeps"] }, "id": { "type": "string" } } } } }, "description": "The Test Step(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestSteps", {
    name: "patchTestSteps",
    description: `Updates a list of Test Steps.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["teststeps"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "keys": { "type": "array", "items": { "type": "string" } }, "values": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } } } } } } } } }, "description": "The Test Step(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/teststeps",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestStepResultAttachment", {
    name: "getTestStepResultAttachment",
    description: `Returns the specified Test Step Result Attachment for the specified Test Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testStepIndex", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testStepIndex", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestStepResultAttachment", {
    name: "deleteTestStepResultAttachment",
    description: `Deletes the specified Test Step Result Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "attachmentId": { "type": "string", "description": "The Attachment ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testStepIndex", "attachmentId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testStepIndex", "in": "path" }, { "name": "attachmentId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchTestStepResultAttachment", {
    name: "patchTestStepResultAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testStepIndex", "attachmentId"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testStepIndex", "in": "path" }, { "name": "attachmentId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestStepResultAttachmentContent", {
    name: "getTestStepResultAttachmentContent",
    description: `Downloads the file content for a specified Test Step Result Attachment for the specified Test Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testStepIndex", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments/{attachmentId}/content",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testStepIndex", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getTestStepResultAttachments", {
    name: "getTestStepResultAttachments",
    description: `Returns a list of Attachments for the specified Test Step Result.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testStepIndex"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testStepIndex", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postTestStepResultAttachments", {
    name: "postTestStepResultAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testStepIndex", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testStepIndex", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteTestStepResultAttachments", {
    name: "deleteTestStepResultAttachments",
    description: `Deletes a list of Test Step Result Attachments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "testRunId": { "type": "string", "description": "The Test Run ID." }, "testCaseProjectId": { "type": "string", "description": "The Testcase Project ID." }, "testCaseId": { "type": "string", "description": "The Testcase ID." }, "iteration": { "type": "string", "description": "The Iteration Number." }, "testStepIndex": { "type": "string", "description": "The Test Step index." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["teststepresult_attachments"] }, "id": { "type": "string" } } } } }, "description": "The Test Step Result Attachment(s) body." } }, "required": ["projectId", "testRunId", "testCaseProjectId", "testCaseId", "iteration", "testStepIndex", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords/{testCaseProjectId}/{testCaseId}/{iteration}/teststepresults/{testStepIndex}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "testRunId", "in": "path" }, { "name": "testCaseProjectId", "in": "path" }, { "name": "testCaseId", "in": "path" }, { "name": "iteration", "in": "path" }, { "name": "testStepIndex", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getUserGroup", {
    name: "getUserGroup",
    description: `Returns the specified User Group.`,
    inputSchema: { "type": "object", "properties": { "groupId": { "type": "string", "description": "The Group ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["groupId"] },
    method: "get",
    pathTemplate: "/usergroups/{groupId}",
    executionParameters: [{ "name": "groupId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getUser", {
    name: "getUser",
    description: `Returns the specified User.`,
    inputSchema: { "type": "object", "properties": { "userId": { "type": "string", "description": "The User ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["userId"] },
    method: "get",
    pathTemplate: "/users/{userId}",
    executionParameters: [{ "name": "userId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchUser", {
    name: "patchUser",
    description: `Updates the specified User.`,
    inputSchema: { "type": "object", "properties": { "userId": { "type": "string", "description": "The User ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "description": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/plain"] }, "value": { "type": "string" } } }, "disabledNotifications": { "type": "boolean" }, "email": { "type": "string" }, "initials": { "type": "string" }, "name": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "globalRoles": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["globalroles"] }, "id": { "type": "string" } } } } } }, "projectRoles": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["projectroles"] }, "id": { "type": "string" } } } } } }, "userGroups": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["usergroups"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The User body." } }, "required": ["userId", "requestBody"] },
    method: "patch",
    pathTemplate: "/users/{userId}",
    executionParameters: [{ "name": "userId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getUsers", {
    name: "getUsers",
    description: `Returns a list of Users.`,
    inputSchema: { "type": "object", "properties": { "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "query": { "type": "string", "description": "The query string." }, "sort": { "type": "string", "description": "The sort string." }, "revision": { "type": "string", "description": "The revision ID." } } },
    method: "get",
    pathTemplate: "/users",
    executionParameters: [{ "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "query", "in": "query" }, { "name": "sort", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postUsers", {
    name: "postUsers",
    description: `Creates a list of Users.`,
    inputSchema: { "type": "object", "properties": { "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "attributes": { "required": ["id"], "type": "object", "properties": { "description": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/plain"] }, "value": { "type": "string" } } }, "disabledNotifications": { "type": "boolean" }, "email": { "type": "string" }, "id": { "type": "string" }, "initials": { "type": "string" }, "name": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "globalRoles": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["globalroles"] }, "id": { "type": "string" } } } } } }, "projectRoles": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["projectroles"] }, "id": { "type": "string" } } } } } }, "userGroups": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["usergroups"] }, "id": { "type": "string" } } } } } } } } } } } }, "description": "The User(s) body." } }, "required": ["requestBody"] },
    method: "post",
    pathTemplate: "/users",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getAvatar", {
    name: "getAvatar",
    description: `Returns the specified User Avatar.`,
    inputSchema: { "type": "object", "properties": { "userId": { "type": "string", "description": "The User ID." } }, "required": ["userId"] },
    method: "get",
    pathTemplate: "/users/{userId}/actions/getAvatar",
    executionParameters: [{ "name": "userId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["updateAvatar", {
    name: "updateAvatar",
    description: `Updates the specified User Avatar.`,
    inputSchema: { "type": "object", "properties": { "userId": { "type": "string", "description": "The User ID." }, "requestBody": { "type": "string", "description": "Avatar file data." } }, "required": ["userId"] },
    method: "post",
    pathTemplate: "/users/{userId}/actions/updateAvatar",
    executionParameters: [{ "name": "userId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["setLicense", {
    name: "setLicense",
    description: `Sets the User's license.`,
    inputSchema: { "type": "object", "properties": { "userId": { "type": "string", "description": "The User ID." }, "requestBody": { "type": "object", "properties": { "license": { "type": "string", "description": "User's license type", "enum": ["REVIEWER", "XBase", "XPro", "XEnterprise", "PRO", "REQUIREMENTS", "QA", "ALM"] }, "group": { "type": "string", "description": "License group" }, "concurrent": { "type": "boolean", "description": "Is concurrent user" } }, "description": "The user license body." } }, "required": ["userId", "requestBody"] },
    method: "post",
    pathTemplate: "/users/{userId}/actions/setLicense",
    executionParameters: [{ "name": "userId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItemApprovals", {
    name: "getWorkItemApprovals",
    description: `Returns a list of instances.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postWorkItemApprovals", {
    name: "postWorkItemApprovals",
    description: `Creates a list of WorkItem Approvals.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitem_approvals"] }, "attributes": { "type": "object", "properties": { "status": { "type": "string", "enum": ["waiting", "approved", "disapproved"] } } }, "relationships": { "type": "object", "properties": { "user": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Linked Work Item(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteApprovals", {
    name: "deleteApprovals",
    description: `Deletes a list of Work Item Approvals.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitem_approvals"] }, "id": { "type": "string" } } } } }, "description": "The Workitem Approval(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchWorkItemApprovals", {
    name: "patchWorkItemApprovals",
    description: `Updates a list of instances.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitem_approvals"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "status": { "type": "string", "enum": ["waiting", "approved", "disapproved"] } } } } } } }, "description": "The Test Run(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItemApproval", {
    name: "getWorkItemApproval",
    description: `Returns the specified instance.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "userId": { "type": "string", "description": "The User ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "userId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals/{userId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "userId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteApproval", {
    name: "deleteApproval",
    description: `Deletes the specified Work Item Approval.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "userId": { "type": "string", "description": "The User ID." } }, "required": ["projectId", "workItemId", "userId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals/{userId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "userId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchWorkItemApproval", {
    name: "patchWorkItemApproval",
    description: `Updates the specified instance.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "userId": { "type": "string", "description": "The User ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitem_approvals"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "status": { "type": "string", "enum": ["waiting", "approved", "disapproved"] } } } } } }, "description": "The Test Run(s) body." } }, "required": ["projectId", "workItemId", "userId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/approvals/{userId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "userId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItemAttachments", {
    name: "getWorkItemAttachments",
    description: `Returns a list of  Work Item Attachments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string" }, "workItemId": { "type": "string" }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postWorkItemAttachments", {
    name: "postWorkItemAttachments",
    description: `Files are identified by order or optionally by the 'lid' attribute. See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string" }, "workItemId": { "type": "string" }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItemAttachment", {
    name: "getWorkItemAttachment",
    description: `Returns the specified Work Item Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteWorkItemAttachment", {
    name: "deleteWorkItemAttachment",
    description: `Deletes the specified Work Item Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "attachmentId": { "type": "string", "description": "The Attachment ID." } }, "required": ["projectId", "workItemId", "attachmentId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "attachmentId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchWorkItemAttachment", {
    name: "patchWorkItemAttachment",
    description: `See more in the <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a>.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string" }, "workItemId": { "type": "string" }, "attachmentId": { "type": "string" }, "requestBody": { "type": "string", "description": "Attachment meta data and file data." } }, "required": ["projectId", "workItemId", "attachmentId"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments/{attachmentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "attachmentId", "in": "path" }],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItemAttachmentContent", {
    name: "getWorkItemAttachmentContent",
    description: `Downloads the file content for a specified Work Item Attachment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "attachmentId": { "type": "string", "description": "The Attachment ID." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "attachmentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments/{attachmentId}/content",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "attachmentId", "in": "path" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getComment", {
    name: "getComment",
    description: `Returns the specified Work Item Comment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "commentId": { "type": "string", "description": "The Comment ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "commentId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/comments/{commentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "commentId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchComment", {
    name: "patchComment",
    description: `Updates the specified Work Item Comment.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "commentId": { "type": "string", "description": "The Comment ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitem_comments"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "resolved": { "type": "boolean" } } } } } }, "description": "The Comment body." } }, "required": ["projectId", "workItemId", "commentId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/comments/{commentId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "commentId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getComments", {
    name: "getComments",
    description: `Returns a list of Work Item Comments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/comments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postComments", {
    name: "postComments",
    description: `Creates a list of Work Item Comments.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitem_comments"] }, "attributes": { "type": "object", "properties": { "resolved": { "type": "boolean" }, "text": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "title": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "author": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } }, "parentComment": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitem_comments"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Comment(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/comments",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItem", {
    name: "getWorkItem",
    description: `Returns the specified Work Item.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchWorkItem", {
    name: "patchWorkItem",
    description: `Updates the specified Work Item.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "workflowAction": { "type": "string", "description": "The Workflow Action." }, "changeTypeTo": { "type": "string", "description": "The Type the Workitem to change to." }, "requestBody": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "description": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "dueDate": { "type": "string", "format": "date" }, "hyperlinks": { "type": "array", "items": { "type": "object", "properties": { "role": { "type": "string" }, "uri": { "type": "string" } } } }, "initialEstimate": { "type": "string" }, "priority": { "type": "string" }, "remainingEstimate": { "type": "string" }, "resolution": { "type": "string" }, "resolvedOn": { "type": "string", "format": "date-time" }, "severity": { "type": "string" }, "status": { "type": "string" }, "timeSpent": { "type": "string" }, "title": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "assignee": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } }, "categories": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories"] }, "id": { "type": "string" } } } } } }, "linkedRevisions": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["revisions"] }, "id": { "type": "string" } } } } } }, "votes": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } }, "watches": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Work Item body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "workflowAction", "in": "query" }, { "name": "changeTypeTo", "in": "query" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItems", {
    name: "getWorkItems",
    description: `Returns a list of Work Items.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "query": { "type": "string", "description": "The query string." }, "sort": { "type": "string", "description": "The sort string." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "query", "in": "query" }, { "name": "sort", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postWorkItems", {
    name: "postWorkItems",
    description: `Creates a list of Work Items.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "attributes": { "required": ["type"], "type": "object", "properties": { "description": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "dueDate": { "type": "string", "format": "date" }, "hyperlinks": { "type": "array", "items": { "type": "object", "properties": { "role": { "type": "string" }, "uri": { "type": "string" } } } }, "initialEstimate": { "type": "string" }, "priority": { "type": "string" }, "remainingEstimate": { "type": "string" }, "resolution": { "type": "string" }, "resolvedOn": { "type": "string", "format": "date-time" }, "severity": { "type": "string" }, "status": { "type": "string" }, "timeSpent": { "type": "string" }, "title": { "type": "string" }, "type": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "assignee": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } }, "author": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } }, "categories": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories"] }, "id": { "type": "string" } } } } } }, "linkedRevisions": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["revisions"] }, "id": { "type": "string" } } } } } }, "module": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["documents"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Work Item(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteWorkItems", {
    name: "deleteWorkItems",
    description: `Deletes a list of Work Items.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" } } } } }, "description": "The Work Item(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchWorkItems", {
    name: "patchWorkItems",
    description: `Updates a list of Work Items.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workflowAction": { "type": "string", "description": "The Workflow Action." }, "changeTypeTo": { "type": "string", "description": "The Type the Workitem to change to." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workitems"] }, "id": { "type": "string" }, "attributes": { "type": "object", "properties": { "description": { "type": "object", "properties": { "type": { "type": "string", "enum": ["text/html", "text/plain"] }, "value": { "type": "string" } } }, "dueDate": { "type": "string", "format": "date" }, "hyperlinks": { "type": "array", "items": { "type": "object", "properties": { "role": { "type": "string" }, "uri": { "type": "string" } } } }, "initialEstimate": { "type": "string" }, "priority": { "type": "string" }, "remainingEstimate": { "type": "string" }, "resolution": { "type": "string" }, "resolvedOn": { "type": "string", "format": "date-time" }, "severity": { "type": "string" }, "status": { "type": "string" }, "timeSpent": { "type": "string" }, "title": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "assignee": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } }, "categories": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories"] }, "id": { "type": "string" } } } } } }, "linkedRevisions": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["revisions"] }, "id": { "type": "string" } } } } } }, "votes": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } }, "watches": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } } } } } } } }, "description": "The Work Item(s) body." } }, "required": ["projectId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workflowAction", "in": "query" }, { "name": "changeTypeTo", "in": "query" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getAvailableEnumOptionsForWorkItemType", {
    name: "getAvailableEnumOptionsForWorkItemType",
    description: `Returns a list of available options for the requested field for the specified Work Item Type.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "fieldId": { "type": "string", "description": "The Field ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "type": { "type": "string", "description": "The Type of the object." } }, "required": ["projectId", "fieldId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/fields/{fieldId}/actions/getAvailableOptions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "fieldId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "type", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getAvailableEnumOptionsForWorkItem", {
    name: "getAvailableEnumOptionsForWorkItem",
    description: `Returns a list of available options for the requested field for the specified Work Item.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "fieldId": { "type": "string", "description": "The Field ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." } }, "required": ["projectId", "workItemId", "fieldId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/fields/{fieldId}/actions/getAvailableOptions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "fieldId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["moveFromDocument", {
    name: "moveFromDocument",
    description: `Moves the specified Work Item from the Document.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." } }, "required": ["projectId", "workItemId"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/actions/moveFromDocument",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["moveToDocument", {
    name: "moveToDocument",
    description: `Moves the specified Work Item to the Document.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "targetDocument": { "type": "string" }, "previousPart": { "type": "string" }, "nextPart": { "type": "string" } }, "description": "Moving Work Item to Document parameters." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/actions/moveToDocument",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItemsRelationships", {
    name: "getWorkItemsRelationships",
    description: `Returns a list of Work Item Relationships.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "relationshipId": { "type": "string", "description": "The Relationship ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "relationshipId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/relationships/{relationshipId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "relationshipId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postWorkItemRelationships", {
    name: "postWorkItemRelationships",
    description: `Creates a list of Work Item Relationships.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "relationshipId": { "type": "string", "description": "The Relationship ID." }, "requestBody": { "type": "object", "description": "The Relationship body.", "oneOf": [{ "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string", "example": "MyProjectId/MyResourceId" } } } } }, { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string", "example": "MyProjectId/MyResourceId" } } } } } }] } }, "required": ["projectId", "workItemId", "relationshipId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/relationships/{relationshipId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "relationshipId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteWorkItemsRelationship", {
    name: "deleteWorkItemsRelationship",
    description: `Deletes a list of Work Item Relationships.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "relationshipId": { "type": "string", "description": "The Relationship ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string" } } } } }, "description": "The Relationship body." } }, "required": ["projectId", "workItemId", "relationshipId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/relationships/{relationshipId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "relationshipId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["patchWorkItemRelationships", {
    name: "patchWorkItemRelationships",
    description: `Updates a list of Work Item Relationships.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "relationshipId": { "type": "string", "description": "The Relationship ID." }, "requestBody": { "type": "object", "description": "The Relationship body.", "oneOf": [{ "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string", "example": "MyProjectId/MyResourceId" } } } } }, { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["categories", "documents", "document_attachments", "document_comments", "document_parts", "enumerations", "globalroles", "icons", "jobs", "linkedworkitems", "externallylinkedworkitems", "linkedoslcresources", "pages", "page_attachments", "plans", "projectroles", "projectgroups", "projects", "projecttemplates", "spaces", "testparameters", "testparameter_definitions", "testrecords", "teststep_results", "testruns", "testrun_attachments", "teststepresult_attachments", "testrun_comments", "usergroups", "users", "workitems", "workitem_attachments", "workitem_approvals", "workitem_comments", "featureselections", "teststeps", "workrecords", "revisions", "testrecord_attachments"] }, "id": { "type": "string", "example": "MyProjectId/MyResourceId" } } } } } }] } }, "required": ["projectId", "workItemId", "relationshipId", "requestBody"] },
    method: "patch",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/relationships/{relationshipId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "relationshipId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItemTestParameterDefinitions", {
    name: "getWorkItemTestParameterDefinitions",
    description: `Returns a list of Test Parameter Definitions for the specified Work Item.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/testparameterdefinitions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkItemTestParameterDefinition", {
    name: "getWorkItemTestParameterDefinition",
    description: `Returns the specified Test Parameter Definition for the specified Work Item.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "testParamId": { "type": "string", "description": "The Test Parameter." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "testParamId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/testparameterdefinitions/{testParamId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "testParamId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkflowActionsForWorkItem", {
    name: "getWorkflowActionsForWorkItem",
    description: `Returns a list of Workflow Actions.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/actions/getWorkflowActions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getCurrentEnumOptionsForWorkItem", {
    name: "getCurrentEnumOptionsForWorkItem",
    description: `Returns a list of selected options for the requested field for specific Work Item.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "fieldId": { "type": "string", "description": "The Field ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "fieldId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/fields/{fieldId}/actions/getCurrentOptions",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "fieldId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkRecord", {
    name: "getWorkRecord",
    description: `Returns the specified instance.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "workRecordId": { "type": "string", "description": "The Work Record ID." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId", "workRecordId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords/{workRecordId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "workRecordId", "in": "path" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteWorkRecord", {
    name: "deleteWorkRecord",
    description: `Deletes the specified Work Record.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "workRecordId": { "type": "string", "description": "The Work Record ID." } }, "required": ["projectId", "workItemId", "workRecordId"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords/{workRecordId}",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "workRecordId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getWorkRecords", {
    name: "getWorkRecords",
    description: `Returns a list of instances.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "page_size": { "type": "number", "format": "int32", "description": "Limit the number of entities returned in a single response. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "page_number": { "type": "number", "format": "int32", "description": "Specify the page number to be returned. Counting starts from 1. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "fields": { "type": "object", "additionalProperties": { "type": "string", "description": "Comma-separated list of fields to include for this resource type" }, "description": "Filter returned resource fields. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "include": { "type": "string", "description": "Include related entities. See <a href=\"https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871\" target=\"_blank\">REST API User Guide</a> for details." }, "revision": { "type": "string", "description": "The revision ID." } }, "required": ["projectId", "workItemId"] },
    method: "get",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }, { "name": "page[size]", "in": "query" }, { "name": "page[number]", "in": "query" }, { "name": "fields", "in": "query" }, { "name": "include", "in": "query" }, { "name": "revision", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["postWorkRecords", {
    name: "postWorkRecords",
    description: `Creates a list of Work Records.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workrecords"] }, "attributes": { "type": "object", "properties": { "comment": { "type": "string" }, "date": { "type": "string", "format": "date" }, "timeSpent": { "type": "string" }, "type": { "type": "string" } } }, "relationships": { "type": "object", "properties": { "user": { "type": "object", "properties": { "data": { "type": "object", "properties": { "type": { "type": "string", "enum": ["users"] }, "id": { "type": "string" } } } } } } } } } } }, "description": "The Linked Work Item(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "post",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteWorkRecords", {
    name: "deleteWorkRecords",
    description: `Deletes a list of Work Records.`,
    inputSchema: { "type": "object", "properties": { "projectId": { "type": "string", "description": "The Project ID." }, "workItemId": { "type": "string", "description": "The Work Item ID." }, "requestBody": { "type": "object", "properties": { "data": { "type": "array", "items": { "type": "object", "properties": { "type": { "type": "string", "enum": ["workrecords"] }, "id": { "type": "string" } } } } }, "description": "The Work Record(s) body." } }, "required": ["projectId", "workItemId", "requestBody"] },
    method: "delete",
    pathTemplate: "/projects/{projectId}/workitems/{workItemId}/workrecords",
    executionParameters: [{ "name": "projectId", "in": "path" }, { "name": "workItemId", "in": "path" }],
    requestBodyContentType: "application/json",
    securityRequirements: [{ "bearerAuth": [] }]
  }],

  // Custom MCP tools for configuration management
  ["refresh_polarion_config", {
    name: "refresh_polarion_config",
    description: `Refreshes and caches the Polarion project configuration including work item types, custom fields, workflows, and enumerations. This should be called before creating or updating work items to ensure proper field validation.`,
    inputSchema: {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "The Project ID to fetch configuration for."
        }
      },
      "required": ["projectId"]
    },
    method: "get",
    pathTemplate: "/projects/{projectId}",
    executionParameters: [{ "name": "projectId", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],

  // Custom MCP tool for retrieving SDK documentation PDF files
  ["get_sdk_documentation", {
    name: "get_sdk_documentation",
    description: `Retrieves SDK documentation PDF files from the local sdk/ directory. Available documents: admin-user-help (Administrator and User Help), deployment-guide (Deployment and Maintenance Guide), feature-matrix (Polarion Feature Matrix), rest-api-guide (REST API User Guide), scripting-guide (Scripting Guide and Examples).`,
    inputSchema: {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string",
          "description": "The document ID to retrieve. Options: 'admin-user-help', 'deployment-guide', 'feature-matrix', 'rest-api-guide', 'scripting-guide'. Defaults to 'rest-api-guide' if not specified.",
          "enum": ["admin-user-help", "deployment-guide", "feature-matrix", "rest-api-guide", "scripting-guide"]
        }
      },
      "required": []
    },
    method: "get",
    pathTemplate: "/sdk/documentation",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: []
  }],
]);

export const securitySchemes = {
  "bearerAuth": {
    "type": "http",
    "scheme": "bearer",
    "bearerFormat": "JWT"
  }
};
