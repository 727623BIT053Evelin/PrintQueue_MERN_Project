const Job = require('../models/Job');
const Printer = require('../models/Printer');

// @desc    Create a new print job
// @route   POST /api/jobs
// @access  Private
const createJob = async (req, res) => {
    const { printerId, fileUrl, printDetails, paymentMethod, batchId } = req.body;

    try {
        const printer = await Printer.findById(printerId);
        if (!printer) {
            return res.status(404).json({ message: 'Printer not found' });
        }

        const isPaid = paymentMethod === 'online';

        const job = new Job({
            user: req.user._id,
            printer: printerId,
            fileUrl,
            printDetails,
            paymentMethod,
            isPaid,
            confirmedPresence: isPaid, // Auto-confirm presence if paid online
            batchId,
            queueTimestamp: new Date(), // Initialize queue position timestamp
        });

        const createdJob = await job.save();
        req.io.emit('jobUpdated', { type: 'create', job: createdJob });
        res.status(201).json(createdJob);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get user jobs
// @route   GET /api/jobs/user/:userId
// @access  Private
const getUserJobs = async (req, res) => {
    try {
        // Fetch user's jobs sorted by queue order
        const userJobs = await Job.find({ user: req.params.userId })
            .populate('printer', 'name location')
            .sort({ queueTimestamp: 1, createdAt: 1 });

        // Build a global queue of all pending/printing jobs sorted by queue order
        const globalQueue = await Job.find({
            status: { $in: ['pending', 'printing'] }
        }).sort({ queueTimestamp: 1, createdAt: 1 });

        // Map job IDs to their index in the global queue for quick lookup
        const queueIndexMap = new Map();
        globalQueue.forEach((job, idx) => {
            queueIndexMap.set(job._id.toString(), idx);
        });

        const jobsWithWaitTime = userJobs.map(job => {
            const jobObj = job.toObject();
            const globalIdx = queueIndexMap.get(job._id.toString());
            if (globalIdx !== undefined) {
                // Position in the overall queue (1‑based)
                jobObj.positionInQueue = globalIdx + 1;
                // Sum pages of all jobs ahead of this one
                const pagesAhead = globalQueue
                    .slice(0, globalIdx)
                    .reduce((sum, j) => sum + (j.printDetails?.pages || 0), 0);
                // Approximate print time: 3 seconds per page
                jobObj.estimatedWaitTime = Math.round(pagesAhead * 3 * 2.5); // base 3s per page + 1.5min per minute wait
            }
            return jobObj;
        });

        res.json(jobsWithWaitTime);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update job status
// @route   PUT /api/jobs/:id/status
// @access  Private/Admin
const updateJobStatus = async (req, res) => {
    const { status } = req.body;

    try {
        const job = await Job.findById(req.params.id);

        if (job) {
            if (status === 'printing' && !job.isPaid) {
                return res.status(400).json({ message: 'Cannot start printing: Job is unpaid.' });
            }

            job.status = status;
            if (status === 'completed') {
                job.completedAt = Date.now();
                // Emit specific event for collection
                req.io.emit('jobReadyToCollect', { job });

                // Check queue positions and notify users who moved up
                const queueJobs = await Job.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(6);
                queueJobs.forEach((qJob, index) => {
                    if (index === 4) { // 5th person (0-indexed)
                        req.io.to(qJob.user.toString()).emit('queuePositionAlert', {
                            message: "You are 5th in line! Please head to the printer.",
                            jobId: qJob._id
                        });
                    }
                });
            }

            const updatedJob = await job.save();
            req.io.emit('jobUpdated', { type: 'update', job: updatedJob });
            res.json(updatedJob);

            if (status === 'printing') {
                setTimeout(async () => {
                    try {
                        const jobToComplete = await Job.findById(job._id);
                        if (jobToComplete && jobToComplete.status === 'printing') {
                            jobToComplete.status = 'completed';
                            jobToComplete.completedAt = Date.now();
                            await jobToComplete.save();

                            req.io.emit('jobUpdated', { type: 'update', job: jobToComplete });
                            req.io.emit('jobReadyToCollect', { job: jobToComplete });
                            console.log(`Job ${job._id} auto-completed.`);
                        }
                    } catch (err) {
                        console.error('Error auto-completing job:', err);
                    }
                }, 3000);
            }
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Mark job as paid
// @route   PUT /api/jobs/:id/pay
// @access  Private/Admin
const markJobAsPaid = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (job) {
            job.isPaid = true;
            const updatedJob = await job.save();
            req.io.emit('jobUpdated', { type: 'update', job: updatedJob });
            res.json(updatedJob);
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Mark all pending jobs for a user as paid
// @route   PUT /api/jobs/user/:userId/pay-all
// @access  Private/Admin
const markUserJobsAsPaid = async (req, res) => {
    try {
        const userJobs = await Job.find({
            user: req.params.userId,
            status: 'pending',
            isPaid: false
        });

        if (userJobs.length > 0) {
            const updatePromises = userJobs.map(async (job) => {
                job.isPaid = true;
                const updated = await job.save();
                req.io.emit('jobUpdated', { type: 'update', job: updated });
                return updated;
            });

            const updatedJobs = await Promise.all(updatePromises);
            res.json({ message: `Marked ${updatedJobs.length} jobs as paid`, jobs: updatedJobs });
        } else {
            res.status(404).json({ message: 'No unpaid pending jobs found for this user' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Mark all pending jobs in a batch as paid
// @route   PUT /api/jobs/batch/:batchId/pay
// @access  Private/Admin
const markBatchAsPaid = async (req, res) => {
    try {
        const batchJobs = await Job.find({
            batchId: req.params.batchId,
            status: 'pending',
            isPaid: false
        });

        if (batchJobs.length > 0) {
            const updatePromises = batchJobs.map(async (job) => {
                job.isPaid = true;
                const updated = await job.save();
                req.io.emit('jobUpdated', { type: 'update', job: updated });
                return updated;
            });

            const updatedJobs = await Promise.all(updatePromises);
            res.json({ message: `Marked ${updatedJobs.length} jobs in batch as paid`, jobs: updatedJobs });
        } else {
            res.status(404).json({ message: 'No unpaid pending jobs found for this batch' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Start printing all jobs in a batch (FIFO order)
// @route   PUT /api/jobs/batch/:batchId/print
// @access  Private/Admin
const startBatchPrinting = async (req, res) => {
    try {
        const batchId = req.params.batchId.trim();
        console.log(`StartBatchPrinting called for batchId: '${batchId}'`);

        const query = {
            batchId: batchId,
            status: 'pending',
            isPaid: true
        };
        console.log('Querying jobs with:', JSON.stringify(query));

        const batchJobs = await Job.find(query).sort({ createdAt: 1 });
        console.log(`Found ${batchJobs.length} jobs for batch printing`);

        if (batchJobs.length > 0) {
            const firstJob = batchJobs[0];
            firstJob.status = 'printing';
            const updatedJob = await firstJob.save();
            req.io.emit('jobUpdated', { type: 'update', job: updatedJob });

            res.json({ message: 'Batch printing started', jobId: firstJob._id });

            setTimeout(async () => {
                try {
                    const jobToComplete = await Job.findById(firstJob._id);
                    if (jobToComplete && jobToComplete.status === 'printing') {
                        jobToComplete.status = 'completed';
                        jobToComplete.completedAt = Date.now();
                        await jobToComplete.save();

                        req.io.emit('jobUpdated', { type: 'update', job: jobToComplete });
                        req.io.emit('jobReadyToCollect', { job: jobToComplete });
                        console.log(`Job ${firstJob._id} auto-completed.`);

                        const nextJobs = await Job.find({
                            batchId: req.params.batchId,
                            status: 'pending',
                            isPaid: true
                        }).sort({ createdAt: 1 });

                        if (nextJobs.length > 0) {
                            const nextJob = nextJobs[0];
                            nextJob.status = 'printing';
                            await nextJob.save();
                            req.io.emit('jobUpdated', { type: 'update', job: nextJob });
                        }
                    }
                } catch (err) {
                    console.error('Error in batch printing chain:', err);
                }
            }, 3000);
        } else {
            res.status(404).json({ message: 'No printable jobs found in this batch' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Confirm user presence at counter
// @route   PUT /api/jobs/:id/confirm-presence
// @access  Private
const confirmPresence = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (job) {
            let jobsToUpdate;

            if (job.batchId) {
                jobsToUpdate = await Job.find({
                    batchId: job.batchId,
                    status: 'pending',
                    confirmedPresence: false
                });
            } else {
                jobsToUpdate = [job];
            }

            const updatePromises = jobsToUpdate.map(async (jobToUpdate) => {
                jobToUpdate.confirmedPresence = true;
                jobToUpdate.confirmationTime = Date.now();
                const updated = await jobToUpdate.save();
                req.io.emit('jobUpdated', { type: 'update', job: updated });
                return updated;
            });

            await Promise.all(updatePromises);

            const updatedCurrentJob = await Job.findById(req.params.id);
            res.json(updatedCurrentJob);
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all jobs (Admin)
// @route   GET /api/jobs/admin/all
// @access  Private/Admin
const getAllJobs = async (req, res) => {
    try {
        console.log('getAllJobs called - checking for data consistency...');

        // Self-healing: Find jobs where queueTimestamp is missing or null
        const jobsToFix = await Job.find({
            $or: [
                { queueTimestamp: null },
                { queueTimestamp: { $exists: false } }
            ]
        });

        if (jobsToFix.length > 0) {
            console.log(`Found ${jobsToFix.length} jobs with missing queueTimestamp. Fixing manually...`);

            // Fix each job individually to ensure it saves correctly
            for (const job of jobsToFix) {
                job.queueTimestamp = job.createdAt;
                await job.save();
                console.log(`Fixed job ${job._id}: queueTimestamp set to ${job.createdAt}`);
            }
            console.log('Auto-fix complete.');
        } else {
            console.log('All jobs have valid queueTimestamp.');
        }

        const jobs = await Job.find({})
            .populate('printer', 'name location')
            .populate('user', 'name email')
            .sort({ createdAt: 1 });
        res.json(jobs);
    } catch (error) {
        console.error('getAllJobs error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @route   GET /api/jobs/queue
// @access  Public
const getQueueJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ status: { $in: ['pending', 'printing'] } })
            .populate('printer', 'name location')
            .select('status createdAt printDetails user queueTimestamp')
            .sort({ queueTimestamp: 1, createdAt: 1 });

        // Calculate wait time for each job
        const jobsWithWaitTime = jobs.map((job, index) => {
            if (job.status === 'pending') {
                // Sum pages of all jobs ahead (including currently printing)
                const jobsAhead = jobs.slice(0, index);
                const totalPagesAhead = jobsAhead.reduce((sum, j) => sum + (j.printDetails?.pages || 0), 0);

                // Formula: Total Pages × 3 seconds
                const waitTimeSeconds = totalPagesAhead * 3;

                return {
                    ...job.toObject(),
                    estimatedWaitTime: waitTimeSeconds,
                    positionInQueue: index + 1
                };
            }
            return job.toObject();
        });

        res.json(jobsWithWaitTime);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark job as collected (Physical handover)
// @route   PUT /api/jobs/:id/collected
// @access  Private
const markAsCollected = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (job) {
            // Check permissions
            if (!req.user.isAdmin && job.user.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: 'Not authorized to update this job' });
            }

            job.status = 'collected';
            job.collectedAt = Date.now();
            const updatedJob = await job.save();
            req.io.emit('jobUpdated', { type: 'update', job: updatedJob });
            res.json(updatedJob);
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a job
// @route   DELETE /api/jobs/:id
// @access  Private
const deleteJob = async (req, res) => {
    try {
        console.log(`Attempting to delete job ${req.params.id} by user ${req.user._id} (Admin: ${req.user.isAdmin})`);
        const job = await Job.findById(req.params.id);

        if (job) {
            console.log(`Job found. Owner: ${job.user}, Status: ${job.status}`);
            // Check permissions
            // Admin can delete any job
            // User can delete their own jobs unless they are printing
            if (req.user.isAdmin || (job.user.toString() === req.user._id.toString() && job.status !== 'printing')) {
                await job.deleteOne();
                req.io.emit('jobUpdated', { type: 'delete', jobId: req.params.id });
                res.json({ message: 'Job removed' });
            } else {
                console.log('Delete failed: Unauthorized or Job is printing');
                res.status(401).json({ message: 'Not authorized to delete this job or job is currently printing' });
            }
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a batch of jobs
// @route   DELETE /api/jobs/batch/:batchId
// @access  Private
const deleteBatch = async (req, res) => {
    try {
        const batchId = req.params.batchId.trim();
        console.log(`Attempting to delete batch ${batchId} by user ${req.user._id}`);

        // Find all jobs in the batch
        const jobs = await Job.find({ batchId: batchId });

        if (jobs.length === 0) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        // Check permissions and status
        // Admin can delete any batch
        // User can delete their own batch if no jobs are printing
        const isOwner = jobs.every(job => job.user.toString() === req.user._id.toString());
        const isPrinting = jobs.some(job => job.status === 'printing');

        if (req.user.isAdmin || (isOwner && !isPrinting)) {
            await Job.deleteMany({ batchId: batchId });
            req.io.emit('jobUpdated', { type: 'batchDelete', batchId: batchId });
            res.json({ message: 'Batch removed' });
        } else {
            res.status(401).json({ message: 'Not authorized to delete this batch or batch is printing' });
        }
    } catch (error) {
        console.error('Delete batch error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Skip a batch (move to later in queue)
// @route   PUT /api/jobs/batch/:batchId/skip
// @access  Private/Admin
const skipBatch = async (req, res) => {
    try {
        const { batchId } = req.params;

        // Find all jobs in the batch
        const batchJobs = await Job.find({ batchId });

        if (batchJobs.length === 0) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        // Check if max skips reached (using the first job as reference)
        const currentSkipCount = batchJobs[0].skipCount || 0;

        if (currentSkipCount >= 2) {
            return res.status(400).json({ message: 'Maximum skip limit reached for this batch' });
        }

        // Get all pending jobs sorted by creation time
        const allPendingJobs = await Job.find({
            status: 'pending'
        }).sort({ createdAt: 1 });

        // Group jobs by batchId to identify unique batches in order
        const batches = [];
        const seenBatchIds = new Set();

        for (const job of allPendingJobs) {
            if (job.batchId && !seenBatchIds.has(job.batchId)) {
                seenBatchIds.add(job.batchId);
                batches.push({
                    batchId: job.batchId,
                    createdAt: job.createdAt
                });
            }
        }

        // Remove the batch being skipped from the list to get accurate positions
        const otherBatches = batches.filter(b => b.batchId !== batchId);

        // Determine target position (0-indexed)
        // 1st skip (count 0) -> move to after 5th batch (index 4) -> target index 5
        // 2nd skip (count 1) -> move to after 10th batch (index 9) -> target index 10
        let targetBatchIndex;
        if (currentSkipCount === 0) {
            targetBatchIndex = 5;
        } else {
            targetBatchIndex = 10;
        }

        // If we don't have enough batches, move to the end
        if (targetBatchIndex >= otherBatches.length) {
            targetBatchIndex = otherBatches.length;
        }

        let newCreatedAt;

        if (targetBatchIndex === 0) {
            // Move to front (unlikely for skip, but handled)
            if (otherBatches.length > 0) {
                newCreatedAt = new Date(otherBatches[0].createdAt.getTime() - 60000);
            } else {
                newCreatedAt = new Date();
            }
        } else if (targetBatchIndex >= otherBatches.length) {
            // Move to end
            if (otherBatches.length > 0) {
                const lastBatch = otherBatches[otherBatches.length - 1];
                newCreatedAt = new Date(lastBatch.createdAt.getTime() + 60000);
            } else {
                newCreatedAt = new Date();
            }
        } else {
            // Insert between batch at [targetBatchIndex - 1] and [targetBatchIndex]
            const prevBatch = otherBatches[targetBatchIndex - 1];
            const nextBatch = otherBatches[targetBatchIndex];

            if (nextBatch) {
                const timeDiff = nextBatch.createdAt.getTime() - prevBatch.createdAt.getTime();
                newCreatedAt = new Date(prevBatch.createdAt.getTime() + (timeDiff / 2));
            } else {
                newCreatedAt = new Date(prevBatch.createdAt.getTime() + 60000);
            }
        }

        console.log('=== SKIP BATCH DEBUG ===');
        console.log('BatchId:', batchId);
        console.log('Current skipCount:', currentSkipCount);
        console.log('Total batches (including this):', batches.length);
        console.log('Other batches (excluding this):', otherBatches.length);
        console.log('Target index:', targetBatchIndex);
        console.log('Old createdAt:', batchJobs[0].createdAt);
        console.log('New queueTimestamp:', newCreatedAt);
        console.log('========================');

        // Update all jobs in batch with new timestamp and increment skipCount
        await Job.updateMany(
            { batchId },
            {
                $set: { queueTimestamp: newCreatedAt },
                $inc: { skipCount: 1 }
            }
        );

        // Fetch updated jobs to broadcast
        let updatedJobs = await Job.find({ batchId });

        // Manually set the queueTimestamp to ensure it's fresh
        updatedJobs = updatedJobs.map(job => {
            const jobObj = job.toObject();
            jobObj.queueTimestamp = newCreatedAt;
            return jobObj;
        });

        console.log('=== EMITTING SOCKET EVENT ===');
        console.log('Event type: batchUpdate');
        console.log('BatchId:', batchId);
        console.log('Number of jobs:', updatedJobs.length);
        console.log('First job queueTimestamp:', updatedJobs[0]?.queueTimestamp);
        console.log('=============================');

        req.io.emit('jobUpdated', {
            type: 'batchUpdate',
            batchId,
            jobs: updatedJobs
        });

        res.json({ message: 'Batch skipped successfully', newPosition: targetBatchIndex + 1 });

    } catch (error) {
        console.error('Skip batch error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change printer for a job
// @route   PUT /api/jobs/:id/change-printer
// @access  Private/Admin
const changePrinter = async (req, res) => {
    try {
        const { printerId } = req.body;
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        const printer = await Printer.findById(printerId);
        if (!printer) {
            return res.status(404).json({ message: 'Printer not found' });
        }

        job.printer = printerId;
        const updatedJob = await job.save();
        req.io.emit('jobUpdated', { type: 'update', job: updatedJob });
        res.json(updatedJob);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createJob,
    getUserJobs,
    updateJobStatus,
    deleteJob,
    getAllJobs,
    confirmPresence,
    getQueueJobs,
    markJobAsPaid,
    markUserJobsAsPaid,
    markBatchAsPaid,
    startBatchPrinting,
    markAsCollected,
    deleteBatch,
    skipBatch,
    changePrinter
};
