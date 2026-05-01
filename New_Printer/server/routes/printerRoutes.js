const express = require('express');
const router = express.Router();
const {
    getPrinters,
    createPrinter,
    updatePrinter,
    deletePrinter,
} = require('../controllers/printerController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getPrinters).post(protect, admin, createPrinter);
router.route('/:id').put(protect, admin, updatePrinter).delete(protect, admin, deletePrinter);

module.exports = router;
