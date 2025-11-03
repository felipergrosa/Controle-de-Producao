# Guia de Deploy - Migration 003

## Problema Identificado
A migration 003 pode ser registrada como executada sem realmente criar as colunas `checked_by` e `checked_at` na tabela `production_entries`.

## Sintomas
- Erro ao tentar lançar itens: "Failed query: select ... checked_by, checked_at from production_entries ..."
- Logs mostram migration 003 como executada
- Mas as colunas não existem no banco

---

## Solução para Produção

### Opção 1: Script Automatizado (RECOMENDADO)

Execute o script de deploy seguro **ANTES** de subir o código novo:

```bash
# Definir variáveis de ambiente
export DB_HOST="seu-host-producao"
export DB_USER="seu-usuario"
export DB_PASS="sua-senha"
export DB_NAME="production_control"

# Executar script
bash scripts/safe-deploy-migration-003.sh
```

O script vai:
1. Detectar automaticamente o estado atual
2. Corrigir inconsistências
3. Aplicar a migration se necessário
4. Verificar que tudo está OK

Depois pode fazer o deploy do código normalmente.

---

### Opção 2: Verificação + Aplicação Manual

#### Passo 1: Verificar estado atual

```sql
-- Verificar se migration está registrada
SELECT * FROM _migrations WHERE version = 3;

-- Verificar se colunas existem
SHOW COLUMNS FROM production_entries LIKE 'checked%';
```

#### Passo 2: Cenários possíveis

**Cenário A: Migration registrada MAS colunas não existem** ⚠️
```sql
-- 1. Remover registro incorreto
DELETE FROM _migrations WHERE version = 3;

-- 2. Criar colunas
ALTER TABLE production_entries 
  ADD COLUMN checked_by INT NULL AFTER checked,
  ADD COLUMN checked_at DATETIME NULL AFTER checked_by;

-- 3. Registrar corretamente
INSERT INTO _migrations (version, filename, executed_at) 
VALUES (3, '003_add_checked_info_to_entries.sql', NOW());
```

**Cenário B: Colunas existem MAS migration não registrada**
```sql
-- Apenas registrar
INSERT INTO _migrations (version, filename, executed_at) 
VALUES (3, '003_add_checked_info_to_entries.sql', NOW());
```

**Cenário C: Nada aplicado ainda** ✅
```sql
-- Aplicar migration normalmente
ALTER TABLE production_entries 
  ADD COLUMN checked_by INT NULL AFTER checked,
  ADD COLUMN checked_at DATETIME NULL AFTER checked_by;

INSERT INTO _migrations (version, filename, executed_at) 
VALUES (3, '003_add_checked_info_to_entries.sql', NOW());
```

**Cenário D: Tudo OK** ✅
- Não fazer nada, prosseguir com deploy

#### Passo 3: Verificar

```sql
-- Confirmar migration registrada
SELECT * FROM _migrations ORDER BY version;

-- Confirmar colunas criadas
SHOW COLUMNS FROM production_entries;
```

---

### Opção 3: Deixar Sistema de Migrations Executar

**RISCO ALTO**: Pode ter o mesmo problema (migration registrada mas não executada)

Se optar por isso:
1. Monitorar logs durante o deploy
2. Testar imediatamente após deploy
3. Ter rollback preparado

---

## Checklist de Deploy

- [ ] Backup do banco de produção
- [ ] Verificar estado da migration 003
- [ ] Aplicar correções se necessário
- [ ] Verificar que colunas existem
- [ ] Verificar que migration está registrada
- [ ] Deploy do código
- [ ] Testar lançamento de item
- [ ] Testar conferência de item
- [ ] Verificar que nomes aparecem nas tabelas

---

## Prevenção Futura

Para evitar esse problema em próximas migrations:

1. **Melhorar sistema de migrations** (adicionar transações e validação)
2. **Sempre verificar antes do deploy** (usar script de verificação)
3. **Ter rollback preparado**
4. **Testar em staging primeiro**

---

## Contato em caso de problemas

Se algo der errado:
1. NÃO FAZER ROLLBACK DO CÓDIGO até verificar o banco
2. Verificar logs do sistema
3. Verificar estado das colunas no banco
4. Aplicar correção manual se necessário
