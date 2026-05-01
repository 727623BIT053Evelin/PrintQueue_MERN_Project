import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Clock, Users, Printer, CheckCircle, AlertCircle, Info, DollarSign, FileText } from 'lucide-react';
import API_URL from '../config';

const QueueStatus = () => {
    const [stats, setStats] = useState({
        peopleAhead: 0,
        userWaitTime: 0,
    });
    const [queueJobs, setQueueJobs] = useState([]);

    const getCurrentUserId = () => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                const parsed = JSON.parse(userInfo);
                return parsed._id || parsed.id || '';
            } catch (e) {
                console.error('Error parsing userInfo:', e);
                return '';
            }
        }
        return '';
    };

    const fetchQueueData = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/jobs/queue`);
            const jobs = response.data;
            setQueueJobs(jobs);

            const currentUserId = getCurrentUserId();

            // DEBUG LOGGING
            console.log('=== QUEUE STATUS DEBUG ===');
            console.log('Current User ID:', currentUserId);
            console.log('Total jobs in queue:', jobs.length);
            console.log('Jobs:', jobs.map(j => ({
                id: j._id?.slice(-4),
                userId: j.user,
                pages: j.printDetails?.pages
            })));

            const userFirstJobIndex = jobs.findIndex((job) => job.user === currentUserId);
            console.log('User first job index:', userFirstJobIndex);

            if (userFirstJobIndex === -1) {
                console.log('User has no jobs in queue - setting stats to 0');
                setStats({
                    peopleAhead: 0,
                    userWaitTime: 0,
                });
                return;
            }

            const jobsAhead = jobs.slice(0, userFirstJobIndex);
            console.log('Jobs ahead:', jobsAhead.length);

            const uniqueUsersAhead = new Set(jobsAhead.map(job => job.user)).size;
            console.log('Unique users ahead:', uniqueUsersAhead);

            const pagesAhead = jobsAhead.reduce((acc, job) => acc + (job.printDetails?.pages || 0), 0);
            const totalWaitSeconds = pagesAhead * 3;
            const userWaitTime = Math.ceil(totalWaitSeconds / 60);

            console.log('Pages ahead:', pagesAhead);
            console.log('User wait time (min):', userWaitTime);
            console.log('=== END DEBUG ===');

            setStats({
                peopleAhead: uniqueUsersAhead,
                userWaitTime,
            });
        } catch (error) {
            console.error('Error fetching queue data:', error);
        }
    };

    useEffect(() => {
        fetchQueueData();
        const socket = io(API_URL);
        socket.on('jobUpdated', () => {
            fetchQueueData();
        });
        return () => socket.disconnect();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-text mb-4">Live Queue Status</h1>
                <p className="text-xl text-muted">Check the current printer status before you arrive.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-full mb-6">
                        <Users className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-5xl font-bold text-text mb-2">{stats.peopleAhead}</h2>
                    <p className="text-muted font-medium">People Ahead of You</p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-full mb-6">
                        <Clock className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-5xl font-bold text-text mb-2">
                        {stats.userWaitTime} <span className="text-2xl text-muted font-normal">min</span>
                    </h2>
                    <p className="text-muted font-medium">Estimated Wait Time for You</p>
                </div>
            </div>

            {/* Queue List */}
            <div className="max-w-4xl mx-auto mb-16">
                <h2 className="text-2xl font-bold text-text mb-6">Current Queue</h2>
                {queueJobs.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="divide-y divide-gray-200">
                            {queueJobs.map((job, index) => (
                                <div key={job._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                                            {job.positionInQueue || index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-text">Print Job #{job._id.slice(-4)}</p>
                                            <p className="text-sm text-muted">
                                                {job.printDetails?.pages || 1} pages • {job.status}
                                            </p>
                                            {job.estimatedWaitTime !== undefined && job.status === 'pending' && (
                                                <p className="text-xs text-blue-600 font-medium mt-1">
                                                    ⏱️ Est. wait: {Math.floor(job.estimatedWaitTime / 60)} min {job.estimatedWaitTime % 60} sec
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${job.status === 'printing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}
                                    >
                                        {job.status === 'printing' ? 'Printing' : 'Waiting'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-text-muted">The queue is currently empty.</p>
                    </div>
                )}
            </div>

            <div className="max-w-4xl mx-auto">
                <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-8 mb-8">
                    <div className="flex items-start">
                        <Info className="h-6 w-6 text-yellow-600 mr-4 mt-1" />
                        <div>
                            <h3 className="text-lg font-bold text-yellow-800 mb-2">What to know before printing</h3>
                            <ul className="space-y-2 text-yellow-700">
                                <li>• You must be physically present to collect your print unless paid online</li>
                                <li>• You'll need to confirm your presence when your turn comes</li>
                                <li>• If you don't confirm within 5 minutes, your print will be skipped</li>
                                <li>• Payment can be made in person or online</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-bold text-text flex items-center">
                            <DollarSign className="h-5 w-5 text-primary mr-2" />
                            Pricing Information
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-medium text-muted uppercase tracking-wider text-sm">Black & White</h4>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-text">Single-sided</span>
                                    <span className="font-bold text-text">$0.50<span className="text-xs text-muted font-normal">/page</span></span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-text">Double-sided</span>
                                    <span className="font-bold text-text">$0.75<span className="text-xs text-muted font-normal">/page</span></span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-medium text-muted uppercase tracking-wider text-sm">Color</h4>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-text">Single-sided</span>
                                    <span className="font-bold text-text">$1.50<span className="text-xs text-muted font-normal">/page</span></span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-text">Double-sided</span>
                                    <span className="font-bold text-text">$2.00<span className="text-xs text-muted font-normal">/page</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QueueStatus;
