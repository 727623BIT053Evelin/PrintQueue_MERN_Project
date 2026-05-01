const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('./models/Job');
const User = require('./models/User');

dotenv.config();

const deleteOrphanedJobs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const jobs = await Job.find({});
        let deletedCount = 0;

        for (const job of jobs) {
            const user = await User.findById(job.user);
            if (!user) {
                await Job.findByIdAndDelete(job._id);
                console.log(`Deleted Orphaned Job: ${job._id}`);
                deletedCount++;
            }
        }

        console.log('-----------------------------------');
        console.log(`Successfully deleted ${deletedCount} orphaned jobs.`);

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

deleteOrphanedJobs();
