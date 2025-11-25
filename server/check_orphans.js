const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('./models/Job');
const User = require('./models/User');

dotenv.config();

const checkOrphanedJobs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const jobs = await Job.find({});
        console.log(`Total jobs: ${jobs.length}`);

        let orphanedCount = 0;

        for (const job of jobs) {
            // Check if user exists
            const user = await User.findById(job.user);
            if (!user) {
                console.log(`Orphaned Job Found: ID: ${job._id}, User ID: ${job.user}, Created: ${job.createdAt}`);
                orphanedCount++;
            }
        }

        console.log('-----------------------------------');
        console.log(`Total Orphaned Jobs (Unknown User): ${orphanedCount}`);

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkOrphanedJobs();
