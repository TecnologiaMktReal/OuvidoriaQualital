/**
 * MCP Supabase Postgres wrapper (Windows-friendly).
 *
 * Objetivo: NÃO colocar a senha no C:\Users\ricar\.cursor\mcp.json.
 * A URL do banco vem de uma variável de ambiente do Windows:
 *   SUPABASE_CLOUD_DATABASE_URL=postgresql://postgres:SUA_SENHA@db.SEUPROJETO.supabase.co:5432/postgres
 *
 * O wrapper lê a variável e inicia o servidor oficial:
 *   node node_modules/@modelcontextprotocol/server-postgres/dist/index.js <DATABASE_URL>
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const envVarNamePrimary = "SUPABASE_CLOUD_DATABASE_URL";
const envVarNameFallback = "SUPABASE_CLOUD_DATABASE_URI"; // muita gente usa URI
const databaseUrl = process.env[envVarNamePrimary] ?? process.env[envVarNameFallback];

if (!databaseUrl) {
  console.error(
    `[mcp-supabase-postgres-wrapper] Variável de ambiente ausente: ${envVarNamePrimary} (ou ${envVarNameFallback})\n` +
      `Crie a variável no Windows e reinicie o Cursor.\n` +
      `Exemplo de valor: postgresql://postgres:SUA_SENHA@db.SEUPROJETO.supabase.co:5432/postgres`
  );
  process.exit(1);
}

// Caminho do servidor oficial instalado localmente via pnpm.
const serverEntrypoint = new URL(
  "../node_modules/@modelcontextprotocol/server-postgres/dist/index.js",
  import.meta.url
);
const serverEntrypointPath = fileURLToPath(serverEntrypoint);

// Garante que o cwd é a raiz do projeto (ajuda o Node a resolver node_modules no Windows).
const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(projectRoot);

// Inicia um processo Node separado para o servidor MCP (stdio herdado).
const child = spawn(process.execPath, [serverEntrypointPath, databaseUrl], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));





