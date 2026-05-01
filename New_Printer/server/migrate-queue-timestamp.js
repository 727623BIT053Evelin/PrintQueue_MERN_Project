const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false, timestamps: true }));

        // Find all jobs where queueTimestamp is null and set it to createdAt
        const jobsToUpdate = await Job.find({ queueTimestamp: null });
        console.log(`Found ${jobsToUpdate.length} jobs without queueTimestamp`);

        for (const job of jobsToUpdate) {
            job.queueTimestamp = job.createdAt;
            await job.save();
        }

        console.log(`Updated ${jobsToUpdate.length} jobs with queueTimestamp`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Migration error:', err);
        process.exit(1);
    });
