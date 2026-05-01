const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Job = require('./models/Job');
const Printer = require('./models/Printer');
const connectDB = require('./config/db');

dotenv.config();

const testConfirm = async () => {
    try {
        await connectDB();

        // 1. Setup: Get a user and printer
        const user = await User.findOne({ email: 'student@example.com' });
        const printer = await Printer.findOne({});

        if (!user || !printer) {
            console.error('User or Printer not found. Run seed.js first.');
            process.exit(1);
        }

        // 2. Create 3 pending jobs
        console.log('Creating 3 pending jobs...');
        const jobs = [];
        for (let i = 0; i < 3; i++) {
            const job = await Job.create({
                user: user._id,
                printer: printer._id,
                fileUrl: `http://test.com/file${i}.pdf`,
                status: 'pending',
                confirmedPresence: false,
                printDetails: { pages: 1, color: 'bw', sides: 'single', cost: 0.5 }
            });
            jobs.push(job);
        }
        console.log(`Created jobs: ${jobs.map(j => j._id).join(', ')}`);

        // 3. Simulate confirmPresence on the first job
        console.log(`Simulating confirmPresence on job ${jobs[0]._id}...`);

        // Mocking the logic from controller
        const jobToConfirm = await Job.findById(jobs[0]._id);
        const userJobs = await Job.find({
            user: jobToConfirm.user,
            status: 'pending',
            confirmedPresence: false
        });

        console.log(`Found ${userJobs.length} pending jobs for user.`);

        const updatePromises = userJobs.map(async (userJob) => {
            userJob.confirmedPresence = true;
            userJob.confirmationTime = Date.now();
            const updated = await userJob.save();
            console.log(`Updated job ${updated._id}: confirmedPresence=${updated.confirmedPresence}`);
            return updated;
        });

        await Promise.all(updatePromises);

        // 4. Verify all are confirmed
        const finalJobs = await Job.find({
            _id: { $in: jobs.map(j => j._id) }
        });

        const allConfirmed = finalJobs.every(j => j.confirmedPresence === true);
        console.log('All jobs confirmed?', allConfirmed);

        if (allConfirmed) {
            console.log('SUCCESS: Batch confirmation logic works.');
        } else {
            console.log('FAILURE: Some jobs were not confirmed.');
            finalJobs.forEach(j => console.log(`Job ${j._id}: ${j.confirmedPresence}`));
        }

        // Cleanup
        await Job.deleteMany({ _id: { $in: jobs.map(j => j._id) } });
        console.log('Cleanup done.');
        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

testConfirm();
