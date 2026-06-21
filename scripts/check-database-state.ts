import "dotenv/config";
import { getDb } from "../server/db";
import { users, products } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Banco de dados não disponível!");
    return;
  }

  const allUsers = await db.select().from(users);
  const allProducts = await db.select().from(products);

  console.log("\n==========================================");
  console.log("ESTADO ATUAL DO BANCO DE DADOS LOCAL:");
  console.log("==========================================");
  console.log(`Total de Usuários Cadastrados: ${allUsers.length}`);
  allUsers.forEach((u) => {
    console.log(`- ID: ${u.id}, Nome: ${u.name}, E-mail: ${u.email}, Criado em: ${u.createdAt}`);
  });
  
  console.log(`\nTotal de Produtos Cadastrados: ${allProducts.length}`);
  if (allProducts.length > 0) {
    console.log("Exemplos de produtos:");
    allProducts.slice(0, 5).forEach((p) => {
      console.log(`- Código: ${p.code}, Descrição: ${p.description}`);
    });
  }
  console.log("==========================================\n");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao verificar banco:", error);
    process.exit(1);
  });
