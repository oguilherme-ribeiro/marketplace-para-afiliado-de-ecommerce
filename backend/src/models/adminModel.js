const mongoose = require('mongoose');
const schema = mongoose.Schema;

const adminSchema = new schema({
    Nome: { type: String, required: true },
    Email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    Senha: { type: String, required: true, select: false }
});

module.exports = mongoose.model('Admin', adminSchema);