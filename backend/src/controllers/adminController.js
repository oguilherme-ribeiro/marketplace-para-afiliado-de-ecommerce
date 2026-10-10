const bcrypt = require('bcryptjs');
const database = require('../database');

exports.createAdmin = async (req, res) => {
    try {
        const { Nome, Email, Senha } = req.body;
        if (typeof Nome !== 'string' || !Nome.trim() || typeof Email !== 'string' || !Email.trim() || typeof Senha !== 'string' || Senha.length < 12) {
            return res.status(400).json({ message: 'Informe nome, e-mail e senha com pelo menos 12 caracteres.' });
        }
        const newAdmin = await database.createAdmin({
            Nome,
            Email: Email.trim().toLowerCase(),
            Senha: await bcrypt.hash(Senha, 12)
        });
        const adminResponse = { ...newAdmin };
        delete adminResponse.Senha;
        res.status(201).json(adminResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await database.listAdmins();
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;
        const deletedAdmin = await database.deleteAdmin(adminId);
        if (!deletedAdmin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.status(200).json({ message: 'Admin deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
    
