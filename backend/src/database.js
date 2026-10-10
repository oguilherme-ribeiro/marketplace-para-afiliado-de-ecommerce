const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

let storage;
let ready = false;

class JsonStorage {
  constructor(filePath) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async initialize() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const contents = await fs.readFile(this.filePath, 'utf8');
      this.data = contents.trim() ? JSON.parse(contents) : { products: [], admins: [] };
      if (!Array.isArray(this.data.products) || !Array.isArray(this.data.admins)) {
        throw new Error('database.json precisa conter arrays products e admins.');
      }
      if (!contents.trim()) await this.write();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.data = { products: [], admins: [] };
      await this.write();
    }
  }

  async write() {
    const temporaryPath = `${this.filePath}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, this.filePath);
  }

  async read(callback) {
    await this.writeQueue;
    return callback(this.data);
  }

  mutate(callback) {
    const operation = this.writeQueue.then(async () => {
      const result = await callback(this.data);
      await this.write();
      return result;
    });
    this.writeQueue = operation.catch(() => {});
    return operation;
  }
}

function useJson() {
  return Boolean(process.env.DATABASE_FILE);
}

function getMongoModels() {
  return {
    Product: require('./models/productsModel'),
    Admin: require('./models/adminModel')
  };
}

function validateProduct(values) {
  const fields = ['Nome', 'Descricao', 'Categoria', 'Imagem', 'Link'];
  for (const field of fields) {
    if (typeof values[field] !== 'string' || !values[field].trim()) {
      throw new Error(`${field} é obrigatório.`);
    }
  }
  const price = Number(values.Preco);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Preco precisa ser maior que zero.');
  for (const field of ['Imagem', 'Link']) {
    const url = new URL(values[field]);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${field} precisa ser uma URL HTTP ou HTTPS.`);
  }
  return {
    Nome: values.Nome.trim(),
    Descricao: values.Descricao.trim(),
    Preco: price,
    Imagem: values.Imagem.trim(),
    Categoria: values.Categoria.trim(),
    Link: values.Link.trim()
  };
}

exports.initialize = async () => {
  if (useJson()) {
    const configuredPath = process.env.DATABASE_FILE;
    const filePath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(__dirname, '..', configuredPath);
    storage = new JsonStorage(filePath);
    await storage.initialize();
    ready = true;
    console.log(`Banco JSON temporário: ${filePath}`);
    return;
  }

  if (!process.env.MONGO_URI) throw new Error('Configure DATABASE_FILE ou MONGO_URI no arquivo .env.');
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGO_URI, { tls: true, tlsAllowInvalidCertificates: true });
  ready = true;
  console.log('Conectado ao banco de dados MongoDB');
};

exports.isReady = () => ready;

exports.listProducts = async ({ includeClicks = false } = {}) => {
  if (useJson()) {
    return storage.read(({ products }) => products.map(item => {
      const result = { ...item };
      if (!includeClicks) delete result.Cliques;
      return result;
    }));
  }
  const { Product } = getMongoModels();
  return Product.find().select(includeClicks ? '+Cliques' : '-Cliques');
};

exports.findProduct = async id => {
  if (useJson()) return storage.read(({ products }) => products.find(item => item._id === id) || null);
  const { Product } = getMongoModels();
  return Product.findById(id);
};

exports.createProduct = async values => {
  const validated = validateProduct(values);
  if (useJson()) {
    return storage.mutate(({ products }) => {
      const product = { _id: randomUUID(), ...validated, Cliques: 0, createdAt: new Date().toISOString() };
      products.push(product);
      return { ...product };
    });
  }
  const { Product } = getMongoModels();
  return Product.create({ ...validated, Cliques: 0 });
};

exports.updateProduct = async (id, values) => {
  const validated = validateProduct(values);
  if (useJson()) {
    return storage.mutate(({ products }) => {
      const index = products.findIndex(item => item._id === id);
      if (index < 0) return null;
      products[index] = { ...products[index], ...validated };
      return { ...products[index] };
    });
  }
  const { Product } = getMongoModels();
  return Product.findByIdAndUpdate(id, validated, { new: true, runValidators: true });
};

exports.deleteProduct = async id => {
  if (useJson()) {
    return storage.mutate(({ products }) => {
      const index = products.findIndex(item => item._id === id);
      return index < 0 ? null : products.splice(index, 1)[0];
    });
  }
  const { Product } = getMongoModels();
  return Product.findByIdAndDelete(id);
};

exports.incrementProductClicks = async id => {
  if (useJson()) {
    return storage.mutate(({ products }) => {
      const item = products.find(product => product._id === id);
      if (!item) return null;
      item.Cliques = (item.Cliques || 0) + 1;
      return { ...item };
    });
  }
  const { Product } = getMongoModels();
  return Product.findByIdAndUpdate(id, { $inc: { Cliques: 1 } }, { new: true });
};

exports.findAdminByEmail = async email => {
  if (useJson()) return storage.read(({ admins }) => admins.find(item => item.Email === email) || null);
  const { Admin } = getMongoModels();
  return Admin.findOne({ Email: email }).select('+Senha');
};

exports.listAdmins = async ({ includePassword = false } = {}) => {
  if (useJson()) {
    return storage.read(({ admins }) => admins.map(item => {
      const result = { ...item };
      if (!includePassword) delete result.Senha;
      return result;
    }));
  }
  const { Admin } = getMongoModels();
  return Admin.find().select(includePassword ? '+Senha' : '-Senha');
};

exports.createAdmin = async values => {
  const email = values.Email.trim().toLowerCase();
  if (useJson()) {
    return storage.mutate(({ admins }) => {
      if (admins.some(item => item.Email === email)) throw new Error('Este e-mail já está cadastrado.');
      const account = { _id: randomUUID(), Nome: values.Nome.trim(), Email: email, Senha: values.Senha };
      admins.push(account);
      return { ...account };
    });
  }
  const { Admin } = getMongoModels();
  return Admin.create({ ...values, Nome: values.Nome.trim(), Email: email });
};

exports.updateAdminPassword = async (id, passwordHash) => {
  if (useJson()) {
    return storage.mutate(({ admins }) => {
      const account = admins.find(item => item._id === id);
      if (!account) return null;
      account.Senha = passwordHash;
      return { ...account };
    });
  }
  const { Admin } = getMongoModels();
  return Admin.findByIdAndUpdate(id, { Senha: passwordHash }, { new: true });
};

exports.deleteAdmin = async id => {
  if (useJson()) {
    return storage.mutate(({ admins }) => {
      const index = admins.findIndex(item => item._id === id);
      return index < 0 ? null : admins.splice(index, 1)[0];
    });
  }
  const { Admin } = getMongoModels();
  return Admin.findByIdAndDelete(id);
};