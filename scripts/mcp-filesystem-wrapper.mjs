/**
 * Wrapper para rodar o MCP Filesystem localmente no Windows (compatível com Cursor).
 *
 * Problema: alguns servidores MCP escrevem logs em stderr e/ou o Cursor pode acabar
 * tentando interpretar saídas não-JSON como protocolo MCP, resultando em:
 *   "Unexpected token ... is not valid JSON"
 *
 * Solução: rodar o servidor real em um processo filho e:
 * - Replicar o STDOUT do filho para o STDOUT do wrapper (protocolo MCP)
 * - Redirecionar STDERR do filho para arquivo (não quebra o protocolo)
 *
 * Uso (no mcp.json):
 *  "command": "node",
 *  "args": ["C:/.../scripts/mcp-filesystem-wrapper.mjs", "C:/.../Help_Desk_Coopedu"]
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(projectRoot);

const allowedDirs = process.argv.slice(2);
if (allowedDirs.length === 0) {
  // não escrever no stdout (pode quebrar MCP); registra em arquivo e sai
  const logFile = path.join(projectRoot, ".cursor-mcp-filesystem.log");
  fs.appendFileSync(
    logFile,
    `[${new Date().toISOString()}] ERROR Nenhum diretório permitido informado.\n`,
    { encoding: "utf8" }
  );
  process.exit(1);
}

const logFile = path.join(projectRoot, ".cursor-mcp-filesystem.log");
const serverEntrypoint = path.join(
  projectRoot,
  "node_modules",
  "@modelcontextprotocol",
  "server-filesystem",
  "dist",
  "index.js"
);

const child = spawn(process.execPath, [serverEntrypoint, ...allowedDirs], {
  cwd: projectRoot,
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

// STDOUT do filho = protocolo MCP (deve ir direto pro Cursor)
child.stdout.on("data", (chunk) => process.stdout.write(chunk));

// STDERR do filho = logs (vai para arquivo)
child.stderr.on("data", (chunk) => {
  try {
    fs.appendFileSync(logFile, chunk, { encoding: "utf8" });
  } catch {
    // nunca escrever no stdout/stderr aqui
  }
});

child.on("exit", (code) => process.exit(code ?? 1));





