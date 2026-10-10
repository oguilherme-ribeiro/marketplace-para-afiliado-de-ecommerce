const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const requireAuth = require('../middleware/requireAuth');

router.get('/admin', requireAuth, productController.getAdminProducts);
router.get('/:id/click', productController.trackClick);
router.post('/', requireAuth, productController.createProduct);
router.get('/', productController.getAllProducts);
router.put('/:id', requireAuth, productController.updateProduct);
router.delete('/:id', requireAuth, productController.deleteProduct);

module.exports = router;