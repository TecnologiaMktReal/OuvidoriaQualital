/**
 * MCP Context7 wrapper (sem segredo no mcp.json).
 *
 * Opcional: você pode criar a variável do Windows CONTEXT7_API_KEY para rate limit maior.
 * Este wrapper NÃO imprime no stdout (o stdout é reservado ao protocolo MCP).
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(projectRoot);

// Context7 lê CONTEXT7_API_KEY do ambiente automaticamente (ou você pode passar --api-key, se quiser).
const entry = path.join(
  projectRoot,
  "node_modules",
  "@upstash",
  "context7-mcp",
  "dist",
  "index.js"
);

const child = spawn(process.execPath, [entry], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));





