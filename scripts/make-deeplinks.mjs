import { pathToFileURL } from 'node:url';

export function makeDeepLinks({ name = 'polarion-mcp', packageName = 'polarion-mcp' } = {}) {
  const server = {
    command: 'npx',
    args: ['-y', packageName],
  };
  const vscodeConfig = { name, ...server };
  const cursorConfig = JSON.stringify(server);

  return {
    vscode: `vscode:mcp/install?${encodeURIComponent(JSON.stringify(vscodeConfig))}`,
    cursor: `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${Buffer.from(cursorConfig).toString('base64')}`,
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const links = makeDeepLinks();
  console.log(`VS Code: ${links.vscode}`);
  console.log(`Cursor:  ${links.cursor}`);
}
