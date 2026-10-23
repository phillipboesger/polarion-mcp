// Tool count: 2
export const toolDefinitionMap = new Map([
  ["getProjects", {
    name: "getProjects",
    inputSchema: {"type":"object","properties":{"projectId":{"type":"string"}},"required":["projectId"]},
  }],
  ["getUsers", {
    name: "getUsers",
    inputSchema: {"type":"object","properties":{}},
  }],
]);
