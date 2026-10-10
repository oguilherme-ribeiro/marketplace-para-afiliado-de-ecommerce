const database = require('../database');

exports.createProduct = async (req, res) => {
  try {
    const newProduct = await database.createProduct(req.body);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await database.listProducts();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminProducts = async (req, res) => {
  try {
    const products = await database.listProducts({ includeClicks: true });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.trackClick = async (req, res) => {
  try {
    const clickedProduct = await database.findProduct(req.params.id);
    if (!clickedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const destination = new URL(clickedProduct.Link);
    if (!['http:', 'https:'].includes(destination.protocol)) {
      return res.status(400).json({ message: 'Invalid affiliate link' });
    }
    await database.incrementProductClicks(req.params.id);
    res.redirect(302, destination.href);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const foundProduct = await database.findProduct(req.params.id);
    if (!foundProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(foundProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updates = { ...req.body };
    delete updates.Cliques;
    const updatedProduct = await database.updateProduct(productId, updates);
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const deletedProduct = await database.deleteProduct(productId);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
    