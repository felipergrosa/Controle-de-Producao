#!/usr/bin/env tsx
import "dotenv/config";
import { runMigrations, listMigrations } from "../server/migrations";

const command = process.argv[2] || "run";

async function main() {
  console.log("=== Migration Tool ===\n");

  switch (command) {
    case "run":
      console.log("Executando migrations...\n");
      await runMigrations();
      break;

    case "status":
      await listMigrations();
      break;

    case "help":
    default:
      console.log("Uso: npm run db:migrate [comando]");
      console.log("\nComandos disponíveis:");
      console.log("  run     - Executa todas as migrations pendentes (padrão)");
      console.log("  status  - Lista o status de todas as migrations");
      console.log("  help    - Mostra esta mensagem de ajuda");
      console.log("\nExemplos:");
      console.log("  npm run db:migrate");
      console.log("  npm run db:migrate:status");
      break;
  }
}

main()
  .then(() => {
    console.log("\n✓ Concluído");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Erro:", error);
    process.exit(1);
  });
