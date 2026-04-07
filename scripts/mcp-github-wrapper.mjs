/**
 * MCP GitHub wrapper (Windows-friendly).
 *
 * Objetivo: NÃO colocar o token no C:\Users\ricar\.cursor\mcp.json.
 *
 * Como funciona:
 * - Você cria uma variável de ambiente do Windows com o token:
 *     GITHUB_MCP_TOKEN=<seu_token>
 *   (ou pode usar diretamente GITHUB_PERSONAL_ACCESS_TOKEN)
 * - Este wrapper copia GITHUB_MCP_TOKEN -> GITHUB_PERSONAL_ACCESS_TOKEN
 *   e inicia o servidor oficial do GitHub MCP instalado localmente.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const token =
  process.env.GITHUB_MCP_TOKEN ?? process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

if (!token) {
  // Não escreva em stdout (pode quebrar o protocolo MCP). Stderr é ok.
  console.error(
    `[mcp-github-wrapper] Token ausente.\n` +
      `Crie a variável do Windows GITHUB_MCP_TOKEN (recomendado) e reinicie o Cursor.\n` +
      `Alternativa: usar GITHUB_PERSONAL_ACCESS_TOKEN.`
  );
  process.exit(1);
}

// Garante cwd na raiz do projeto (ajuda a resolver node_modules no Windows).
const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(projectRoot);

// Propaga token para o nome que o servidor oficial espera.
process.env.GITHUB_PERSONAL_ACCESS_TOKEN = token;

const entry = path.join(
  projectRoot,
  "node_modules",
  "@modelcontextprotocol",
  "server-github",
  "dist",
  "index.js"
);

const child = spawn(process.execPath, [entry], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));






