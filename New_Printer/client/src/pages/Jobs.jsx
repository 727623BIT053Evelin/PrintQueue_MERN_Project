
return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Print Jobs</h1>
            <button
                onClick={() => setShowNewJobModal(true)}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                <Upload className="mr-2 h-4 w-4" />
                New Print Job
            </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
                {jobs.map((job) => (
                    <li key={job._id}>
                        <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                    <p className="text-sm font-medium text-blue-600 truncate">{job.fileUrl}</p>
                                </div>
                                <div className="ml-2 flex-shrink-0 flex">
                                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        job.status === 'failed' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {job.status}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                                <div className="sm:flex">
                                    <p className="flex items-center text-sm text-gray-500">
                                        Printer: {job.printer ? job.printer.name : 'Unknown'}
                                    </p>
                                </div>
                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                    <p>
                                        Submitted on {new Date(job.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
                {jobs.length === 0 && (
                    <li className="px-4 py-8 text-center text-gray-500">
                        No print jobs found.
                    </li>
                )}
            </ul>
        </div>

        {showNewJobModal && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h2 className="text-xl font-bold mb-4">Submit New Job</h2>
                    <form onSubmit={handleCreateJob}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Printer</label>
                                <select
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={newJob.printerId}
                                    onChange={(e) => setNewJob({ ...newJob, printerId: e.target.value })}
                                >
                                    <option value="">Select a printer...</option>
                                    {printers.map((printer) => (
                                        <option key={printer._id} value={printer._id}>
                                            {printer.name} ({printer.status})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">File URL (Demo)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="https://example.com/document.pdf"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={newJob.fileUrl}
                                    onChange={(e) => setNewJob({ ...newJob, fileUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setShowNewJobModal(false)}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Submit Job
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
);
};

export default Jobs;
