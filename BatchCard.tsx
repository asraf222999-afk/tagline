
import React, { useMemo, useState } from 'react';
import { BatchItem, KeywordMetadata } from '../types';

interface BatchCardProps {
  item: BatchItem;
  onRemove: (id: string) => void;
  onAnalyze: (id: string) => void;
  activePlatform: string;
  sortBy: 'relevance' | 'alphabetical';
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
}

// Sub-component for the metadata skeleton
const MetadataSkeleton: React.FC<{ pulsing?: boolean }> = ({ pulsing }) => (
  <div className={`space-y-4 ${pulsing ? 'animate-pulse' : ''}`}>
    <div>
      <div className="h-2.5 bg-slate-100 rounded-full w-20 mb-2" />
      <div className="h-4 bg-slate-100 rounded-lg w-full mb-1" />
      <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
    </div>
    <div className="flex flex-wrap gap-1.5 pt-1">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="h-5 w-14 bg-slate-50 rounded-md border border-slate-100/50" />
      ))}
    </div>
  </div>
);

const BatchCard: React.FC<BatchCardProps> = ({ 
  item, 
  onRemove, 
  onAnalyze, 
  activePlatform, 
  sortBy, 
  selectedKeywords, 
  onToggleKeyword 
}) => {
  const [isHoveringThumbnail, setIsHoveringThumbnail] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const isCompleted = item.status === 'completed';
  const isError = item.status === 'error';
  const isProcessing = item.status === 'processing';
  const isPending = item.status === 'pending';

  const filteredKeywords = useMemo(() => {
    if (!item.result) return [];
    let kws = [...item.result.keywords];
    
    if (activePlatform !== 'All') {
      kws = kws.filter(k => k.platforms.includes(activePlatform as any));
    }

    if (sortBy === 'relevance') {
      kws.sort((a, b) => b.relevance - a.relevance);
    } else {
      kws.sort((a, b) => a.word.localeCompare(b.word));
    }

    return kws;
  }, [item.result, activePlatform, sortBy]);

  const handleQuickCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.result) return;
    
    const textToCopy = selectedKeywords.length > 0 
      ? selectedKeywords.join(', ')
      : item.result.keywords.map(k => k.word).join(', ');
      
    navigator.clipboard.writeText(textToCopy);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col h-full min-h-[420px]">
      <div 
        className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 mb-4 cursor-zoom-in shrink-0"
        onMouseEnter={() => setIsHoveringThumbnail(true)}
        onMouseLeave={() => setIsHoveringThumbnail(false)}
      >
        <img 
          src={item.previewUrl} 
          alt="Preview" 
          loading="lazy"
          className="w-full h-full object-cover"
        />
        
        {isHoveringThumbnail && (
          <div className="fixed sm:absolute z-[100] bottom-[110%] left-1/2 -translate-x-1/2 w-64 md:w-80 aspect-video bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-2 border-indigo-500 overflow-hidden pointer-events-none transition-all duration-300 animate-[fadeInScale_0.2s_ease-out]">
            <img src={item.previewUrl} className="w-full h-full object-cover" alt="Large Preview" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">Full Preview</span>
            </div>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-2">
          {item.status !== 'processing' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              className="p-2 bg-white/90 rounded-full text-slate-600 hover:text-red-500 hover:bg-white shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {isProcessing && (
          <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
              <span className="text-white text-[10px] font-black tracking-widest uppercase">Analyzing...</span>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="absolute inset-0 bg-green-500/20 pointer-events-none flex items-end p-2">
            <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Ready</span>
          </div>
        )}
      </div>

      <div className="flex-grow">
        {isCompleted && item.result ? (
          <div className="space-y-3 animate-in fade-in duration-500">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-grow">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Top Tagline</p>
                <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">"{item.result.taglines[0]}"</p>
              </div>
              <button 
                onClick={handleQuickCopy}
                title={selectedKeywords.length > 0 ? `Copy ${selectedKeywords.length} selected keywords` : "Copy all keywords"}
                className={`shrink-0 p-2 rounded-lg border transition-all relative ${
                  copyFeedback 
                    ? 'bg-green-50 text-green-600 border-green-200' 
                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {selectedKeywords.length > 0 && !copyFeedback && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-sm">
                    {selectedKeywords.length}
                  </span>
                )}
                {copyFeedback ? (
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {filteredKeywords.slice(0, 12).map((kw, i) => {
                const isSelected = selectedKeywords.includes(kw.word);
                return (
                  <span 
                    key={i} 
                    onClick={(e) => { e.stopPropagation(); onToggleKeyword(kw.word); }}
                    className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-all border ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100/50 hover:border-indigo-300'
                    }`}
                  >
                    {kw.word}
                  </span>
                );
              })}
              {filteredKeywords.length > 12 && (
                <span className="text-[10px] text-slate-400 px-1 pt-0.5 italic">+{filteredKeywords.length - 12} more</span>
              )}
            </div>
          </div>
        ) : isError ? (
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 animate-in shake duration-300">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Analysis Error</p>
            <p className="text-xs text-red-500 font-medium leading-relaxed">{item.error || 'The AI engine encountered an issue. Please try again.'}</p>
          </div>
        ) : (
          <div className="relative">
            <MetadataSkeleton pulsing={isProcessing} />
            {isPending && (
              <div className="mt-6 animate-in slide-in-from-bottom-2 duration-500">
                <button 
                  onClick={(e) => { e.stopPropagation(); onAnalyze(item.id); }}
                  className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-[0.98]"
                >
                  Start Analysis
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isCompleted && (
        <button 
          className="mt-4 w-full py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
        >
          View Full Report
        </button>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInScale {
          from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-in {
          animation-fill-mode: forwards;
        }
      `}} />
    </div>
  );
};

export default React.memo(BatchCard);
