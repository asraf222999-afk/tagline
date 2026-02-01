
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Header from './components/Header';
import BatchCard from './components/BatchCard';
import { BatchItem, AnalysisResult, KeywordMetadata } from './types';
import { analyzeImage } from './services/geminiService';

const CONCURRENCY_LIMIT = 5; // Aggressive concurrency for speed
const MAX_IMAGE_DIMENSION = 1024; // Optimized for performance/cost balance

// Ultra-fast image resizer utility
const resizeImage = (file: File): Promise<{ base64: string; preview: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_IMAGE_DIMENSION) {
            height *= MAX_IMAGE_DIMENSION / width;
            width = MAX_IMAGE_DIMENSION;
          }
        } else {
          if (height > MAX_IMAGE_DIMENSION) {
            width *= MAX_IMAGE_DIMENSION / height;
            height = MAX_IMAGE_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        // Quality 0.7 is the sweet spot for speed vs vision AI accuracy
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve({
          base64: resizedBase64,
          preview: URL.createObjectURL(file) 
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const ResultModal: React.FC<{
  item: BatchItem;
  onClose: () => void;
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  onSelectAll: (keywords: KeywordMetadata[]) => void;
  onCopyAll: (keywords: KeywordMetadata[]) => void;
  onCopySelected: () => void;
  copyFeedback: boolean;
}> = ({ item, onClose, selectedKeywords, onToggleKeyword, onSelectAll, onCopyAll, onCopySelected, copyFeedback }) => {
  const [platform, setPlatform] = useState<string>('All');
  const [sort, setSort] = useState<'relevance' | 'alphabetical'>('relevance');

  const filteredKeywords = useMemo(() => {
    if (!item.result) return [];
    let kws = [...item.result.keywords];
    if (platform !== 'All') kws = kws.filter(k => k.platforms.includes(platform as any));
    if (sort === 'relevance') kws.sort((a, b) => b.relevance - a.relevance);
    else kws.sort((a, b) => a.word.localeCompare(b.word));
    return kws;
  }, [item.result, platform, sort]);

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 z-[70] p-2 bg-white/50 hover:bg-white rounded-full transition-colors">
          <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="w-full md:w-1/2 bg-slate-100 h-64 md:h-auto">
          <img src={item.previewUrl} alt="Analysis" className="w-full h-full object-cover" />
        </div>
        <div className="w-full md:w-1/2 p-8 overflow-y-auto">
          <div className="mb-8">
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">AI Insights</h4>
            <p className="text-slate-600 italic leading-relaxed">"{item.result?.description}"</p>
          </div>
          <div className="mb-8">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Top Taglines</h4>
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
              {item.result?.taglines.map((tag, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/50 hover:bg-indigo-50/30 hover:border-indigo-100 transition-all group">
                  <span className="text-slate-700 font-medium text-sm">"{tag}"</span>
                  <button onClick={() => copyToClipboard(tag)} className="text-slate-400 hover:text-indigo-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-8">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">SEO Keywords</h4>
                <div className="flex gap-3">
                  <button onClick={() => onSelectAll(filteredKeywords)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider">Select Page</button>
                  <button onClick={() => onCopyAll(filteredKeywords)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copyFeedback ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {copyFeedback ? 'Copied!' : 'Copy Filtered'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1 border border-slate-200/40">
                  {['All', 'Adobe Stock', 'Shutterstock', 'Freepik'].map(plat => (
                    <button key={plat} onClick={() => setPlatform(plat)} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${platform === plat ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {plat}
                    </button>
                  ))}
                </div>
                <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1 border border-slate-200/40">
                  <button onClick={() => setSort('relevance')} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${sort === 'relevance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Match</button>
                  <button onClick={() => setSort('alphabetical')} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${sort === 'alphabetical' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>A-Z</button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-8">
              {filteredKeywords.map((kw, i) => {
                const isSelected = selectedKeywords?.includes(kw.word);
                return (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all cursor-pointer select-none ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'}`} onClick={() => onToggleKeyword(kw.word)}>
                    <span className="text-xs font-semibold">{kw.word}</span>
                    <span className={`text-[8px] font-black ${isSelected ? 'text-indigo-200' : 'text-indigo-400/50'}`}>{kw.relevance}%</span>
                  </div>
                );
              })}
            </div>
            <button disabled={selectedKeywords.length === 0} onClick={onCopySelected} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-[0.98]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              Copy Selected ({selectedKeywords.length})
            </button>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar {width: 4px;}.custom-scrollbar::-webkit-scrollbar-track {background: #f1f5f9;}.custom-scrollbar::-webkit-scrollbar-thumb {background: #cbd5e1;border-radius: 10px;}.custom-scrollbar::-webkit-scrollbar-thumb:hover {background: #94a3b8;}`}} />
    </div>
  );
};

const App: React.FC = () => {
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [showSingleCopyFeedback, setShowSingleCopyFeedback] = useState(false);
  const [showCombinedCopyFeedback, setShowCombinedCopyFeedback] = useState(false);
  const [selectedKeywordsMap, setSelectedKeywordsMap] = useState<Record<string, string[]>>({});
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const base64Store = useRef<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'Escape') {
        if (selectedResultId) setSelectedResultId(null);
        if (isCameraOpen) closeCamera();
      }
      if (e.key.toLowerCase() === 'a' && !selectedResultId && !isCameraOpen) processAll();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedResultId, isCameraOpen, batch, isProcessingAll]);

  const addFilesToBatch = async (files: File[]) => {
    if (files.length === 0) return;
    setIsPreparing(true);
    
    try {
      const results = await Promise.all(
        files.filter(f => f.type.startsWith('image/')).map(async (file) => {
          const { base64, preview } = await resizeImage(file);
          const id = Math.random().toString(36).substr(2, 9);
          base64Store.current.set(id, base64);
          return { id, image: '', previewUrl: preview, status: 'pending' as const };
        })
      );
      
      setBatch(prev => [...results, ...prev]);
    } finally {
      setIsPreparing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    addFilesToBatch(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFilesToBatch(Array.from(e.dataTransfer.files) as File[]);
  };

  const removeItem = (id: string) => {
    setBatch(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
    base64Store.current.delete(id);
    setSelectedKeywordsMap(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearBatch = () => {
    if (window.confirm("Are you sure you want to clear all items?")) {
      batch.forEach(item => URL.revokeObjectURL(item.previewUrl));
      setBatch([]);
      setSelectedKeywordsMap({});
      base64Store.current.clear();
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setCameraStream(stream);
      setIsCameraOpen(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("Camera access denied."); }
  };

  const closeCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      
      const tempCanvas = document.createElement('canvas');
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(canvas.width, canvas.height));
      tempCanvas.width = canvas.width * scale;
      tempCanvas.height = canvas.height * scale;
      tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);
      const id = Math.random().toString(36).substr(2, 9);
      base64Store.current.set(id, dataUrl);
      setBatch(prev => [{ id, image: '', previewUrl: dataUrl, status: 'pending' }, ...prev]);
      closeCamera();
    }
  };

  const analyzeSingle = async (id: string) => {
    setBatch(prev => prev.map(i => i.id === id ? { ...i, status: 'processing', error: undefined } : i));
    const imageData = base64Store.current.get(id);
    if (!imageData) {
       setBatch(prev => prev.map(i => i.id === id ? { ...i, status: 'error', error: 'Image data lost' } : i));
       return;
    }
    try {
      const aiResponse = await analyzeImage(imageData);
      const result: AnalysisResult = {
        taglines: aiResponse.taglines,
        keywords: aiResponse.keywords,
        description: aiResponse.description,
        suggestedPlatforms: aiResponse.platforms
      };
      setBatch(prev => prev.map(i => i.id === id ? { ...i, status: 'completed', result } : i));
    } catch (err) {
      setBatch(prev => prev.map(i => i.id === id ? { ...i, status: 'error', error: (err as Error).message } : i));
    }
  };

  const processAll = async () => {
    const pendingItems = batch.filter(i => i.status === 'pending' || i.status === 'error');
    if (pendingItems.length === 0 || isProcessingAll) return;
    setIsProcessingAll(true);
    const queue = [...pendingItems];
    const workers = Array(Math.min(CONCURRENCY_LIMIT, queue.length)).fill(null).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) await analyzeSingle(item.id);
      }
    });
    await Promise.all(workers);
    setIsProcessingAll(false);
  };

  const handleToggleKeyword = (itemId: string, keyword: string) => {
    setSelectedKeywordsMap(prev => {
      const current = prev[itemId] || [];
      return { ...prev, [itemId]: current.includes(keyword) ? current.filter(k => k !== keyword) : [...current, keyword] };
    });
  };

  const handleSelectAllInItem = (itemId: string, keywords: KeywordMetadata[]) => {
    setSelectedKeywordsMap(prev => ({ ...prev, [itemId]: keywords.map(k => k.word) }));
  };

  const handleCopySelectedKeywords = (itemId: string) => {
    const selected = selectedKeywordsMap[itemId] || [];
    if (selected.length === 0) return;
    navigator.clipboard.writeText(selected.join(', '));
    setShowCombinedCopyFeedback(true);
    setTimeout(() => setShowCombinedCopyFeedback(false), 2000);
  };

  const handleCopyAllKeywords = (keywords: KeywordMetadata[]) => {
    navigator.clipboard.writeText(keywords.map(k => k.word).join(', '));
    setShowSingleCopyFeedback(true);
    setTimeout(() => setShowSingleCopyFeedback(false), 2000);
  };

  const handleCopyCombinedKeywords = () => {
    const allKws = Array.from(new Set(batch.filter(i => i.status === 'completed' && i.result).flatMap(i => i.result!.keywords.map(k => k.word))));
    if (allKws.length === 0) return;
    navigator.clipboard.writeText(allKws.join(', '));
    setShowCombinedCopyFeedback(true);
    setTimeout(() => setShowCombinedCopyFeedback(false), 2000);
  };

  const completedCount = batch.filter(i => i.status === 'completed').length;
  const processingCount = batch.filter(i => i.status === 'processing').length;
  const pendingCount = batch.filter(i => i.status === 'pending').length;
  const progressPercent = batch.length > 0 ? (completedCount / batch.length) * 100 : 0;
  
  const currentSelectedItem = useMemo(() => {
    return batch.find(i => i.id === selectedResultId) || null;
  }, [batch, selectedResultId]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd]">
      <Header />
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-12 sm:px-8">
        <section className="mb-14 text-center max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50/60 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] mb-6 border border-indigo-100/50">
            Free Professional Engine
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 heading-font mb-5 tracking-tight leading-[1.1]">
            Instant SEO <span className="text-transparent bg-clip-text bg-gradient-to-tr from-indigo-600 to-indigo-400">Metadata</span> for Your Images
          </h2>
          <p className="text-base text-slate-500 leading-relaxed font-medium">
            Generate trending taglines and keywords in bulk. Zero cost, zero wait.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-16">
          <div 
            onClick={() => !isPreparing && fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`col-span-1 md:col-span-8 border-2 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/40 shadow-sm'
            } ${isPreparing ? 'opacity-50 cursor-wait' : ''}`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
            <div className="w-16 h-16 rounded-2xl bg-slate-50 text-indigo-600 flex items-center justify-center mb-5 border border-slate-100 shadow-sm">
              {isPreparing ? (
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round" /></svg>
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">{isPreparing ? 'Accelerating...' : 'Drop Batch Here'}</h3>
            <p className="text-slate-400 text-sm mt-1 font-medium">Auto-compressed for ultra-fast generation.</p>
          </div>
          <div onClick={openCamera} className="col-span-1 md:col-span-4 border-2 border-dashed border-slate-200 bg-white rounded-[2.5rem] p-12 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-slate-50/40 transition-all duration-300 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center mb-5 border border-slate-100 shadow-sm transition-colors group-hover:text-indigo-600"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2.5" strokeLinecap="round"/></svg></div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Camera</h3>
            <p className="text-slate-400 text-sm mt-1 font-medium">Quick single snapshot.</p>
          </div>
        </div>

        {batch.length > 0 && (
          <div className="mb-20 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white/40 backdrop-blur-md p-8 rounded-[3rem] border border-slate-200/60 shadow-xl mb-10 overflow-hidden relative">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8 relative z-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 heading-font mb-2">Workspace</h3>
                  <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-200"></span> {completedCount} Done</span>
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> {processingCount} Active</span>
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-300"></span> {pendingCount} Queue</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {completedCount > 0 && (
                    <>
                      <button onClick={handleCopyCombinedKeywords} className={`px-5 py-3 rounded-2xl font-bold border transition-all active:scale-95 text-xs ${showCombinedCopyFeedback ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-indigo-600 border-slate-200 hover:border-indigo-200 shadow-sm'}`}>
                        {showCombinedCopyFeedback ? 'Success!' : 'Copy Batch Keywords'}
                      </button>
                      <button onClick={clearBatch} className="px-5 py-3 bg-white text-slate-400 border border-slate-200 rounded-2xl font-bold hover:text-red-500 hover:border-red-100 transition-all active:scale-95 text-xs">Clear Workspace</button>
                    </>
                  )}
                  <button 
                    onClick={processAll} 
                    disabled={pendingCount === 0 || isProcessingAll} 
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-xl shadow-indigo-200 transition-all active:scale-[0.97] text-xs flex items-center gap-2"
                  >
                    {isProcessingAll ? (
                      <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> Generating...</span>
                    ) : 'Start Batch [A]'}
                  </button>
                </div>
              </div>
              <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(79,70,229,0.5)]" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {batch.map(item => (
                <div key={item.id} onClick={() => item.status === 'completed' && setSelectedResultId(item.id)}>
                  <BatchCard 
                    item={item} 
                    onRemove={removeItem} 
                    onAnalyze={analyzeSingle}
                    activePlatform="All"
                    sortBy="relevance"
                    selectedKeywords={selectedKeywordsMap[item.id] || []}
                    onToggleKeyword={(kw) => handleToggleKeyword(item.id, kw)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {currentSelectedItem && (
        <ResultModal 
          item={currentSelectedItem}
          onClose={() => setSelectedResultId(null)}
          selectedKeywords={selectedKeywordsMap[currentSelectedItem.id] || []}
          onToggleKeyword={(kw) => handleToggleKeyword(currentSelectedItem.id, kw)}
          onSelectAll={(kws) => handleSelectAllInItem(currentSelectedItem.id, kws)}
          onCopyAll={(kws) => handleCopyAllKeywords(kws)}
          onCopySelected={() => handleCopySelectedKeywords(currentSelectedItem.id)}
          copyFeedback={showSingleCopyFeedback}
        />
      )}

      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl relative border border-white/5">
            <div className="p-6 border-b border-white/5 flex items-center justify-between"><h4 className="text-white font-bold heading-font">Live Snap</h4><button onClick={closeCamera} className="p-2 text-slate-500 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button></div>
            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden mx-4 mt-4"><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /></div>
            <div className="p-10 flex justify-center items-center gap-8">
              <button onClick={closeCamera} className="px-6 py-3 text-slate-500 font-bold hover:text-white transition-colors text-sm">Cancel</button>
              <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"><div className="w-14 h-14 rounded-full border-4 border-slate-900 bg-indigo-600"></div></button>
              <div className="w-[80px]"></div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-100 py-16 px-4 sm:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 text-center md:text-left">
          <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shadow-lg"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2.5" /></svg></div>
            <span className="text-slate-900 font-black heading-font tracking-tight">BrandPulse AI</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Built for Speed. Free Forever. Open Batch Engine v2.5</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
