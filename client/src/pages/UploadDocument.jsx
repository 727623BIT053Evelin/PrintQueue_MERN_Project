import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle, X, Plus, Printer, DollarSign, CreditCard, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import API_URL from '../config';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - using unpkg CDN with the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs';

const UploadDocument = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [files, setFiles] = useState([]);
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(''); // 'online' or 'counter'

    useEffect(() => {
        const fetchPrinters = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/printers`);
                setPrinters(data);
                // Safely set the first printer if available
                if (data && Array.isArray(data) && data.length > 0 && data[0]?._id) {
                    setSelectedPrinter(data[0]._id);
                }
            } catch (error) {
                console.error('Failed to fetch printers:', error);
                toast.error('Failed to fetch printers');
            }
        };
        fetchPrinters();
    }, []);

    // Helper function to detect PPTX slide count
    const detectPPTXSlides = async (file) => {
        try {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(file);

            // Count actual slide files in ppt/slides/ directory
            // This  avoids counting hidden slides or other non-visible elements
            let slideCount = 0;
            zip.folder('ppt/slides').forEach((relativePath, file) => {
                // Only count files that match slide pattern (slide1.xml, slide2.xml, etc.)
                if (/^slide\d+\.xml$/.test(relativePath)) {
                    slideCount++;
                }
            });

            return slideCount > 0 ? slideCount : 1;
        } catch (error) {
            console.error('Error detecting PPTX slides:', error);
            return 1;
        }
    };

    // Helper function to estimate DOCX page count
    const estimateDOCXPages = async (file) => {
        try {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(file);

            // Method 1: Try to get page count from document properties (most accurate)
            try {
                const appXml = await zip.file('docProps/app.xml')?.async('text');
                if (appXml) {
                    // Look for <Pages>44</Pages> tag in the properties
                    const pagesMatch = appXml.match(/<Pages>(\d+)<\/Pages>/);
                    if (pagesMatch && pagesMatch[1]) {
                        const pageCount = parseInt(pagesMatch[1], 10);
                        if (pageCount > 0) {
                            console.log('DOCX page count from metadata:', pageCount);
                            return pageCount;
                        }
                    }
                }
            } catch (error) {
                console.warn('Could not read app.xml metadata:', error);
            }

            // Method 2: Count explicit page breaks in the document
            const documentXml = await zip.file('word/document.xml')?.async('text');

            if (!documentXml) {
                console.warn('Could not find document.xml in DOCX file');
                return 1;
            }

            // Count explicit page breaks: <w:br w:type="page"/>
            const pageBreaks = (documentXml.match(/<w:br\s+w:type="page"\s*\/>/g) || []).length;
            if (pageBreaks > 0) {
                console.log('DOCX pages from breaks:', pageBreaks + 1);
                return pageBreaks + 1; // Number of breaks + 1 = number of pages
            }

            // Method 3: Estimate from word count (fallback)
            const textContent = documentXml.replace(/<[^>]*>/g, ' ').trim();
            const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

            // Use 300 words per page for better accuracy (more conservative)
            const wordsPerPage = 300;
            const estimatedPages = Math.max(1, Math.ceil(wordCount / wordsPerPage));

            console.log('DOCX pages estimated from word count:', estimatedPages, '(', wordCount, 'words)');
            return estimatedPages;
        } catch (error) {
            console.error('Error estimating DOCX pages:', error);
            return 1;
        }
    };

    // Function to detect page count from various file formats
    const detectPageCount = async (file) => {
        try {
            const fileType = file.type;
            const fileName = file.name.toLowerCase();

            // PDF Detection
            if (fileType === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                return { count: pdf.numPages, type: 'PDF' };
            }

            // PPTX Detection (PowerPoint)
            if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                || fileName.endsWith('.pptx')) {
                const slideCount = await detectPPTXSlides(file);
                return { count: slideCount, type: 'PPTX' };
            }

            // DOCX Detection (Word)
            if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                || fileName.endsWith('.docx')) {
                const pageCount = await estimateDOCXPages(file);
                return { count: pageCount, type: 'DOCX' };
            }

            // Image Detection
            if (fileType.startsWith('image/')) {
                return { count: 1, type: 'Image' };
            }

            // Default fallback for other file types
            return { count: 1, type: 'Other' };
        } catch (error) {
            console.error('Error detecting page count:', error);
            toast.warning(`Could not detect pages for ${file.name}. Please enter manually.`);
            return { count: 1, type: 'Error' };
        }
    };

    const handleFileChange = async (e) => {
        const selectedFiles = Array.from(e.target.files);

        // Show loading toast
        const toastId = toast.info('Detecting page counts...', { autoClose: false });

        // Process files with page detection
        const newFilesPromises = selectedFiles.map(async (file) => {
            const detection = await detectPageCount(file);
            return {
                file,
                id: Math.random().toString(36).substr(2, 9),
                printDetails: {
                    color: 'bw',
                    sides: 'single',
                    copies: 1,
                    pages: detection.count, // Auto-detected page count
                },
                autoDetected: detection.type !== 'Error' && detection.type !== 'Other', // Flag to show if auto-detected
                detectionType: detection.type, // Store the detection type (PDF, PPTX, DOCX, Image)
            };
        });

        const newFiles = await Promise.all(newFilesPromises);
        setFiles(prev => [...prev, ...newFiles]);

        // Dismiss loading toast and show success
        toast.dismiss(toastId);
        const detectedCount = newFiles.filter(f => f.autoDetected).length;
        if (detectedCount > 0) {
            toast.success(`Detected page counts for ${detectedCount} file(s)!`);
        }
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const updateFileDetails = (id, field, value) => {
        setFiles(prev => prev.map(f => {
            if (f.id === id) {
                return {
                    ...f,
                    printDetails: {
                        ...f.printDetails,
                        [field]: value
                    }
                };
            }
            return f;
        }));
    };

    const calculateCost = (details) => {
        let cost = details.pages * 0.10; // Base cost per page
        if (details.color === 'color') cost *= 3; // Color is 3x
        if (details.sides === 'double') cost *= 0.8; // 20% discount for double sided
        return (cost * details.copies).toFixed(2);
    };

    const calculateTotalCost = () => {
        return files.reduce((acc, curr) => acc + parseFloat(calculateCost(curr.printDetails)), 0).toFixed(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) {
            toast.error('Please upload at least one document');
            return;
        }
        if (!selectedPrinter) {
            toast.error('Please select a printer');
            return;
        }
        if (!paymentMethod) {
            toast.error('Please select a payment method');
            return;
        }

        setUploading(true);

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`,
                },
            };

            // Generate a unique batch ID for this submission
            const batchId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

            // If payment method is online, redirect to Stripe checkout
            if (paymentMethod === 'online') {
                // Create a checkout session on the backend
                const jobsData = files.map(fileObj => ({
                    printerId: selectedPrinter,  // Add the printer ID
                    fileUrl: `https://storage.example.com/${fileObj.file.name}`,
                    printDetails: {
                        color: fileObj.printDetails.color,
                        sides: fileObj.printDetails.sides,
                        copies: Number(fileObj.printDetails.copies),
                        pages: Number(fileObj.printDetails.pages),
                        cost: Number(calculateCost(fileObj.printDetails))
                    },
                    paymentMethod: 'online',
                    batchId: batchId
                }));

                const totalAmount = calculateTotalCost();

                // Call backend to create Stripe checkout session
                const { data } = await axios.post(`${API_URL}/api/payments/create-checkout-session`, {
                    jobs: jobsData,
                    amount: totalAmount,
                    batchId: batchId
                }, config);

                // Redirect to Stripe checkout
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error('No checkout URL received');
                }
                return;
            }

            // For counter payment, submit jobs directly
            for (const fileObj of files) {
                const fakeUrl = `https://storage.example.com/${fileObj.file.name}`;

                const jobData = {
                    printerId: selectedPrinter,
                    fileUrl: fakeUrl,
                    printDetails: {
                        color: fileObj.printDetails.color,
                        sides: fileObj.printDetails.sides,
                        copies: Number(fileObj.printDetails.copies),
                        pages: Number(fileObj.printDetails.pages),
                        cost: Number(calculateCost(fileObj.printDetails))
                    },
                    paymentMethod: 'counter',
                    batchId: batchId
                };

                await axios.post(`${API_URL}/api/jobs`, jobData, config);
            }

            setUploading(false);
            toast.success('All documents submitted successfully!');
            navigate('/my-documents');
        } catch (error) {
            setUploading(false);
            toast.error(error.response?.data?.message || 'Failed to submit documents');
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="text-center mb-10 animate-fade-in">
                <h1 className="text-3xl font-bold text-text">Upload Documents</h1>
                <p className="text-text-muted mt-2">Upload your files and configure print settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Upload & Printer Selection */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Printer Selection */}
                    <div className="glass-panel p-6 animate-slide-up">
                        <label className="block text-sm font-medium text-text mb-2 flex items-center">
                            <Printer className="w-4 h-4 mr-2 text-primary" />
                            Select Printer
                        </label>
                        <select
                            value={selectedPrinter}
                            onChange={(e) => setSelectedPrinter(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="" disabled>Select a printer</option>
                            {printers.map((printer) => (
                                <option key={printer._id} value={printer._id}>
                                    {printer.name} ({printer.location}) - {printer.status === 'online' ? 'Available' : 'Offline'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* File Upload Area */}
                    <div className="glass-panel p-8 border-2 border-dashed border-primary/20 hover:border-primary/50 transition-colors text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <input
                            type="file"
                            id="file-upload"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                                <Upload className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-text">Click to upload documents</h3>
                            <p className="text-sm text-text-muted mt-1">PDF, DOCX, PPTX, Images</p>
                        </label>
                    </div>

                    {/* File List */}
                    <div className="space-y-4">
                        {files.map((fileObj, index) => (
                            <div key={fileObj.id} className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${0.2 + (index * 0.1)}s` }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center overflow-hidden">
                                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mr-3 flex-shrink-0">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="truncate">
                                            <p className="font-medium text-text truncate">{fileObj.file.name}</p>
                                            <p className="text-xs text-text-muted">{(fileObj.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFile(fileObj.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-text-muted mb-1">Color</label>
                                        <select
                                            value={fileObj.printDetails.color}
                                            onChange={(e) => updateFileDetails(fileObj.id, 'color', e.target.value)}
                                            className="w-full text-sm border-gray-200 rounded-md focus:ring-primary focus:border-primary"
                                        >
                                            <option value="bw">Black & White</option>
                                            <option value="color">Color</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-text-muted mb-1">Sides</label>
                                        <select
                                            value={fileObj.printDetails.sides}
                                            onChange={(e) => updateFileDetails(fileObj.id, 'sides', e.target.value)}
                                            className="w-full text-sm border-gray-200 rounded-md focus:ring-primary focus:border-primary"
                                        >
                                            <option value="single">Single Sided</option>
                                            <option value="double">Double Sided</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-text-muted mb-1">
                                            Pages {fileObj.autoDetected && (
                                                <span className="text-green-600 ml-1">
                                                    ✓ Auto ({fileObj.detectionType})
                                                </span>
                                            )}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={fileObj.printDetails.pages}
                                            onChange={(e) => updateFileDetails(fileObj.id, 'pages', e.target.value)}
                                            className="w-full text-sm border-gray-200 rounded-md focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-text-muted mb-1">Copies</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={fileObj.printDetails.copies}
                                            onChange={(e) => updateFileDetails(fileObj.id, 'copies', e.target.value)}
                                            className="w-full text-sm border-gray-200 rounded-md focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div className="mt-3 text-right">
                                    <span className="text-sm font-medium text-text">Cost: </span>
                                    <span className="text-lg font-bold text-primary">${calculateCost(fileObj.printDetails)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Summary */}
                <div className="lg:col-span-1">
                    <div className="glass-panel p-6 sticky top-24 animate-fade-in">
                        <h3 className="text-lg font-bold text-text mb-4 flex items-center">
                            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                            Order Summary
                        </h3>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-text-muted">Total Documents:</span>
                                <span className="font-medium text-text">{files.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-text-muted">Total Pages:</span>
                                <span className="font-medium text-text">
                                    {files.reduce((acc, f) => acc + (Number(f.printDetails.pages) * Number(f.printDetails.copies)), 0)}
                                </span>
                            </div>
                            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                                <span className="font-bold text-text">Grand Total:</span>
                                <span className="text-2xl font-bold text-primary">${calculateTotalCost()}</span>
                            </div>
                        </div>

                        {/* Payment Method Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-text mb-3">Payment Method</label>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('online')}
                                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${paymentMethod === 'online'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-gray-200 hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <CreditCard className="w-5 h-5 mr-2" />
                                        <span className="font-medium">Pay Online</span>
                                    </div>
                                    {paymentMethod === 'online' && (
                                        <CheckCircle className="w-5 h-5" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('counter')}
                                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${paymentMethod === 'counter'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-gray-200 hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <Wallet className="w-5 h-5 mr-2" />
                                        <span className="font-medium">Pay at Counter</span>
                                    </div>
                                    {paymentMethod === 'counter' && (
                                        <CheckCircle className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={uploading || files.length === 0 || !paymentMethod}
                            className={`w-full btn-primary flex items-center justify-center ${uploading || files.length === 0 || !paymentMethod ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Submit Order
                                </>
                            )}
                        </button>
                        {!paymentMethod && files.length > 0 && (
                            <p className="text-xs text-center text-amber-600 mt-3">
                                Please select a payment method to continue
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadDocument;
