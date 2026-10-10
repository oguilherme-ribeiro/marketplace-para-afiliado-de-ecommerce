const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../database');

exports.login = async (req, res) => {
  try {
    const { Email, Senha } = req.body;
    if (typeof Email !== 'string' || typeof Senha !== 'string') {
      return res.status(400).json({ message: 'Informe e-mail e senha.' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ message: 'JWT_SECRET não configurada no servidor.' });
    }

    const account = await database.findAdminByEmail(Email.trim().toLowerCase());
    if (!account || !(await bcrypt.compare(Senha, account.Senha))) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }

    const token = jwt.sign({ sub: account._id.toString() }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.status(200).json({
      token,
      admin: { id: account._id, Nome: account.Nome, Email: account.Email }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
