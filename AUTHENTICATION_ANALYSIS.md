# Análise da Estrutura de Autenticação Atual

## Estado Atual

### 1. Tabela de Usuários (Schema)
**Localização:** `drizzle/schema.ts`

```typescript
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
```

**Campos:**
- `id`: Primary key autoincremental
- `openId`: ID externo (OAuth) - UNIQUE
- `name`: Nome do usuário
- `email`: Email do usuário
- `loginMethod`: Método de login (Google, GitHub, etc)
- `role`: Papel do usuário (`user` ou `admin`)
- Timestamps: `createdAt`, `updatedAt`, `lastSignedIn`

### 2. Funções de Banco Existentes
**Localização:** `server/db.ts`

- `upsertUser(user)`: Insere ou atualiza usuário baseado no `openId`
- `getUserByOpenId(openId)`: Busca usuário pelo `openId`

### 3. Autenticação via OAuth (Better Auth)
**Localização:** `server/_core/sdk.ts` e `server/_core/env.ts`

O sistema atual usa **Better Auth** com OAuth (Google, GitHub, etc):
- Configurado via variáveis de ambiente (`GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, etc)
- Cookie de sessão: `better-auth.session_token`
- Método `verifySession()` valida o token de sessão

**Flag de desabilitação:**
- `ENV.authEnabled` pode desabilitar autenticação para uso interno
- Quando desabilitado, não há validação de sessão

### 4. Tabelas com Campo `createdBy`
Já existem campos para rastrear usuário criador:
- `productionEntries.createdBy` (int) - referência a `users.id`
- `productionDaySnapshots.createdBy` (int) - referência a `users.id`
- `productHistory.createdBy` (varchar) - **INCONSISTÊNCIA:** deveria ser int

## Problemas Identificados

### 1. Dependência de OAuth Externo
- Sistema depende de provedores OAuth (Google, GitHub)
- Não há opção de login local (email/senha)
- **Problema:** Se OAuth falhar ou não estiver configurado, sistema não funciona

### 2. Usuário Hardcoded
- Nome "Felipe Rosa" está hardcoded em várias telas
- Não usa o usuário autenticado do contexto
- **Problema:** Auditoria não reflete usuário real

### 3. Falta de Auditoria Completa
- Não há tabela de `audit_logs` para rastrear todas as ações
- Campos `createdBy` existem mas não são populados consistentemente
- **Problema:** Impossível rastrear quem fez o quê

### 4. Inconsistência de Tipos
- `productHistory.createdBy` é varchar, deveria ser int
- Algumas tabelas têm `createdBy`, outras não

## Proposta de Solução

### Fase 1: Sistema de Autenticação Local (Simples)

#### 1.1 Adicionar campos de senha na tabela `users`
```typescript
export const users = mysqlTable("users", {
  // ... campos existentes ...
  passwordHash: varchar("password_hash", { length: 255 }), // bcrypt hash
  isActive: boolean("is_active").default(true).notNull(),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
});
```

#### 1.2 Criar nova tabela de sessões locais
```typescript
export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});
```

#### 1.3 Tela de Login Local
- Email/senha
- Gerar token de sessão ao logar
- Armazenar token em cookie seguro (httpOnly)

#### 1.4 Tela de Gerenciamento de Usuários (Admin)
- Listar usuários
- Criar/editar/desativar usuários
- Resetar senha
- Definir papéis (admin/user)

### Fase 2: Sistema de Auditoria Completo

#### 2.1 Criar tabela `audit_logs`
```typescript
export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // 'create', 'update', 'delete', 'login', etc
  entity: varchar("entity", { length: 50 }).notNull(), // 'product', 'production_entry', etc
  entityId: varchar("entity_id", { length: 36 }),
  entityCode: varchar("entity_code", { length: 100 }), // Para produtos
  details: json("details"), // Dados adicionais (before/after, etc)
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### 2.2 Middleware de Auditoria
- Interceptar todas as mutations TRPC
- Registrar ação no `audit_logs` automaticamente
- Capturar contexto do usuário (id, IP, user-agent)

#### 2.3 Atualizar Tela de Logs de Auditoria
- Buscar dados reais de `audit_logs`
- Filtrar por usuário, ação, entidade, data
- Exportar para CSV

### Fase 3: Integração com Sistema Atual

#### 3.1 Substituir "Felipe Rosa" por usuário autenticado
- Usar `ctx.user` do contexto TRPC
- Atualizar todas as telas que exibem operador
- Popular `createdBy` corretamente nas mutations

#### 3.2 Middleware de Autenticação
- Validar token de sessão em todas as rotas protegidas
- Retornar usuário no contexto
- Verificar permissões (admin/user)

#### 3.3 Migração de Dados
- Script para migrar OAuth users para local users (opcional)
- Manter compatibilidade com OAuth se necessário

## Próximos Passos

1. **Criar migration para novos campos/tabelas**
2. **Implementar sistema de login local**
3. **Criar tela de gerenciamento de usuários**
4. **Implementar auditoria automática**
5. **Atualizar todas as telas para usar usuário autenticado**
6. **Testar e validar segurança**

## Arquivos a Modificar

### Backend
- `drizzle/schema.ts` - Adicionar campos/tabelas
- `server/db.ts` - Funções de usuários, sessões, audit
- `server/_core/context.ts` - Validar sessão local
- `server/_core/trpc.ts` - Middleware de auditoria
- `server/routers.ts` - Rotas de auth, users, audit

### Frontend
- `client/src/pages/Login.tsx` - Nova tela de login
- `client/src/pages/Users.tsx` - Gerenciamento de usuários (admin)
- `client/src/pages/AuditLogs.tsx` - Atualizar com dados reais
- `client/src/_core/hooks/useAuth.tsx` - Lógica de autenticação local
- `client/src/components/DashboardLayout.tsx` - Exibir usuário correto

## Considerações de Segurança

1. **Senhas:** Usar bcrypt com salt adequado (rounds >= 10)
2. **Tokens:** Gerar tokens seguros (crypto.randomBytes)
3. **Cookies:** httpOnly, secure (HTTPS), sameSite
4. **Rate limiting:** Limitar tentativas de login
5. **CSRF:** Proteção contra CSRF em forms
6. **XSS:** Sanitizar inputs e outputs
7. **SQL Injection:** Usar prepared statements (Drizzle já faz)
