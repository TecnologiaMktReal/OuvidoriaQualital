# 🔑 Como Descobrir Seu UUID do Supabase

## Método 1: Supabase Dashboard (Mais Fácil)

1. Acesse: https://app.supabase.com
2. Selecione seu projeto (`aedirlkgmglxotajdnqt`)
3. Vá em **Authentication** → **Users**
4. Encontre seu usuário na lista
5. Clique nele
6. Copie o **User UID** (UUID)
   - Formato: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

## Método 2: Console do Navegador (Sistema Rodando)

1. Faça login no sistema: https://coopedusicia.zeabur.com
2. Abra o DevTools (F12)
3. Vá na aba **Console**
4. Execute:

```javascript
fetch('/api/trpc/auth.me')
  .then(r => r.json())
  .then(d => {
    console.log('Seu OpenID (UUID):', d.result?.data?.json?.openId);
    console.log('Email:', d.result?.data?.json?.email);
    console.log('Role Atual:', d.result?.data?.json?.profileRole);
  });
```

5. Copie o **OpenID** que aparecer

## Método 3: SQL no Supabase

1. Acesse: https://app.supabase.com
2. SQL Editor
3. Execute:

```sql
SELECT 
  id as uuid,
  email,
  raw_app_meta_data,
  raw_user_meta_data
FROM auth.users
WHERE email = 'seu.email@coopedu.coop.br';
```

---

## 🔧 Depois de Descobrir o UUID:

### No Zeabur:
1. Vá no seu serviço
2. **Environment Variables**
3. Adicione:
   ```
   OWNER_OPEN_ID=seu-uuid-copiado-aqui
   ```
4. **Deploy** (reinicie o serviço)

### Teste:
1. Faça **logout** do sistema
2. Faça **login** novamente
3. Agora você deve ser **admin automaticamente**! ✅

---

## 📝 Exemplo Completo:

```bash
# Se seu UUID for: a1b2c3d4-e5f6-7890-abcd-ef1234567890
# No Zeabur, adicione:
OWNER_OPEN_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Depois disso, você não precisará mais da ferramenta de correção! 🎉



