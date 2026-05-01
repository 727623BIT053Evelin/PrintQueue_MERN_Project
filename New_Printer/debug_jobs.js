const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const Job = require('../server/models/Job');
const Printer = require('../server/models/Printer');
const User = require('../server/models/User');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting:', err.message);
        process.exit(1);
    }
};

const checkJobs = async () => {
    await connectDB();

    try {
        const jobs = await Job.find({}).sort({ createdAt: -1 });
        console.log(`Found ${jobs.length} jobs.`);

        jobs.forEach(job => {
            console.log('------------------------------------------------');
            console.log(`Job ID: ${job._id}`);
            console.log(`User: ${job.user}`);
            console.log(`Batch ID: "${job.batchId}"`); // Quote to see whitespace
            console.log(`Status: ${job.status}`);
            console.log(`Payment Status: ${job.paymentStatus}`);
            console.log(`Is Paid: ${job.isPaid}`);
            console.log(`Printer: ${job.printer}`);
            console.log(`Created At: ${job.createdAt}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.disconnect();
    }
};

checkJobs();
