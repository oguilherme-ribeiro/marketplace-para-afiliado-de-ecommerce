const mongoose = require('mongoose');
const schema = mongoose.Schema;

const productsSchema = new schema({
    Nome: { type: String, required: true },
    Descricao: { type: String, required: true },
    Preco: { type: Number, required: true },
    Imagem: { type: String, required: true },
    Categoria: { type: String, required: true },
    Link: { type: String, required: true },
    Cliques: { type: Number, default: 0, min: 0, select: false }
});

module.exports = mongoose.model('Products', productsSchema);