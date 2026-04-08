---
description: Pipeline automatizado de deploy para AWS EC2 (ouvidoriaqualital.ricass.com.br).
---

# /deploy - AWS Production Deployment

$ARGUMENTS

// turbo-all

## Objetivo

Este workflow gerencia o processo de publicação (deploy) da aplicação OuvidoriaQualital diretamente na máquina de produção na AWS (EC2). 
Com a anotação `// turbo-all`, o Agente possui autorização (Bypass) para rodar a esteira de SSH silenciosamente sempre que o usuário invocar o slash command.

---

## Roteiro de Execução do Bot (Automático)

Ao ser acionado `/deploy` ou `/deploy aws`, o assistente deve obrigatoriamente executar as seguintes etapas:

1. **Commit Local (Opcional)**
   - O assistente deve verificar antes com `git status` se há algo novo para commitar.
   - O assistente tentará o `git push`. Caso trave por conta de credenciais do Windows, avisará o usuário para dar o push.

2. **Conexão SSH & Build Automático (Pipeline EC2)**
   - O assistente executará o seguinte comando remoto *em background*:
   ```bash
   ssh -i C:\Users\ricar\Downloads\OuvidoriaQualital.pem -o StrictHostKeyChecking=no ubuntu@ouvidoriaqualital.ricass.com.br "cd ~/app/OuvidoriaQualital && git stash && git pull && pnpm install --no-frozen-lockfile && pnpm run build && pm2 restart all"
   ```
   *Nota técnica: O `pnpm install --no-frozen-lockfile` garante que conflitos antigos de patch não paralizem o deploy na hora do sync.*

3. **Validação e Logs**
   - Na sequência, o assistente verifica se a aplicação subiu com a versão correta conferindo a tabela do PM2:
   ```bash
   ssh -i C:\Users\ricar\Downloads\OuvidoriaQualital.pem -o StrictHostKeyChecking=no ubuntu@ouvidoriaqualital.ricass.com.br "pm2 status"
   ```

4. **Notificação Visual**
   - Imprima um alerta Github verde `> [!NOTE]` indicando o sucesso do Deploy juntamente com o log resumido do PM2.

---

## Exemplo de gatilhos suportados pelo usuário:
`/deploy`
`/deploy aws`
`/deploy prod`
