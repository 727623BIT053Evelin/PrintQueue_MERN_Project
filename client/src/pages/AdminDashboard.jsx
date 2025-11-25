import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { io } from 'socket.io-client';
import { Printer, Play, SkipForward, CheckCircle, XCircle, Clock, Trash2, FileText, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import API_URL from '../config';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [jobs, setJobs] = useState([]);
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            const { data } = await axios.get(`${API_URL}/api/jobs/admin/all`, config);
            setJobs(data);
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    };

    const fetchPrinters = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/printers`);
            setPrinters(data);
        } catch (error) {
            console.error('Failed to fetch printers');
        }
    };

    useEffect(() => {
        fetchJobs();
        fetchPrinters();

        const socket = io(API_URL);

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        socket.on('jobUpdated', (data) => {
            console.log('📨 Received jobUpdated event, type:', data.type);
            if (data.type === 'create') {
                setJobs((prev) => [data.job, ...prev]);
            } else if (data.type === 'update') {
                setJobs((prev) => prev.map((job) => (job._id === data.job._id ? data.job : job)));
            } else if (data.type === 'batchUpdate') {
                console.log('=== FRONTEND: Received batchUpdate ===');
                console.log('BatchId:', data.batchId);
                console.log('Updated jobs:', data.jobs);
                console.log('First job createdAt:', data.jobs[0]?.createdAt);
                // Update all jobs in the batch with the new data
                setJobs((prev) => prev.map((job) => {
                    const updatedJob = data.jobs.find(j => j._id === job._id);
                    if (updatedJob) {
                        console.log(`Updating job ${job._id}: old createdAt=${job.createdAt}, new createdAt=${updatedJob.createdAt}`);
                    }
                    return updatedJob || job;
                }));
            } else if (data.type === 'delete') {
                setJobs((prev) => prev.filter((job) => job._id !== data.jobId));
            }
        });

        return () => socket.disconnect();
    }, [user]);

    const updateStatus = async (jobId, status) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await axios.put(`${API_URL}/api/jobs/${jobId}/status`, { status }, config);
            toast.success(`Job marked as ${status}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const markAsPaid = async (jobId) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await axios.put(`${API_URL}/api/jobs/${jobId}/pay`, {}, config);
            toast.success('Job marked as paid');
        } catch (error) {
            toast.error('Failed to mark as paid');
        }
    };

    const payBatch = async (batchId, userName) => {
        if (!window.confirm(`Mark all pending jobs in this batch for ${userName} as paid?`)) return;

        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            console.log('Paying batch:', batchId);
            const response = await axios.put(`${API_URL}/api/jobs/batch/${batchId}/pay`, {}, config);
            console.log('Batch payment response:', response.data);
            toast.success(`Batch for ${userName} marked as paid`);
        } catch (error) {
            console.error('Batch payment error:', error);
            toast.error(error.response?.data?.message || 'Failed to start batch printing');
        }
    };

    const markAsCollected = async (jobId) => {
        if (!window.confirm('Confirm that the user has collected this document?')) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await axios.put(`${API_URL}/api/jobs/${jobId}/collected`, {}, config);
            toast.success('Job marked as collected');
        } catch (error) {
            toast.error('Failed to mark as collected');
        }
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await axios.delete(`${API_URL}/api/jobs/${jobId}`, config);
            toast.success('Job deleted');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete job');
        }
    };

    const startBatchPrinting = async (batchId, userName) => {
        console.log('startBatchPrinting clicked', { batchId, userName });
        if (!window.confirm(`Start printing all documents in this batch for ${userName}?`)) return;
        try {
            console.log(`Sending PUT request to ${API_URL}/api/jobs/batch/${batchId}/start-printing`);
            const response = await axios.put(`${API_URL}/api/jobs/batch/${batchId}/start-printing`, {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            console.log('Batch printing response:', response.data);
            toast.success('Batch printing started!');
        } catch (error) {
            console.error('Batch printing error:', error);
            toast.error('Failed to start batch printing');
        }
    };

    const deleteBatch = async (batchId, userName) => {
        if (!window.confirm(`Delete ALL documents in this batch for ${userName}? This cannot be undone!`)) return;
        try {
            console.log('Deleting batch:', batchId);
            const response = await axios.delete(`${API_URL}/api/jobs/batch/${batchId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            console.log('Delete response:', response.data);
            toast.success('Batch deleted successfully');
            // Manually remove jobs from state to update UI immediately
            setJobs(prevJobs => prevJobs.filter(j => j.batchId !== batchId));
        } catch (error) {
            console.error('Delete batch error:', error);
            console.error('Error response:', error.response?.data);
            toast.error(error.response?.data?.message || 'Failed to delete batch');
        }
    };

    const skipBatch = async (batchId, userName) => {
        if (!window.confirm(`Move ${userName}'s batch to after position 5 in the queue?`)) return;
        try {
            const response = await axios.put(`${API_URL}/api/jobs/batch/${batchId}/skip`, {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            toast.success('Batch skipped successfully');
            // Socket event will update the jobs automatically
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to skip batch');
        }
    };

    const changePrinter = async (jobId, printerId) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await axios.put(`${API_URL}/api/jobs/${jobId}/change-printer`, { printerId }, config);
            toast.success('Printer updated');
        } catch (error) {
            toast.error('Failed to update printer');
        }
    };

    // Check if a specific printer is currently printing
    const isPrinterBusy = (printerId) => {
        if (!printerId) return false;
        // Check if any job assigned to this printer is currently printing
        return jobs.some(job =>
            job.status === 'printing' &&
            (job.printer?._id === printerId || job.printer === printerId)
        );
    };

    // Check if a job is the next one in line for its printer
    const isNextInQueue = (job) => {
        const printerId = job.printer?._id || job.printer;
        if (!printerId) return true; // Should not happen if printer assigned

        // Get all pending jobs for this printer
        const pendingJobs = jobs.filter(j =>
            j.status === 'pending' &&
            (j.printer?._id === printerId || j.printer === printerId)
        );

        // Sort by creation time (oldest first)
        pendingJobs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        // Return true if this job is the first one
        return pendingJobs.length > 0 && pendingJobs[0]._id === job._id;
    };

    const [activeTab, setActiveTab] = useState('active');
    const [expandedBatches, setExpandedBatches] = useState({});

    // Filter jobs based on status
    const activeJobs = jobs.filter(job => ['pending', 'printing'].includes(job.status));
    const historyJobs = jobs.filter(job => ['completed', 'collected', 'skipped'].includes(job.status));

    // Group jobs by batch for display
    const groupJobsByBatch = (jobsList) => {
        const batches = {};
        const individualJobs = [];

        jobsList.forEach(job => {
            if (job.batchId) {
                if (!batches[job.batchId]) {
                    batches[job.batchId] = {
                        batchId: job.batchId,
                        user: job.user || { name: 'Unknown User', _id: 'unknown' },
                        jobs: [],
                        totalPages: 0,
                        totalCost: 0,
                        allPaid: true,
                        allConfirmed: true,
                        status: job.status,
                        skipCount: job.skipCount || 0,
                        createdAt: job.createdAt,
                    };
                }
                batches[job.batchId].jobs.push(job);
                batches[job.batchId].totalPages += job.printDetails?.pages || 0;
                batches[job.batchId].totalCost += job.printDetails?.cost || 0;
                if (!job.isPaid) batches[job.batchId].allPaid = false;
                if (!job.confirmedPresence) batches[job.batchId].allConfirmed = false;
                if (job.status === 'printing') batches[job.batchId].status = 'printing';
            } else {
                individualJobs.push(job);
            }
        });

        // Set sortTime for each batch based on queueTimestamp (if exists) or createdAt
        // This ensures the batch order updates when jobs are skipped
        Object.values(batches).forEach(batch => {
            batch.sortTime = batch.jobs.reduce((min, job) => {
                const jobSortTime = job.queueTimestamp ? new Date(job.queueTimestamp) : new Date(job.createdAt);
                return jobSortTime < min ? jobSortTime : min;
            }, batch.jobs[0].queueTimestamp ? new Date(batch.jobs[0].queueTimestamp) : new Date(batch.jobs[0].createdAt));
        });

        const sortedBatches = Object.values(batches).sort((a, b) => a.sortTime - b.sortTime);

        console.log('=== BATCH SORTING DEBUG ===');
        sortedBatches.forEach((batch, index) => {
            const firstJob = batch.jobs[0];
            console.log(`Position ${index + 1}: BatchID ${batch.batchId}, User: ${batch.user?.name || 'Unknown'}, queueTimestamp: ${firstJob.queueTimestamp || 'null'}, createdAt: ${batch.jobs[0].createdAt}, skipCount: ${batch.skipCount}`);
        });
        console.log('===========================');

        return {
            batches: sortedBatches,
            individualJobs,
        };
    };

    const { batches: activeBatches, individualJobs: activeIndividualJobs } = groupJobsByBatch(activeJobs);
    const { batches: historyBatches, individualJobs: historyIndividualJobs } = groupJobsByBatch(historyJobs);

    const displayedBatches = activeTab === 'active' ? activeBatches : historyBatches;
    const displayedIndividualJobs = activeTab === 'active' ? activeIndividualJobs : historyIndividualJobs;

    // Toggle batch expansion
    const toggleBatch = (batchId) => {
        setExpandedBatches(prev => ({
            ...prev,
            [batchId]: !prev[batchId]
        }));
    };

    // Group unpaid jobs by batchId for payment (only from active jobs)
    const batchTotals = activeJobs.reduce((acc, job) => {
        if (job.status === 'pending' && !job.isPaid) {
            const userId = job.user?._id || job.user || 'unknown';
            const userName = job.user?.name || 'Unknown User';
            const batchKey = job.batchId || userId;

            if (!acc[batchKey]) {
                acc[batchKey] = {
                    name: userName,
                    total: 0,
                    count: 0,
                    confirmed: false,
                    batchId: job.batchId,
                    userId: userId,
                    timestamp: job.createdAt
                };
            }
            acc[batchKey].total += (job.printDetails?.cost || 0);
            acc[batchKey].count += 1;
            if (job.confirmedPresence) acc[batchKey].confirmed = true;
        }
        return acc;
    }, {});

    // Group paid jobs by batchId for printing (only from active jobs)
    const paidBatches = activeJobs.reduce((acc, job) => {
        if (job.status === 'pending' && job.isPaid && job.batchId) {
            if (!acc[job.batchId]) {
                const userName = job.user?.name || 'Unknown User';
                acc[job.batchId] = {
                    name: userName,
                    count: 0,
                    batchId: job.batchId,
                    timestamp: job.createdAt,
                    skipCount: job.skipCount || 0
                };
            }
            acc[job.batchId].count += 1;
        }
        return acc;
    }, {});

    // Create batch order mapping (assign numbers to batches based on creation time)
    // Use the sorted batches from groupJobsByBatch
    const batchOrderMap = {};
    // Include ALL pending batches (paid and unpaid) in the order map
    const pendingBatches = displayedBatches.filter(batch => batch.status === 'pending');

    console.log('=== BATCH ORDER CALCULATION ===');
    console.log('Total displayed batches:', displayedBatches.length);
    console.log('Pending batches:', pendingBatches.length);
    pendingBatches.forEach((batch, index) => {
        console.log(`Order #${index + 1}: ${batch.user?.name || 'Unknown'}, batchId: ${batch.batchId}, createdAt: ${batch.createdAt}`);
        batchOrderMap[batch.batchId] = index + 1;
    });
    console.log('=== END BATCH ORDER ===');

    const displayedJobs = activeTab === 'active' ? activeJobs : historyJobs;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-8 animate-slide-up">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
                    <p className="text-slate-500 mt-1">Manage print jobs and payments</p>
                </div>
                <div className="glass-panel px-4 py-2 flex items-center text-indigo-600 font-medium">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                    <Printer className="h-5 w-5 mr-2" />
                    Printer Status: Online
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-8 border-b border-gray-200">
                <button
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'active' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('active')}
                >
                    Active Jobs
                </button>
                <button
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </button>
            </div>

            <div className="glass-panel overflow-hidden animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200/50">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Batch</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Details</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Presence</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/50">
                            {/* Display Batches */}
                            {displayedBatches.map((batch) => {
                                const isExpanded = expandedBatches[batch.batchId];
                                const batchNumber = batchOrderMap[batch.batchId];

                                return (
                                    <React.Fragment key={batch.batchId}>
                                        {/* Batch Summary Row */}
                                        <tr
                                            className="hover:bg-white/30 transition-colors cursor-pointer bg-purple-50/30"
                                            onClick={() => toggleBatch(batch.batchId)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800 border border-purple-200">
                                                        Order #{batchNumber || '-'}
                                                    </span>
                                                    <span className="ml-2 text-xs text-slate-500">
                                                        {isExpanded ? '▼' : '▶'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-800">
                                                    {batch.jobs.length} document(s)
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {batch.totalPages} pages • ${batch.totalCost.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-800 font-medium">{batch.user?.name || 'Unknown'}</div>
                                                <div className="text-xs text-slate-500">{new Date(batch.createdAt).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border 
                                                    ${batch.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                                        batch.status === 'printing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                            'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                                    {batch.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {batch.allPaid ? (
                                                    <span className="text-green-600 font-medium flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Paid</span>
                                                ) : (
                                                    <span className="text-amber-600 font-medium flex items-center"><Clock className="w-4 h-4 mr-1" /> Pending</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {batch.allConfirmed ? (
                                                    <span className="text-green-600 font-medium flex items-center"><MapPin className="w-3 h-3 mr-1" /> Confirmed</span>
                                                ) : (
                                                    <span className="text-slate-400">Not confirmed</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                {batch.status === 'pending' && (
                                                    <div className="flex justify-end space-x-2">
                                                        {!batch.allPaid ? (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        skipBatch(batch.batchId, batch.user?.name || 'User');
                                                                    }}
                                                                    disabled={batch.skipCount >= 2}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${batch.skipCount >= 2
                                                                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
                                                                        : 'text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-600 border border-orange-200'
                                                                        }`}
                                                                    title={batch.skipCount >= 2 ? "Max skips reached" : "Skip to back of queue"}
                                                                >
                                                                    {batch.skipCount >= 2 ? 'Max Skips' : `Skip (${batch.skipCount || 0}/2)`}
                                                                </button>
                                                                {batch.allConfirmed && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            payBatch(batch.batchId, batch.user?.name || 'User');
                                                                        }}
                                                                        disabled={!batch.allConfirmed}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${batch.allConfirmed
                                                                            ? 'text-green-600 hover:text-white bg-green-50 hover:bg-green-600 border border-green-200'
                                                                            : 'text-slate-400 bg-slate-100 cursor-not-allowed border border-slate-200'}`}
                                                                        title={batch.allConfirmed ? "Pay Batch" : "User must confirm presence"}
                                                                    >
                                                                        Pay Batch
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startBatchPrinting(batch.batchId, batch.user?.name || 'User');
                                                                }}
                                                                disabled={
                                                                    jobs.some(j => j.batchId === batch.batchId && (
                                                                        isPrinterBusy(j.printer?._id || j.printer) ||
                                                                        !isNextInQueue(j)
                                                                    ))
                                                                }
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${jobs.some(j => j.batchId === batch.batchId && (
                                                                    isPrinterBusy(j.printer?._id || j.printer) ||
                                                                    !isNextInQueue(j)
                                                                ))
                                                                    ? 'text-slate-400 bg-slate-100 cursor-not-allowed border border-slate-200'
                                                                    : 'text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200'}`}
                                                                title={
                                                                    jobs.some(j => j.batchId === batch.batchId && isPrinterBusy(j.printer?._id || j.printer))
                                                                        ? "Printer is busy"
                                                                        : jobs.some(j => j.batchId === batch.batchId && !isNextInQueue(j))
                                                                            ? "Waiting for previous jobs on this printer"
                                                                            : batch.skipCount >= 2
                                                                                ? "Max skips reached - cannot print"
                                                                                : "Print Batch"
                                                                }
                                                            >
                                                                Print Batch
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteBatch(batch.batchId, batch.user?.name || 'User');
                                                            }}
                                                            className="p-2 rounded-full text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 transition-all"
                                                            title="Delete Entire Batch"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>

                                        {/* Expanded Individual Jobs */}
                                        {isExpanded && batch.jobs.map((job) => (
                                            <tr key={job._id} className="hover:bg-white/20 transition-colors bg-slate-50/20">
                                                <td className="px-6 py-3 pl-16 whitespace-nowrap">
                                                    <span className="text-xs text-gray-400">└─</span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-xs font-medium text-slate-800 truncate max-w-[200px]">{job.fileUrl.split('/').pop()}</div>
                                                            <div className="text-xs text-slate-500">
                                                                {job.printDetails.pages} pgs • {job.printDetails.color} • {job.printDetails.sides}
                                                            </div>
                                                            {job.status === 'pending' && (
                                                                <div className="mt-1">
                                                                    <select
                                                                        value={job.printer?._id || job.printer || ''}
                                                                        onChange={(e) => changePrinter(job._id, e.target.value)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="text-xs border-gray-200 rounded p-0.5 max-w-[150px] truncate bg-white/50 hover:bg-white focus:ring-1 focus:ring-indigo-500"
                                                                    >
                                                                        {printers.map(p => (
                                                                            <option key={p._id} value={p._id}>
                                                                                {p.name} {p.status !== 'online' ? '(Offline)' : ''}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <div className="text-xs text-slate-500">${job.printDetails.cost}</div>
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border 
                                                        ${job.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                                            job.status === 'printing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                                job.status === 'skipped' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                    'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                                        {job.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-500">
                                                    {job.isPaid ? (
                                                        <span className="text-green-600 font-medium flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Paid</span>
                                                    ) : (
                                                        <span className="text-amber-600 font-medium flex items-center"><Clock className="w-3 h-3 mr-1" /> Pending</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-500">
                                                    {job.confirmedPresence ? (
                                                        <span className="text-green-600 font-medium flex items-center"><MapPin className="w-3 h-3 mr-1" /> Yes</span>
                                                    ) : (
                                                        <span className="text-slate-400">No</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-right text-xs font-medium">
                                                    <button
                                                        onClick={() => handleDelete(job._id)}
                                                        className="p-1.5 rounded-full text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 transition-all"
                                                        title="Delete Job"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}

                            {/* Display Individual Jobs (no batch) */}
                            {displayedIndividualJobs.map((job) => (
                                <tr key={job._id} className="hover:bg-white/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {job.batchId ? (
                                            <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800 border border-purple-200">
                                                Order #{batchOrderMap[job.batchId]}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{job.fileUrl.split('/').pop()}</div>
                                                <div className="text-xs text-slate-500">
                                                    {job.printDetails.pages} pgs • {job.printDetails.color} • {job.printDetails.sides}
                                                </div>
                                                {job.status === 'pending' && (
                                                    <div className="mt-1">
                                                        <select
                                                            value={job.printer?._id || job.printer || ''}
                                                            onChange={(e) => changePrinter(job._id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs border-gray-200 rounded p-0.5 max-w-[150px] truncate bg-white/50 hover:bg-white focus:ring-1 focus:ring-indigo-500"
                                                        >
                                                            {printers.map(p => (
                                                                <option key={p._id} value={p._id}>
                                                                    {p.name} {p.status !== 'online' ? '(Offline)' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-800 font-medium">{job.user?.name || 'Unknown'}</div>
                                        <div className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border 
                                            ${job.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                                job.status === 'printing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                    job.status === 'skipped' ? 'bg-red-100 text-red-800 border-red-200' :
                                                        'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {job.isPaid ? (
                                            <span className="text-green-600 font-medium flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Paid</span>
                                        ) : (
                                            <span className="text-amber-600 font-medium flex items-center"><Clock className="w-4 h-4 mr-1" /> Pending</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {job.confirmedPresence ? (
                                            <span className="text-green-600 font-medium flex items-center"><MapPin className="w-3 h-3 mr-1" /> Confirmed</span>
                                        ) : (
                                            <span className="text-slate-400">Not confirmed</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {job.status === 'pending' && (
                                            <div className="flex justify-end space-x-2">
                                                {!job.isPaid && job.batchId ? (
                                                    <button
                                                        onClick={() => payBatch(job.batchId, job.user?.name || 'User')}
                                                        disabled={!job.confirmedPresence}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${job.confirmedPresence
                                                            ? 'text-green-600 hover:text-white bg-green-50 hover:bg-green-600 border border-green-200'
                                                            : 'text-slate-400 bg-slate-100 cursor-not-allowed border border-slate-200'}`}
                                                        title={job.confirmedPresence ? "Pay Batch" : "User must confirm presence"}
                                                    >
                                                        Pay Batch
                                                    </button>
                                                ) : !job.isPaid ? (
                                                    <button
                                                        onClick={() => markAsPaid(job._id)}
                                                        disabled={!job.confirmedPresence}
                                                        className={`p-2 rounded-full transition-all ${job.confirmedPresence
                                                            ? 'text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100'
                                                            : 'text-slate-300 bg-slate-100 cursor-not-allowed'}`}
                                                        title={job.confirmedPresence ? "Mark as Paid" : "User must be present to pay"}
                                                    >
                                                        <span className="font-bold text-xs">$</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => updateStatus(job._id, 'printing')}
                                                        disabled={
                                                            jobs.some(j => j.status === 'printing') ||
                                                            (job.paymentMethod === 'counter' && !job.confirmedPresence)
                                                        }
                                                        className={`p-2 rounded-full transition-all ${jobs.some(j => j.status === 'printing') ||
                                                            (job.paymentMethod === 'counter' && !job.confirmedPresence)
                                                            ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                                                            : 'text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100'
                                                            }`}
                                                        title={
                                                            jobs.some(j => j.status === 'printing')
                                                                ? "Printer is busy"
                                                                : (job.paymentMethod === 'counter' && !job.confirmedPresence)
                                                                    ? "Counter payment requires user presence"
                                                                    : "Start Printing"
                                                        }
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => updateStatus(job._id, 'skipped')}
                                                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-all"
                                                    title="Skip"
                                                >
                                                    <SkipForward className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                        {job.status === 'printing' && (
                                            <button
                                                onClick={() => updateStatus(job._id, 'completed')}
                                                className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-2 rounded-full transition-all"
                                                title="Mark Complete"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {job.status === 'completed' && (
                                            <button
                                                onClick={() => markAsCollected(job._id)}
                                                className="p-2 rounded-full text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 transition-all"
                                                title="Mark as Collected"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(job._id)}
                                            className="p-2 rounded-full text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 ml-2 transition-all"
                                            title="Delete Job"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default AdminDashboard;
