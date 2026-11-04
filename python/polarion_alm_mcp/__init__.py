"""Launch the matching release of phillipboesger/polarion-mcp through npx."""

import os
import shutil
import subprocess
import sys

__version__ = "1.5.0"


def main():
    """Preserve stdio and the environment for the underlying MCP server."""
    if sys.argv[1:] == ["--version"]:
        print(__version__)
        return 0
    node = shutil.which("node")
    npx = shutil.which("npx")
    if not node or not npx:
        print("polarion-alm-mcp requires Node.js 22+ and npm/npx on PATH. "
              "Install them from https://nodejs.org/", file=sys.stderr)
        return 1
    try:
        version = subprocess.check_output([node, "--version"], text=True).strip()
        if int(version.lstrip("v").split(".")[0]) < 22:
            raise ValueError("Node.js is too old")
    except (OSError, ValueError, subprocess.CalledProcessError):
        print("polarion-alm-mcp requires Node.js 22 or newer.", file=sys.stderr)
        return 1
    args = [npx, "--yes", f"polarion-mcp@{__version__}", *sys.argv[1:]]
    if os.name == "posix":
        os.execv(npx, args)
    return subprocess.call(args)
