# Local SDK Documentation (optional)

The MCP server can serve **local Polarion SDK/help PDFs** through:

- the `get_sdk_documentation` tool (extracts text for the assistant), and
- the `polarion://local/*` resources (returns the raw PDF).

These PDFs are **Siemens Polarion documentation and are intentionally NOT bundled
in this open-source repository** for licensing reasons. The server works fine
without them — those features simply report that the file is missing.

## Enabling local SDK documentation

If you have a licensed Polarion installation, copy the corresponding PDFs into
this `sdk/` directory using the **exact file names** below. They are available
from your Polarion server (`/polarion/sdk/doc/...`) or the Polarion help portal.

| Document ID (tool argument) | Expected file name in `sdk/`          |
| --------------------------- | ------------------------------------- |
| `admin-user-help`           | `Administrator and User Help.pdf`     |
| `deployment-guide`          | `Deployment and Maintenance Guide.pdf`|
| `feature-matrix`            | `Polarion_2506_Feature Matrix.pdf`    |
| `rest-api-guide` (default)  | `REST API User Guide for Polarion.pdf`|
| `scripting-guide`           | `scripting_guide_and_examples.pdf`    |

The file names are defined in `LOCAL_SDK_FILES` in
[`../src/config.ts`](../src/config.ts). Adjust them there if your file names
differ.

> Online documentation resources (`polarion://sdk/*`, `polarion://docs/*`) do not
> require these local files — they are fetched on demand from public Polarion/
> Siemens documentation URLs.
