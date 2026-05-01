if (window.confirm('Are you sure you want to delete this printer?')) {
    try {
        await axios.delete(`http://localhost:5000/api/printers/${id}`);
        toast.success('Printer deleted');
        // fetchPrinters(); // No need to fetch, socket will update
    } catch (error) {
        toast.error('Failed to delete printer');
    }
}
    };

return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Printers</h1>
            {user && user.isAdmin && (
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Printer
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {printers.map((printer) => (
                <div key={printer._id} className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">{printer.name}</h3>
                            <p className="text-sm text-gray-500">{printer.location}</p>
                        </div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${printer.status === 'online' ? 'bg-green-100 text-green-800' :
                            printer.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {printer.status}
                        </span>
                    </div>
                    {user && user.isAdmin && (
                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                onClick={() => handleDeletePrinter(printer._id)}
                                className="text-red-600 hover:text-red-900"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>

        {showAddModal && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h2 className="text-xl font-bold mb-4">Add New Printer</h2>
                    <form onSubmit={handleAddPrinter}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={newPrinter.name}
                                    onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Location</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={newPrinter.location}
                                    onChange={(e) => setNewPrinter({ ...newPrinter, location: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={newPrinter.status}
                                    onChange={(e) => setNewPrinter({ ...newPrinter, status: e.target.value })}
                                >
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                    <option value="busy">Busy</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Add Printer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
);
};

export default Printers;
