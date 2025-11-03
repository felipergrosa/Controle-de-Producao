import bcrypt from "bcryptjs";

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("Usage: pnpm exec tsx scripts/generate-hash.ts <password>");
    process.exit(1);
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  const hash = await bcrypt.hash(password, rounds);
  console.log(hash);
}

void main();
