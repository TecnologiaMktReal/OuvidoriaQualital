# 🚀 Guia Rápido: Sync Schema Local → Zeabur

## Quando usar?

Sempre que você fizer alterações no schema do MySQL local (`drizzle/schema.ts`) e quiser aplicar no Zeabur.

---

## ✅ Método Recomendado: Arquivo .bat

### **Opção 1: Duplo Clique (Mais fácil)**

1. No explorador de arquivos, navegue até a pasta do projeto
2. Dê **duplo clique** em: `sync-to-zeabur.bat`
3. Revise o preview das mudanças
4. Digite `sim` para confirmar

**Pronto!** ✓

---

### **Opção 2: Via Terminal**

```powershell
# Windows PowerShell
.\sync-to-zeabur.bat

# Ou diretamente
$env:PRODUCTION_DATABASE_URL = "mysql://root:yu1TPfqXtW8iUc305FM46DlC7EB9Qd2s@sjc1.clusters.zeabur.com:20354/zeabur"
node scripts/sync-schema-to-production.mjs
```

---

### **Opção 3: NPM Script**

```bash
pnpm sync:zeabur
```

---

## 🔄 Fluxo Completo

```mermaid
graph LR
    A[Alterar schema.ts] --> B[pnpm db:push local]
    B --> C[Testar localmente]
    C --> D{Funcionou?}
    D -->|Sim| E[sync-to-zeabur.bat]
    D -->|Não| A
    E --> F[Revisar preview]
    F --> G{Confirmar?}
    G -->|sim| H[Aplicado no Zeabur!]
    G -->|não| I[Cancelado]
```

---

## 📋 Checklist Padrão

Sempre que alterar o schema:

- [ ] 1. Editar `drizzle/schema.ts`
- [ ] 2. Executar `pnpm db:push` (local)
- [ ] 3. Testar no ambiente local
- [ ] 4. Validar que funcionou
- [ ] 5. Executar `sync-to-zeabur.bat`
- [ ] 6. Revisar preview
- [ ] 7. Confirmar com `sim`
- [ ] 8. Testar no Zeabur

---

## 🎯 O que o script faz?

1. ✅ Conecta no MySQL do Zeabur
2. ✅ Verifica estado atual do banco
3. ✅ Mostra **PREVIEW** das mudanças
4. ✅ **PEDE SUA CONFIRMAÇÃO**
5. ✅ Aplica as mudanças
6. ✅ Valida o resultado

**Você tem controle total em cada etapa!**

---

## ⚙️ Se as credenciais mudarem

Edite o arquivo `sync-to-zeabur.bat` e atualize esta linha:

```bat
set PRODUCTION_DATABASE_URL=mysql://root:SENHA@HOST:PORTA/DATABASE
```

---

## 🆘 Troubleshooting

### Erro: "Cannot find module 'mysql2'"

```bash
pnpm add mysql2
```

### Erro: "Connection refused"

Verifique se as credenciais no arquivo `.bat` estão corretas.

### Script não pede confirmação

A variável `PRODUCTION_DATABASE_URL` não está configurada. Use o `.bat` ao invés de executar direto.

---

## 💡 Dica Pro

Crie um atalho do `sync-to-zeabur.bat` na sua área de trabalho para acesso rápido!


