import "dotenv/config";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { updateUserPassword } from "../server/auth";

async function main() {
  const email = "admin@controle.com";
  const newPassword = "NovaSenha@123";

  console.log(`Buscando usuário: ${email}`);

  const db = await getDb();
  if (!db) {
    console.error("Banco de dados não disponível!");
    return;
  }

  const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (userResult.length === 0) {
    console.error(`Usuário com o email ${email} não foi encontrado.`);
    return;
  }

  const user = userResult[0];
  console.log(`Usuário encontrado: ID = ${user.id}, Nome = ${user.name}`);

  console.log("Atualizando senha...");
  await updateUserPassword(user.id, newPassword);

  console.log("\n==========================================");
  console.log(`✓ Senha de ${email} redefinida com sucesso!`);
  console.log(`Nova senha temporária: ${newPassword}`);
  console.log("==========================================\n");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao resetar senha:", error);
    process.exit(1);
  });
