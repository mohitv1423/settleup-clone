import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Upload, X, Check, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { Group } from '../types';

interface SmartParserModalProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  onParsed: (parsedData: {
    title: string;
    amount: number;
    category: string;
    payerName?: string;
    splitParticipants?: string[];
  }) => void;
}

export default function SmartParserModal({ group, isOpen, onClose, onParsed }: SmartParserModalProps) {
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, or WebP).');
      return;
    }
    setFile(selectedFile);
    setError(null);

    // Create a local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runScanningSimulation = async (base64Image?: string) => {
    setScanning(true);
    setError(null);
    
    // Detailed micro-animations for the user
    const steps = [
      'Sending details to Gemini...',
      'Analyzing text descriptors & merchant details...',
      'Matching payer and splitting participants against group members...'
    ];

    let currentStep = 0;
    setScanStep(steps[0]);

    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setScanStep(steps[currentStep]);
      }
    }, 1500);

    try {
      // Create request payload
      const payload: { text?: string; image?: string; mimeType?: string } = {};
      if (inputText.trim()) {
        payload.text = inputText.trim();
      }
      if (base64Image) {
        payload.image = base64Image.split(',')[1]; // Strip data URL prefix
        payload.mimeType = file?.type || 'image/jpeg';
      }

      const res = await fetch(`/api/groups/${group.id}/parse-expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to scan receipt with AI.');
      }

      const parsedResult = await res.json();
      
      // Complete!
      onParsed({
        title: parsedResult.title,
        amount: parsedResult.amount,
        category: parsedResult.category,
        payerName: parsedResult.payerName,
        splitParticipants: parsedResult.splitParticipants
      });
      onClose();
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || 'Failed to parse receipt.');
      setScanning(false);
    }
  };

  const handleScan = () => {
    if (!inputText.trim() && !imagePreview) {
      setError('Please type an expense description or upload a receipt image first.');
      return;
    }

    if (imagePreview) {
      runScanningSimulation(imagePreview);
    } else {
      runScanningSimulation();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">Gemini Smart Bill Scanner</h3>
              <p className="text-xs text-slate-400 mt-0.5">Let AI extract amount, title, and splits for you</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-700 font-medium">{error}</div>
            </div>
          )}

          {scanning ? (
            /* Scanning Active UI */
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
                </div>
                <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="font-semibold text-slate-800 text-sm">Gemini is processing...</p>
                <p className="text-xs text-slate-400 font-mono italic animate-pulse h-10 px-4">
                  "{scanStep}"
                </p>
              </div>
            </div>
          ) : (
            /* Upload Inputs UI */
            <div className="space-y-6">
              {/* Image upload area */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Receipt / Invoice Photo (Optional)
                </label>
                
                {imagePreview ? (
                  <div className="relative border border-slate-200 rounded-xl overflow-hidden group bg-slate-50 flex items-center justify-center h-48">
                    <img
                      src={imagePreview}
                      alt="Receipt Preview"
                      referrerPolicy="no-referrer"
                      className="h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <button
                        onClick={handleRemoveFile}
                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg p-2 flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-all"
                      >
                        <X className="w-4 h-4" /> Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 h-48 ${
                      dragActive
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-3 bg-white border border-slate-100 text-slate-400 group-hover:text-indigo-600 rounded-xl shadow-xs">
                      <Upload className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        Drag and drop receipt image here
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Supports PNG, JPG, WebP. Click to browse.
                      </p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Text description helper */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Expense Description or Copied Text
                </label>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="e.g. Olive Garden meal was $84.20 last night. Alex paid, shared equally with Bob and Sarah."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs h-24 resize-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  💡 Tip: You can leave the description blank if uploading a receipt photo, or write details to help Gemini match custom splits!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!scanning && (
          <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleScan}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Analyze with Gemini
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
