require('dotenv').config();

const bcrypt = require('bcryptjs');
const database = require('../src/database');

async function createAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD no arquivo .env.');
  }
  if (ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD precisa ter pelo menos 12 caracteres.');
  }

  await database.initialize();
  const existingAdmins = await database.listAdmins({ includePassword: true });
  let migratedPasswords = 0;
  for (const account of existingAdmins) {
    if (typeof account.Senha === 'string' && !/^\$2[aby]\$\d{2}\$/.test(account.Senha)) {
      await database.updateAdminPassword(account._id, await bcrypt.hash(account.Senha, 12));
      migratedPasswords += 1;
    }
  }
  if (migratedPasswords) {
    console.log(`${migratedPasswords} senha(s) antiga(s) convertida(s) para hash.`);
  }

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existingAdmin = await database.findAdminByEmail(email);
  if (existingAdmin) {
    console.log(`Administrador ${email} já existe.`);
    return;
  }

  const Senha = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await database.createAdmin({
    Nome: process.env.ADMIN_NAME || 'Administrador',
    Email: email,
    Senha
  });
  console.log(`Administrador ${email} criado com senha criptografada.`);
}

createAdmin().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
