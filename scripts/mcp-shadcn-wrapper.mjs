/**
 * MCP Shadcn wrapper (sem token no mcp.json).
 *
 * Token (opcional, recomendado para rate limit maior):
 * - Use a variável do Windows GITHUB_MCP_TOKEN (que você já criou pro github-manager)
 * - O servidor do Shadcn lê GITHUB_PERSONAL_ACCESS_TOKEN
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(projectRoot);

const token =
  process.env.GITHUB_MCP_TOKEN ?? process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

if (token) {
  process.env.GITHUB_PERSONAL_ACCESS_TOKEN = token;
}

// Força stdio (modo padrão), para funcionar no Cursor.
process.env.MCP_TRANSPORT_MODE = process.env.MCP_TRANSPORT_MODE ?? "stdio";

const entry = path.join(
  projectRoot,
  "node_modules",
  "@jpisnice",
  "shadcn-ui-mcp-server",
  "build",
  "index.js"
);

const child = spawn(process.execPath, [entry], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));





