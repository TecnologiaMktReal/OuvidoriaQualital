# 🔧 Como Aplicar o Schema no Banco de Produção (Zeabur)

## ⚠️ Problema Identificado
O banco MySQL no Zeabur **não tem as tabelas criadas**. Precisa executar o schema.

---

## ✅ Método 1: Drizzle Push (Mais Rápido)

### **Passo 1: Obter a Connection String do Zeabur**

1. Acesse o painel do Zeabur
2. Vá no serviço MySQL
3. Copie a **Connection String** completa
   - Formato: `mysql://root:senha@host:port/database`
   - Exemplo: `mysql://root:abc123@mysql.zeabur.app:3306/zeabur`

### **Passo 2: Configurar Temporariamente no Local**

Crie um arquivo `.env.production` (temporário):

```bash
DATABASE_URL="mysql://root:SENHA@HOST:PORT/zeabur"
```

**⚠️ SUBSTITUA:** `SENHA`, `HOST`, `PORT` pelos valores reais do Zeabur.

### **Passo 3: Executar Drizzle Push**

```bash
# Windows (PowerShell)
$env:DATABASE_URL="mysql://root:SENHA@HOST:PORT/zeabur"
npx drizzle-kit push

# OU via arquivo .env.production
npx drizzle-kit push --config=drizzle.config.ts
```

Isso vai criar todas as tabelas no banco de produção! ✅

### **Passo 4: Deletar .env.production**

```bash
rm .env.production
```

**⚠️ NUNCA commite este arquivo com a senha de produção!**

---

## ✅ Método 2: SQL Direto no Console do Zeabur

Se preferir executar SQL manualmente:

### **Passo 1: Gerar o SQL do Schema**

No seu computador local:

```bash
npx drizzle-kit generate
```

Isso cria arquivos SQL em `drizzle/` ou similar.

### **Passo 2: Copiar o SQL Completo**

Abra o arquivo SQL gerado e copie todo o conteúdo.

### **Passo 3: Executar no Console MySQL do Zeabur**

1. Zeabur → MySQL Service → Console
2. Cole o SQL completo
3. Execute

---

## ✅ Método 3: SQL Direto (Schema Completo Aqui)

Se quiser executar direto, use o SQL abaixo no **Console MySQL do Zeabur**:

```sql
-- Criar tabelas na ordem correta (respeitar Foreign Keys)

-- 1. TABELA: users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320) UNIQUE,
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin', 'gerente', 'atendente') NOT NULL DEFAULT 'user',
  isEmailVerified BOOLEAN NOT NULL DEFAULT false,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA: user_profile_types
CREATE TABLE IF NOT EXISTS user_profile_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  role ENUM('user', 'admin', 'gerente', 'atendente') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABELA: departments
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  responsibleUserId INT,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsibleUserId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABELA: profiles
CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE,
  fullName TEXT NOT NULL,
  nickname TEXT,
  phone VARCHAR(20),
  avatarUrl TEXT,
  departmentId INT,
  profileTypeId INT,
  isActive BOOLEAN NOT NULL DEFAULT true,
  isOnLeave BOOLEAN NOT NULL DEFAULT false,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (profileTypeId) REFERENCES user_profile_types(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SEED: Criar profile types padrão
INSERT INTO user_profile_types (name, description, role, createdAt, updatedAt)
VALUES
  ('Administrador', 'Acesso total ao sistema', 'admin', NOW(), NOW()),
  ('Gerente', 'Gerencia departamentos e equipes', 'gerente', NOW(), NOW()),
  ('Atendente', 'Atende tickets e ClienteS', 'atendente', NOW(), NOW()),
  ('Usuário', 'Acesso básico', 'user', NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 6. SEED: Criar departamento padrão
INSERT INTO departments (name, description, isActive, createdAt, updatedAt)
VALUES
  ('TI', 'Departamento de Tecnologia da Informação', true, NOW(), NOW()),
  ('Suporte', 'Departamento de Suporte ao CLIENTE', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 7. VERIFICAR: Ver profile types criados
SELECT * FROM user_profile_types;

-- 8. VERIFICAR: Ver seu usuário
SELECT u.id, u.email, u.role, p.profile_type_id
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'ricardo.palacio@coopedu.com.br';
```

---

## 🎯 Após Criar as Tabelas

### **Corrigir Seu Usuário:**

```sql
-- 1. Atualizar role do usuário
UPDATE users 
SET role = 'admin' 
WHERE email = 'ricardo.palacio@coopedu.com.br';

-- 2. Atualizar profile (ID 1 = Administrador)
UPDATE profiles p
INNER JOIN users u ON u.id = p.user_id
SET p.profile_type_id = 1
WHERE u.email = 'ricardo.palacio@coopedu.com.br';

-- 3. Verificar
SELECT u.email, u.role, pt.name as profile_type, pt.role as profile_role
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN user_profile_types pt ON pt.id = p.profile_type_id
WHERE u.email = 'ricardo.palacio@coopedu.com.br';
```

---

## ✅ Configurar para Próximos Deploys

Para evitar que isso aconteça de novo, configure no Zeabur:

```bash
RUN_MIGRATIONS_ON_START=true
```

Isso fará o sistema aplicar o schema automaticamente em cada deploy.

---

## 📝 Checklist

- [ ] Obter connection string do MySQL no Zeabur
- [ ] Executar `npx drizzle-kit push` com a connection string de produção
- [ ] OU executar os SQLs no console do Zeabur
- [ ] Verificar que as tabelas foram criadas
- [ ] Corrigir seu usuário para admin
- [ ] Adicionar `RUN_MIGRATIONS_ON_START=true` no Zeabur
- [ ] Fazer logout e login
- [ ] Testar acesso admin

---

**Depois disso, tudo deve funcionar perfeitamente!** ✅



