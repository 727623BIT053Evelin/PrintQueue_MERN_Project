const mongoose = require('mongoose');

const jobSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    printer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Printer',
    },
    fileUrl: {
        type: String,
        required: true,
    },
    batchId: {
        type: String,
        required: false, // Optional for backward compatibility or single uploads
    },
    status: {
        type: String,
        enum: ['pending', 'printing', 'completed', 'failed', 'skipped', 'collected'],
        default: 'pending',
    },
    isPaid: {
        type: Boolean,
        default: false,
    },
    paymentMethod: {
        type: String,
        enum: ['online', 'counter', 'none'],
        default: 'none',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'pending_payment', 'paid', 'failed'],
        default: 'pending',
    },
    confirmedPresence: {
        type: Boolean,
        default: false,
    },
    confirmationTime: {
        type: Date,
    },
    printDetails: {
        sides: { type: String, enum: ['single', 'double'], default: 'single' },
        color: { type: String, enum: ['bw', 'color'], default: 'bw' },
        pages: { type: Number, default: 1 },
        cost: { type: Number, default: 0 },
    },
    skipCount: {
        type: Number,
        default: 0,
    },
    queueTimestamp: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
