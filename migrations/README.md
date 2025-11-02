# Sistema de Migrations

## 📋 Como Funciona

O sistema de migrations executa **automaticamente** ao iniciar o servidor (`npm run dev` ou `docker:dev`).

### Controle Automático
- ✅ Migrations são executadas na ordem numérica
- ✅ Sistema rastreia quais já foram executadas (tabela `_migrations`)
- ✅ Migrations já executadas são ignoradas
- ✅ Apenas migrations pendentes são aplicadas

## 📝 Criar Nova Migration

### 1. Criar arquivo SQL na pasta `migrations/`

Nome do arquivo: `XXX_descricao.sql`
- `XXX` = número de versão (ex: 001, 002, 003...)
- `descricao` = nome descritivo da migration

**Exemplo:** `002_add_users_profile.sql`

### 2. Escrever SQL

```sql
-- Migration: Adicionar perfil de usuários
-- Data: 2025-11-01

ALTER TABLE users 
  ADD COLUMN bio TEXT NULL,
  ADD COLUMN avatar_url VARCHAR(255) NULL;

-- Criar índice
CREATE INDEX idx_users_bio ON users(bio(100));

-- Dados iniciais
UPDATE users SET bio = 'Usuário do sistema' WHERE bio IS NULL;
```

### 3. Testar

A migration será executada automaticamente no próximo start do servidor ou você pode executar manualmente:

```bash
npm run db:migrate
```

## 🛠️ Comandos Disponíveis

### Executar migrations automaticamente (ao iniciar servidor)
```bash
npm run dev          # Development
npm run docker:dev   # Docker
```

### Executar migrations manualmente
```bash
npm run db:migrate
```

### Ver status das migrations
```bash
npm run db:migrate:status
```

**Output exemplo:**
```
=== Status das Migrations ===

Total: 2
Executadas: 1
Pendentes: 1

✓ [1] 001_auth_and_audit.sql
✗ [2] 002_add_users_profile.sql
```

## 📂 Estrutura

```
migrations/
├── README.md                    # Este arquivo
├── 001_auth_and_audit.sql       # Migration inicial
└── 002_nova_feature.sql         # Próxima migration
```

## ⚠️ Boas Práticas

### ✅ Fazer
- Numerar migrations sequencialmente (001, 002, 003...)
- Incluir comentários explicativos
- Testar em ambiente de desenvolvimento primeiro
- Fazer backup antes de migrations grandes
- Usar transações quando possível
- Adicionar índices necessários

### ❌ Evitar
- Modificar migrations já executadas em produção
- Usar `DROP TABLE` sem backup
- Migrations muito grandes (dividir em várias)
- Comandos destrutivos sem confirmação
- Depender de dados específicos do ambiente

## 🔍 Tabela de Controle

O sistema cria automaticamente a tabela `_migrations`:

```sql
CREATE TABLE _migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version INT NOT NULL UNIQUE,
  filename VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Nunca modifique esta tabela manualmente!**

## 🚨 Troubleshooting

### Migration falhou no meio
1. Verificar erro no console
2. Corrigir o problema no arquivo SQL
3. Se necessário, reverter manualmente as mudanças parciais
4. Remover registro da migration falha:
```sql
DELETE FROM _migrations WHERE version = X;
```
5. Executar novamente

### Migration não é detectada
- Verificar nome do arquivo (deve ter formato `XXX_*.sql`)
- Verificar se arquivo está na pasta `migrations/`
- Verificar permissões do arquivo

### Forçar re-execução de migration
⚠️ **CUIDADO:** Use apenas em desenvolvimento!

```sql
DELETE FROM _migrations WHERE version = X;
```

Depois execute: `npm run db:migrate`

## 📖 Exemplos

### Adicionar coluna
```sql
-- 002_add_phone.sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL;
```

### Criar tabela
```sql
-- 003_create_notifications.sql
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Inserir dados iniciais
```sql
-- 004_seed_roles.sql
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('user', 'Regular user'),
  ('guest', 'Guest with limited access');
```

### Modificar dados existentes
```sql
-- 005_normalize_emails.sql
UPDATE users SET email = LOWER(TRIM(email));
```

## 🔗 Integração com Docker

No `docker-compose.dev.yml`, o servidor aguarda o banco estar pronto e depois executa migrations automaticamente:

```yaml
services:
  backend:
    depends_on:
      - db
    # Migrations executam automaticamente ao iniciar
```

## 📚 Recursos Adicionais

- [Documentação MySQL](https://dev.mysql.com/doc/)
- [SQL Best Practices](https://www.sqlstyle.guide/)
- [Drizzle ORM](https://orm.drizzle.team/)

---

**Última atualização:** 2025-11-01
