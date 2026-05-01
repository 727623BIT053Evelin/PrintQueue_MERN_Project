const mongoose = require('mongoose');

const printerSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'busy'],
        default: 'online',
    },
    // Optional: Add more fields like model, ipAddress if needed later
}, {
    timestamps: true,
});

const Printer = mongoose.model('Printer', printerSchema);

module.exports = Printer;
