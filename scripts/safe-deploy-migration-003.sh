#!/bin/bash
# Script seguro para aplicar migration 003 em produção

set -e  # Para na primeira falha

echo "=== Deploy Seguro - Migration 003 ==="
echo ""

# Configurações
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME:-production_control}

if [ -z "$DB_PASS" ]; then
  echo "❌ Erro: DB_PASS não definido"
  exit 1
fi

# Função para executar SQL
run_sql() {
  mysql -h$DB_HOST -u$DB_USER -p$DB_PASS -D$DB_NAME -se "$1"
}

echo "1. Verificando estado atual..."

# Verificar se migration está registrada
REGISTERED=$(run_sql "SELECT COUNT(*) FROM _migrations WHERE version = 3")

# Verificar se colunas existem
COLS_CHECKED_BY=$(run_sql "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='production_entries' AND COLUMN_NAME='checked_by'")
COLS_CHECKED_AT=$(run_sql "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='production_entries' AND COLUMN_NAME='checked_at'")

echo "   Migration registrada: $([ $REGISTERED -eq 1 ] && echo 'SIM' || echo 'NÃO')"
echo "   Coluna checked_by: $([ $COLS_CHECKED_BY -eq 1 ] && echo 'EXISTE' || echo 'NÃO EXISTE')"
echo "   Coluna checked_at: $([ $COLS_CHECKED_AT -eq 1 ] && echo 'EXISTE' || echo 'NÃO EXISTE')"
echo ""

# Cenário 1: Migration registrada mas colunas não existem (NOSSO PROBLEMA)
if [ $REGISTERED -eq 1 ] && [ $COLS_CHECKED_BY -eq 0 ]; then
  echo "⚠️  PROBLEMA DETECTADO: Migration registrada mas colunas não existem"
  echo "2. Corrigindo..."
  
  # Remover registro incorreto
  run_sql "DELETE FROM _migrations WHERE version = 3"
  echo "   ✓ Registro removido da _migrations"
  
  # Aplicar ALTER TABLE
  run_sql "ALTER TABLE production_entries ADD COLUMN checked_by INT NULL AFTER checked"
  echo "   ✓ Coluna checked_by criada"
  
  run_sql "ALTER TABLE production_entries ADD COLUMN checked_at DATETIME NULL AFTER checked_by"
  echo "   ✓ Coluna checked_at criada"
  
  # Registrar migration
  run_sql "INSERT INTO _migrations (version, filename, executed_at) VALUES (3, '003_add_checked_info_to_entries.sql', NOW())"
  echo "   ✓ Migration registrada corretamente"
  
  echo ""
  echo "✅ Migration 003 aplicada e sincronizada com sucesso!"

# Cenário 2: Colunas existem mas migration não registrada
elif [ $REGISTERED -eq 0 ] && [ $COLS_CHECKED_BY -eq 1 ]; then
  echo "⚠️  Colunas existem mas migration não registrada"
  echo "2. Registrando migration..."
  
  run_sql "INSERT INTO _migrations (version, filename, executed_at) VALUES (3, '003_add_checked_info_to_entries.sql', NOW())"
  echo "   ✓ Migration registrada"
  
  echo ""
  echo "✅ Migration 003 sincronizada!"

# Cenário 3: Tudo OK
elif [ $REGISTERED -eq 1 ] && [ $COLS_CHECKED_BY -eq 1 ]; then
  echo "✅ Migration 003 já aplicada corretamente. Nada a fazer."

# Cenário 4: Migration não aplicada ainda
else
  echo "2. Aplicando migration 003..."
  
  run_sql "ALTER TABLE production_entries ADD COLUMN checked_by INT NULL AFTER checked"
  echo "   ✓ Coluna checked_by criada"
  
  run_sql "ALTER TABLE production_entries ADD COLUMN checked_at DATETIME NULL AFTER checked_by"
  echo "   ✓ Coluna checked_at criada"
  
  run_sql "INSERT INTO _migrations (version, filename, executed_at) VALUES (3, '003_add_checked_info_to_entries.sql', NOW())"
  echo "   ✓ Migration registrada"
  
  echo ""
  echo "✅ Migration 003 aplicada com sucesso!"
fi

echo ""
echo "=== Verificação Final ==="
run_sql "SELECT * FROM _migrations WHERE version = 3\G"

echo ""
echo "Colunas da tabela production_entries:"
run_sql "SHOW COLUMNS FROM production_entries LIKE 'checked%'" | column -t

echo ""
echo "✅ Deploy seguro concluído!"
