import { X, Download, Printer, CheckCircle } from 'lucide-react';

const BillModal = ({ job, onClose }) => {
    if (!job) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="bg-primary p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Printer className="w-6 h-6" />
                            Print Receipt
                        </h2>
                        <p className="text-primary-foreground/80 text-sm mt-1">Thank you for using PrintQueue!</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Payment Successful</h3>
                        <p className="text-gray-500 text-sm">{new Date(job.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="border-t border-b border-gray-100 py-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Job ID</span>
                            <span className="font-mono font-medium text-gray-700">#{job._id.slice(-6).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Document</span>
                            <span className="font-medium text-gray-700 truncate max-w-[200px]">{job.fileUrl.split('/').pop()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Pages</span>
                            <span className="font-medium text-gray-700">{job.printDetails.pages}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Type</span>
                            <span className="font-medium text-gray-700 capitalize">
                                {job.printDetails.color === 'bw' ? 'Black & White' : 'Color'} • {job.printDetails.sides}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-lg font-bold text-gray-800">Total Paid</span>
                        <span className="text-2xl font-bold text-primary">${job.printDetails.cost}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Save PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BillModal;
