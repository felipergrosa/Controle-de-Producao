#!/bin/bash
# Script para verificar se migration 003 está sincronizada

echo "=== Verificando Migration 003 ==="

# Verificar se migration está registrada
REGISTERED=$(mysql -h$DB_HOST -u$DB_USER -p$DB_PASS -D$DB_NAME -se "SELECT COUNT(*) FROM _migrations WHERE version = 3")

# Verificar se colunas existem
COLS_EXIST=$(mysql -h$DB_HOST -u$DB_USER -p$DB_PASS -D$DB_NAME -se "SHOW COLUMNS FROM production_entries LIKE 'checked_by'" | wc -l)

echo "Migration 003 registrada: $REGISTERED"
echo "Colunas existem: $COLS_EXIST"

if [ $REGISTERED -eq 1 ] && [ $COLS_EXIST -eq 0 ]; then
  echo "❌ PROBLEMA: Migration registrada mas colunas não existem!"
  echo "Solução: Execute o ALTER TABLE manualmente"
  exit 1
elif [ $REGISTERED -eq 0 ] && [ $COLS_EXIST -eq 1 ]; then
  echo "⚠️  AVISO: Colunas existem mas migration não registrada"
  echo "Solução: Registre a migration manualmente"
  exit 1
elif [ $REGISTERED -eq 1 ] && [ $COLS_EXIST -eq 1 ]; then
  echo "✅ OK: Migration sincronizada corretamente"
  exit 0
else
  echo "ℹ️  Migration 003 não aplicada ainda"
  exit 0
fi
