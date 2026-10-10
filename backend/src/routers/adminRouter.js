const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

router.post('/login', authController.login);
router.post('/user', requireAuth, adminController.createAdmin);
router.get('/user', requireAuth, adminController.getAllAdmins);
router.delete('/user/:id', requireAuth, adminController.deleteAdmin);

module.exports = router;