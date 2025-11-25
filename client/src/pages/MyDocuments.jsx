import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { io } from 'socket.io-client';
import { FileText, Clock, CheckCircle, MapPin, RefreshCw, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import BillModal from '../components/BillModal';
import API_URL from '../config';

const MyDocuments = () => {
    const { user } = useContext(AuthContext);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [queueStats, setQueueStats] = useState({ peopleAhead: 0, waitTime: 0 });
    const [selectedBillJob, setSelectedBillJob] = useState(null);
    const [expandedBatches, setExpandedBatches] = useState({});

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                };
                const { data } = await axios.get(`${API_URL}/api/jobs/user/${user._id}`, config);
                setJobs(data);
                setLoading(false);
            } catch (error) {
                toast.error('Failed to fetch jobs');
                setLoading(false);
            }
        };

        const fetchQueueStats = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/jobs/queue`);
                const jobs = response.data;

                const currentUserId = user._id;
                const userFirstJobIndex = jobs.findIndex((job) => job.user === currentUserId);

                if (userFirstJobIndex === -1) {
                    setQueueStats({ peopleAhead: 0, waitTime: 0 });
                    return;
                }

                const jobsAhead = jobs.slice(0, userFirstJobIndex);
                const uniqueUsersAhead = new Set(jobsAhead.map(job => job.user)).size;
                const pagesAhead = jobsAhead.reduce((acc, job) => acc + (job.printDetails?.pages || 0), 0);
                const totalWaitSeconds = pagesAhead * 3;
                const userWaitTime = Math.ceil(totalWaitSeconds / 60);

                setQueueStats({
                    peopleAhead: uniqueUsersAhead,
                    waitTime: userWaitTime,
                });
            } catch (error) {
                console.error('Failed to fetch queue stats:', error);
            }
        };

        fetchJobs();
        fetchQueueStats();

        const socket = io(API_URL);
        socket.on('jobUpdated', (data) => {
            if (data.type === 'create' && data.job.user === user._id) {
                setJobs((prev) => [data.job, ...prev]);
            } else if (data.type === 'update') {
                setJobs((prev) => prev.map((job) => (job._id === data.job._id ? data.job : job)));
            } else if (data.type === 'delete') {
                setJobs((prev) => prev.filter((job) => job._id !== data.jobId));
            }
            // Refresh queue stats when any job is updated
            fetchQueueStats();
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // Handle payment success redirect from Stripe
    useEffect(() => {
        const handlePaymentSuccess = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const paymentStatus = urlParams.get('payment');
            const sessionId = urlParams.get('session_id');

            if (paymentStatus === 'success' && sessionId) {
                try {
                    const config = {
                        headers: { Authorization: `Bearer ${user.token}` },
                    };

                    // Verify payment with backend
                    await axios.get(`${API_URL}/api/payments/verify/${sessionId}`, config);

                    toast.success('Payment successful! Your print jobs have been added to the queue.');

                    // Refresh jobs to show updated payment status
                    const { data } = await axios.get(`${API_URL}/api/jobs/user/${user._id}`, config);
                    setJobs(data);

                    // Clean up URL
                    window.history.replaceState({}, document.title, '/my-documents');
                } catch (error) {
                    console.error('Payment verification error:', error);
                    toast.error('Payment verification failed. Please contact support if payment was deducted.');
                }
            } else if (paymentStatus === 'cancelled') {
                toast.info('Payment cancelled. You can try again from Upload page.');
                window.history.replaceState({}, document.title, '/my-documents');
            }
        };

        handlePaymentSuccess();
    }, [user]);

    const totalPendingCost = jobs
        .filter(job => job.status === 'pending' && !job.isPaid)
        .reduce((acc, job) => acc + (job.printDetails?.cost || 0), 0)
        .toFixed(2);

    const confirmPresence = async (jobId) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await axios.put(`${API_URL}/api/jobs/${jobId}/confirm`, {}, config);
            toast.success('Presence confirmed for all pending jobs!');

            // Force refresh to ensure all jobs are updated
            setTimeout(() => {
                const fetchJobs = async () => {
                    try {
                        const { data } = await axios.get(`${API_URL}/api/jobs/user/${user._id}`, config);
                        setJobs(data);
                    } catch (error) {
                        console.error("Failed to refresh jobs");
                    }
                };
                fetchJobs();
            }, 500);

        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to confirm presence');
        }
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await axios.delete(`${API_URL}/api/jobs/${jobId}`, config);
            toast.success('Document deleted');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete document');
        }
    };

    const handleMarkCollected = async (jobId) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await axios.put(`${API_URL}/api/jobs/${jobId}/collected`, {}, config);
            toast.success('Marked as collected');
            // Refresh jobs
            setJobs(prev => prev.map(job => job._id === jobId ? { ...job, status: 'collected', collectedAt: Date.now() } : job));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const handleDeleteBatch = async (batchId) => {
        console.log('handleDeleteBatch called with:', batchId);
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            console.log(`Sending DELETE request to ${API_URL}/api/jobs/batch/${batchId}`);
            await axios.delete(`${API_URL}/api/jobs/batch/${batchId}`, config);
            console.log('Batch deleted successfully');
            toast.success('Document deleted');
            // Refresh jobs
            setJobs(prev => prev.filter(job => job.batchId !== batchId));
        } catch (error) {
            console.error('Delete batch error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete document');
        }
    };

    // Group jobs by batch
    const groupJobsByBatch = () => {
        const batches = {};
        const individualJobs = [];

        jobs.forEach(job => {
            if (job.batchId) {
                if (!batches[job.batchId]) {
                    batches[job.batchId] = {
                        batchId: job.batchId,
                        jobs: [],
                        totalPages: 0,
                        totalCost: 0,
                        allPaid: true,
                        allConfirmed: true,
                        status: job.status,
                        createdAt: job.createdAt,
                        isPending: job.status === 'pending',
                        positionInQueue: job.positionInQueue,
                        estimatedWaitTime: job.estimatedWaitTime
                    };
                }
                batches[job.batchId].jobs.push(job);
                batches[job.batchId].totalPages += job.printDetails?.pages || 0;
                batches[job.batchId].totalCost += job.printDetails?.cost || 0;
                if (!job.isPaid) batches[job.batchId].allPaid = false;
                if (!job.confirmedPresence) batches[job.batchId].allConfirmed = false;
                // Update position and wait time to the minimum position in this batch
                if (job.positionInQueue && (job.positionInQueue < batches[job.batchId].positionInQueue || !batches[job.batchId].positionInQueue)) {
                    batches[job.batchId].positionInQueue = job.positionInQueue;
                    batches[job.batchId].estimatedWaitTime = job.estimatedWaitTime;
                }
            } else {
                individualJobs.push(job);
            }
        });

        return { batches: Object.values(batches), individualJobs };
    };

    const { batches, individualJobs } = groupJobsByBatch();

    // Toggle batch expansion
    const toggleBatch = (batchId) => {
        setExpandedBatches(prev => ({
            ...prev,
            [batchId]: !prev[batchId]
        }));
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-end mb-8 animate-slide-up">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">My Documents</h1>
                    <p className="text-slate-500 mt-1">Manage your print queue and status</p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="hidden md:block mb-2">
                        <div className="inline-flex items-center px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full shadow-sm border border-white/40 text-sm text-slate-500">
                            <RefreshCw className="w-4 h-4 mr-2 text-indigo-600" />
                            Auto-refreshing
                        </div>
                    </div>
                    {Number(totalPendingCost) > 0 && (
                        <div className="glass-panel px-4 py-2 border-indigo-200 bg-indigo-50/50">
                            <span className="text-sm text-indigo-600 font-medium mr-2">Total to Pay:</span>
                            <span className="text-xl font-bold text-indigo-700">${totalPendingCost}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Queue Status Banner */}
            <div className="glass-panel p-6 mb-8 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-indigo-100/50 animate-slide-up">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md text-indigo-600 mr-4">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Queue Status</h3>
                            <p className="text-sm text-slate-500">Estimated wait time based on current load</p>
                        </div>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="flex-1 md:flex-none bg-white/60 px-6 py-3 rounded-xl shadow-sm text-center backdrop-blur-sm">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">People Ahead</p>
                            <p className="text-2xl font-bold text-slate-800">{queueStats.peopleAhead}</p>
                        </div>
                        <div className="flex-1 md:flex-none bg-white/60 px-6 py-3 rounded-xl shadow-sm text-center backdrop-blur-sm">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Est. Wait</p>
                            <p className="text-2xl font-bold text-slate-800">{queueStats.waitTime} <span className="text-sm font-normal text-slate-500">mins</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Documents List */}
            <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                {jobs.length === 0 && !loading ? (
                    <div className="text-center py-20 glass-panel">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-800">No documents yet</h3>
                        <p className="text-slate-500 mb-6">Upload a document to get started</p>
                    </div>
                ) : (
                    <>
                        {/* Display Batches */}
                        {batches.map((batch) => {
                            const isExpanded = expandedBatches[batch.batchId];
                            const firstJob = batch.jobs[0];

                            return (
                                <React.Fragment key={batch.batchId}>
                                    {/* Batch Summary Row */}
                                    <div
                                        className="glass-card p-6 cursor-pointer hover:shadow-lg transition-all"
                                        onClick={() => toggleBatch(batch.batchId)}
                                    >
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                            {/* Batch Info */}
                                            <div className="flex items-center w-full md:w-auto">
                                                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mr-4">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-800">
                                                            {batch.jobs.length} document{batch.jobs.length > 1 ? 's' : ''}
                                                        </h4>
                                                        <span className="text-xs text-slate-500">
                                                            {isExpanded ? '▼' : '▶'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                                                        <span className="flex items-center">
                                                            <FileText className="w-3 h-3 mr-1" />
                                                            {batch.totalPages} pages total
                                                        </span>
                                                        <span>•</span>
                                                        <span className="font-bold text-indigo-600">${batch.totalCost.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status and Actions */}
                                            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
                                                {/* Payment Status */}
                                                {!batch.allPaid && (
                                                    <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-700 border border-amber-200 flex items-center">
                                                        <Clock className="w-4 h-4 mr-1.5" />
                                                        UNPAID
                                                    </span>
                                                )}
                                                {batch.allPaid && batch.status === 'pending' && (
                                                    <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                                        PAID
                                                    </span>
                                                )}
                                                {batch.status === 'completed' && batch.jobs[0]?.paymentMethod === 'online' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkCollected(firstJob._id);
                                                        }}
                                                        className="px-4 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200 flex items-center hover:bg-green-200 transition-colors"
                                                        title="Click to mark as collected"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1.5" />
                                                        Ready To Collect
                                                    </button>
                                                )}
                                                {batch.status === 'collected' && (
                                                    <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center">
                                                        <CheckCircle className="w-4 h-4 mr-1.5" />
                                                        Collected
                                                    </span>
                                                )}

                                                {/* I'm Here Button */}
                                                {batch.isPending && !batch.allPaid && !batch.allConfirmed && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-center px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 min-w-[100px]">
                                                            <div className="text-xs text-slate-600 font-medium">
                                                                Position {batch.positionInQueue || 'N/A'}
                                                            </div>
                                                            {batch.estimatedWaitTime !== undefined && (
                                                                <div className="text-xs text-slate-500 flex items-center justify-center mt-0.5">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    {Math.floor(batch.estimatedWaitTime / 60)} min {batch.estimatedWaitTime % 60} sec
                                                                </div>
                                                            )}
                                                        </div>

                                                        {batch.positionInQueue && batch.positionInQueue <= 5 && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    confirmPresence(firstJob._id);
                                                                }}
                                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-lg shadow-indigo-500/30"
                                                            >
                                                                <MapPin className="w-4 h-4 mr-1.5" />
                                                                I'm Here
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Bill Button */}
                                                {(batch.status === 'completed' || batch.status === 'collected') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedBillJob(firstJob);
                                                        }}
                                                        className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center"
                                                    >
                                                        <Receipt className="w-4 h-4 mr-1.5" />
                                                        Bill
                                                    </button>
                                                )}
                                                {/* Delete Batch Button */}
                                                {batch.status !== 'printing' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteBatch(batch.batchId);
                                                        }}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Document(s)"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Individual Documents */}
                                    {isExpanded && (
                                        <div className="ml-4 space-y-2 border-l-2 border-purple-200 pl-4">
                                            {batch.jobs.map((job) => (
                                                <div key={job._id} className="glass-card p-4 flex items-center justify-between">
                                                    <div className="flex items-center flex-1">
                                                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mr-3">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h5 className="text-sm font-medium text-slate-800">{job.fileUrl.split('/').pop()}</h5>
                                                            <div className="flex gap-2 text-xs text-slate-500">
                                                                <span>{job.printDetails.pages} pgs</span>
                                                                <span>•</span>
                                                                <span>{job.printDetails.color}</span>
                                                                <span>•</span>
                                                                <span className="font-bold text-indigo-600">${job.printDetails.cost}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDelete(job._id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {/* Display Individual Jobs (no batch) */}
                        {individualJobs.map((job) => (
                            <div key={job._id} className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 group">
                                <div className="flex items-center w-full md:w-auto">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mr-4 group-hover:scale-105 transition-transform shadow-sm">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 mb-1">{job.fileUrl.split('/').pop()}</h4>
                                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                            <span className="flex items-center">
                                                <FileText className="w-3 h-3 mr-1" />
                                                {job.printDetails.pages} pages
                                            </span>
                                            <span>•</span>
                                            <span>{job.printDetails.color === 'bw' ? 'Black & White' : 'Color'}</span>
                                            <span>•</span>
                                            <span>{job.printDetails.sides === 'single' ? 'Single-sided' : 'Double-sided'}</span>
                                            <span>•</span>
                                            <span className="font-bold text-indigo-600">${job.printDetails.cost}</span>
                                        </div>
                                        {job.status === 'pending' && job.isPaid && job.estimatedWaitTime !== undefined && (
                                            <div className="mt-2 text-xs text-blue-600 font-medium flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Est. wait: {Math.floor(job.estimatedWaitTime / 60)} min {job.estimatedWaitTime % 60} sec
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                    {/* Status Badge */}
                                    {job.status === 'completed' && job.paymentMethod === 'online' ? (
                                        <button
                                            onClick={() => handleMarkCollected(job._id)}
                                            className="px-4 py-1.5 rounded-full text-sm font-medium flex items-center shadow-sm border bg-green-100 text-green-700 border-green-200 hover:bg-green-200 transition-colors"
                                            title="Click to mark as collected"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-1.5" />
                                            Ready to Collect
                                        </button>
                                    ) : (
                                        <div className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center shadow-sm border ${job.status === 'collected' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                            job.status === 'printing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                job.status === 'skipped' ? 'bg-red-100 text-red-700 border-red-200' :
                                                    'bg-amber-100 text-amber-700 border-amber-200'
                                            }`}>
                                            {job.status === 'collected' && <CheckCircle className="w-4 h-4 mr-1.5" />}
                                            {job.status === 'printing' && <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />}
                                            {job.status === 'pending' && <Clock className="w-4 h-4 mr-1.5" />}
                                            <span className="capitalize">{job.status}</span>
                                        </div>
                                    )}

                                    {/* Payment Status */}
                                    <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${job.isPaid ? 'text-green-600 bg-green-50 border-green-200' : 'text-orange-600 bg-orange-50 border-orange-200'
                                        }`}>
                                        {job.isPaid ? 'Paid' : 'Unpaid'}
                                    </div>

                                    {/* Action Buttons */}
                                    {!job.confirmedPresence && job.status === 'pending' && !job.isPaid && (
                                        <div className="flex items-center gap-3">
                                            <div className="text-center px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 min-w-[100px]">
                                                <div className="text-xs text-slate-600 font-medium">
                                                    Position {job.positionInQueue || 'N/A'}
                                                </div>
                                                {job.estimatedWaitTime !== undefined && (
                                                    <div className="text-xs text-slate-500 flex items-center justify-center mt-0.5">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {Math.floor(job.estimatedWaitTime / 60)} min {job.estimatedWaitTime % 60} sec
                                                    </div>
                                                )}
                                            </div>

                                            {job.positionInQueue <= 5 && (
                                                <button
                                                    onClick={() => confirmPresence(job._id)}
                                                    className="w-full md:w-auto px-4 py-2 btn-primary flex items-center justify-center"
                                                >
                                                    <MapPin className="w-4 h-4 mr-2" />
                                                    I'm Here
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {(job.status === 'completed' || job.status === 'collected') && (
                                        <button
                                            onClick={() => setSelectedBillJob(job)}
                                            className="w-full md:w-auto px-4 py-2 btn-secondary flex items-center justify-center"
                                        >
                                            <Receipt className="w-4 h-4 mr-2" />
                                            Bill
                                        </button>
                                    )}

                                    {job.status === 'pending' && (
                                        <button
                                            onClick={() => handleDelete(job._id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Document"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}

                                    {job.confirmedPresence && job.status === 'pending' && (
                                        <span className="text-sm text-green-600 font-medium flex items-center bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                                            <CheckCircle className="w-4 h-4 mr-1.5" />
                                            Ready
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {selectedBillJob && (
                <BillModal
                    job={selectedBillJob}
                    onClose={() => setSelectedBillJob(null)}
                />
            )}
        </div>
    );
};

export default MyDocuments;
