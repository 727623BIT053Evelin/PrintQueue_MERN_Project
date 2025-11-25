const Printer = require('../models/Printer');

// @desc    Get all printers
// @route   GET /api/printers
// @access  Public
const getPrinters = async (req, res) => {
    try {
        const printers = await Printer.find({});
        res.json(printers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a printer
// @route   POST /api/printers
// @access  Private/Admin (TODO: Add auth middleware)
const createPrinter = async (req, res) => {
    const { name, location, status } = req.body;

    try {
        const printer = new Printer({
            name,
            location,
            status,
        });

        const createdPrinter = await printer.save();
        req.io.emit('printerUpdated', { type: 'create', printer: createdPrinter });
        res.status(201).json(createdPrinter);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a printer
// @route   PUT /api/printers/:id
// @access  Private/Admin
const updatePrinter = async (req, res) => {
    const { name, location, status } = req.body;

    try {
        const printer = await Printer.findById(req.params.id);

        if (printer) {
            printer.name = name || printer.name;
            printer.location = location || printer.location;
            printer.status = status || printer.status;

            const updatedPrinter = await printer.save();
            req.io.emit('printerUpdated', { type: 'update', printer: updatedPrinter });
            res.json(updatedPrinter);
        } else {
            res.status(404).json({ message: 'Printer not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a printer
// @route   DELETE /api/printers/:id
// @access  Private/Admin
const deletePrinter = async (req, res) => {
    try {
        const printer = await Printer.findById(req.params.id);

        if (printer) {
            await printer.deleteOne();
            req.io.emit('printerUpdated', { type: 'delete', printerId: req.params.id });
            res.json({ message: 'Printer removed' });
        } else {
            res.status(404).json({ message: 'Printer not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPrinters,
    createPrinter,
    updatePrinter,
    deletePrinter,
};
