const express = require('express');
const router = express.Router();
const {
    createJob,
    getUserJobs,
    updateJobStatus,
    confirmPresence,
    getAllJobs,
    getQueueJobs,
    markJobAsPaid,
    markUserJobsAsPaid,
    markBatchAsPaid,
    startBatchPrinting,
    markAsCollected,
    deleteJob,
    deleteBatch,
    skipBatch,
    changePrinter
} = require('../controllers/jobController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/queue').get(getQueueJobs);
router.route('/').post(protect, createJob);
router.route('/user/:userId').get(protect, getUserJobs);
router.route('/:id').delete(protect, (req, res, next) => {
    console.log('DELETE route hit for ID:', req.params.id);
    deleteJob(req, res, next);
});
router.route('/:id/status').put(protect, admin, updateJobStatus);
router.route('/:id/pay').put(protect, admin, markJobAsPaid);
router.route('/:id/collected').put(protect, markAsCollected);
router.route('/:id/change-printer').put(protect, admin, changePrinter);
router.route('/user/:userId/pay-all').put(protect, admin, markUserJobsAsPaid);
router.route('/batch/:batchId/pay').put(protect, admin, markBatchAsPaid);
router.route('/batch/:batchId/start-printing').put(protect, admin, startBatchPrinting);
router.route('/batch/:batchId/skip').put(protect, admin, skipBatch);
router.route('/batch/:batchId').delete(protect, deleteBatch);
router.route('/:id/confirm').put(protect, confirmPresence);
router.route('/admin/all').get(protect, admin, getAllJobs);

module.exports = router;
