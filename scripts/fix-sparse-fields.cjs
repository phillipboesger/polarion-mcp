#!/usr/bin/env node

const fs = require('fs');

// Read the OpenAPI spec
const spec = JSON.parse(fs.readFileSync('openapi.json', 'utf8'));

// Find and simplify the sparseFields schema
if (spec.components && spec.components.schemas && spec.components.schemas.sparseFields) {
  console.log('Found sparseFields schema with', Object.keys(spec.components.schemas.sparseFields.properties || {}).length, 'properties');
  
  // Replace the complex schema with a simple additionalProperties pattern
  spec.components.schemas.sparseFields = {
    type: 'object',
    additionalProperties: {
      type: 'string',
      description: 'Comma-separated list of fields to include for this resource type'
    },
    description: 'Filter returned resource fields. See <a href="https://docs.sw.siemens.com/en-US/doc/230235217/PL20231017526942799.polarion_help_sc.xid2134849/xid2134871" target="_blank">REST API User Guide</a> for details.'
  };
  
  console.log('✅ Simplified sparseFields schema to use additionalProperties');
} else {
  console.log('⚠️ sparseFields schema not found');
}

// Write the modified spec back
fs.writeFileSync('openapi.json', JSON.stringify(spec, null, 2));
console.log('✅ Updated openapi.json');
