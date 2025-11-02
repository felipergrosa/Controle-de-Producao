# Instruções de Implantação - Sistema de Autenticação e Auditoria

## 📋 Visão Geral
Este documento contém as instruções para aplicar as mudanças do novo sistema de autenticação local e auditoria completa.

## ⚠️ IMPORTANTE: Leia antes de executar
- Faça backup completo do banco de dados antes de executar
- Algumas mudanças são irreversíveis
- Teste em ambiente de desenvolvimento primeiro

## 🔧 Passo 1: Instalar Dependências

### Backend
```bash
cd Controle-de-Producao
npm install bcryptjs
npm install @types/bcryptjs --save-dev
```

## 🗄️ Passo 2: Executar Migrations

### ⚡ Método Automático (Recomendado)

As migrations são executadas **automaticamente** ao iniciar o servidor:

```bash
npm run dev
# ou
npm run docker:dev
```

O sistema detecta e aplica automaticamente todas as migrations pendentes.

### 🔧 Método Manual (Opcional)

Se preferir executar manualmente antes de iniciar:

```bash
npm run db:migrate
```

Para ver status:
```bash
npm run db:migrate:status
```

### O que a migration `001_auth_and_audit.sql` faz:
- ✅ Adiciona campos `password_hash`, `is_active`, `must_change_password` na tabela `users`
- ✅ Torna `openId` opcional (compatibilidade OAuth)
- ✅ Torna `email` obrigatório e único
- ✅ Cria tabela `sessions` para autenticação local
- ✅ Cria tabela `audit_logs` para rastreamento completo
- ✅ Corrige tipo de `created_by` em `product_history` (int ao invés de varchar)
- ✅ Cria usuário admin padrão (email: `admin@sistema.com`, senha: `admin123`)

## 🔑 Passo 3: Primeiro Login

1. Acessar: `http://localhost:5000/login`
2. Usar credenciais padrão:
   - Email: `admin@sistema.com`
   - Senha: `admin123`
3. **IMPORTANTE:** Trocar senha imediatamente após primeiro login

## 👥 Passo 4: Criar Usuários

1. Acessar menu lateral → **Usuários** (apenas visível para admin)
2. Clicar em "Novo Usuário"
3. Preencher dados:
   - Email (obrigatório)
   - Nome (opcional)
   - Senha (mínimo 6 caracteres)
   - Função (Usuário ou Administrador)

## 🔍 Verificações de Teste

### 1. Login Funcional
- [ ] Login com email/senha funciona
- [ ] Logout limpa sessão corretamente
- [ ] Sessão persiste após refresh

### 2. Gerenciamento de Usuários (Admin)
- [ ] Criar novo usuário
- [ ] Resetar senha de usuário
- [ ] Ativar/desativar usuário
- [ ] Menu "Usuários" invisível para usuários comuns

### 3. Auditoria
- [ ] Logs são criados ao adicionar lançamento
- [ ] Logs são criados ao conferir item
- [ ] Logs são criados ao deletar item
- [ ] Tela "Logs de Auditoria" exibe dados reais
- [ ] Filtros funcionam corretamente
- [ ] Exportação CSV funciona

### 4. Lançamento de Produção
- [ ] Nome do usuário autenticado aparece na coluna "Operador" (ao invés de "Felipe Rosa")
- [ ] Campo `createdBy` é populado corretamente no banco

### 5. Menu Lateral
- [ ] Abre ao passar mouse no logo
- [ ] Fecha ao sair do mouse
- [ ] Itens admin (Usuários, Logs) visíveis apenas para admin

## 🔒 Considerações de Segurança

### Senhas
- ✅ Bcrypt com 10 rounds (padrão seguro)
- ✅ Senhas nunca expostas em logs ou API
- ⚠️ Trocar senha padrão do admin IMEDIATAMENTE

### Sessões
- ✅ Tokens de 32 bytes (crypto.randomBytes)
- ✅ Cookies httpOnly (protege contra XSS)
- ✅ Cookies secure em produção (HTTPS)
- ✅ sameSite='lax' (protege contra CSRF)
- ✅ Expiração de 30 dias

### API
- ✅ Validação de permissões (admin/user)
- ✅ Rate limiting recomendado (não implementado - TO DO)
- ✅ Auditoria de todas ações sensíveis

## 📊 Estrutura de Arquivos Criados/Modificados

### Backend
```
server/
├── auth.ts                    # ✨ NOVO - Funções de autenticação
├── routers.ts                 # ✏️ MODIFICADO - Rotas auth, users, auditLogs
├── db.ts                      # ⚪ Sem alterações
└── _core/
    └── context.ts             # ✏️ MODIFICADO - Validação de sessão local

drizzle/
└── schema.ts                  # ✏️ MODIFICADO - Novas tabelas e campos

migrations/
└── 001_auth_and_audit.sql     # ✨ NOVO - Migration SQL
```

### Frontend
```
client/src/pages/
├── Login.tsx                  # ✨ NOVO - Tela de login
├── Users.tsx                  # ✨ NOVO - Gerenciamento de usuários
├── AuditLogs.tsx              # ✏️ MODIFICADO - Conectado ao backend
└── ProductionEntry.tsx        # ✏️ MODIFICADO - Usa user autenticado

client/src/components/
└── DashboardLayout.tsx        # ✏️ MODIFICADO - Menu filtrado por role

client/src/App.tsx             # ✏️ MODIFICADO - Novas rotas
```

## 🚨 Troubleshooting

### Erro: "Cannot find module 'bcryptjs'"
```bash
npm install bcryptjs @types/bcryptjs
```

### Erro: "Email já cadastrado"
O email já existe no banco. Use outro ou delete o registro existente.

### Erro: "Apenas administradores..."
Usuário logado não tem role='admin'. Verificar no banco:
```sql
UPDATE users SET role = 'admin' WHERE email = 'seu@email.com';
```

### Sessão não persiste
Verificar:
1. Cookies habilitados no navegador
2. Cookie `session_token` está sendo definido
3. Tabela `sessions` tem registros

### Logs de auditoria vazios
Verificar:
1. Usuário está autenticado
2. Permissões de admin
3. Logs estão sendo criados no banco:
```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

## 📝 Próximos Passos (Opcional)

### Melhorias Futuras
- [ ] Rate limiting para login (proteção contra brute force)
- [ ] Recuperação de senha por email
- [ ] 2FA (autenticação de dois fatores)
- [ ] Logs de tentativas de login falhas
- [ ] Dashboard de segurança
- [ ] Expiração de sessão configurável
- [ ] Limpeza automática de sessões expiradas (cron job)

### Performance
- [ ] Índices adicionais conforme uso
- [ ] Cache de consultas pesadas
- [ ] Paginação em audit logs (atualmente limite 100)

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs do servidor (console)
2. Verificar erros no browser (F12 → Console)
3. Consultar documentação do código

---

**Data de criação:** 2025-11-01  
**Autor:** Sistema de Controle de Produção  
**Versão:** 1.0.0
