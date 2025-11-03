import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Uso: node scripts/generate-hash.mjs <senha>');
  process.exit(1);
}

const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);

const hash = bcrypt.hashSync(password, rounds);
console.log(hash);
