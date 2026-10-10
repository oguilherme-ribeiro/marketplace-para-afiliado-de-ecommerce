const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('node:path');
const database = require('./src/database');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const adminRouter = require('./src/routers/adminRouter');
const productRouter = require('./src/routers/productsRouter');

app.use(express.static(path.join(__dirname, '..', 'frontend')));
const requireDatabase = (req, res, next) => {
  if (!database.isReady()) {
    return res.status(503).json({ message: 'Banco de dados indisponível' });
  }
  next();
};

app.use('/api/admin', requireDatabase, adminRouter);
app.use('/api/products', requireDatabase, productRouter);

const port = process.env.PORT || 8000;

const connectDB = async () => {
  try {
    await database.initialize();
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error.message);
  }
};

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

connectDB();