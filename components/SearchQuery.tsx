import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Search, Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const SearchQuery: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string>('');
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');
    setGroundingChunks([]);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setResponse(result.text || "No response generated.");
      
      const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setGroundingChunks(chunks);

    } catch (err: any) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
        
        <div className="text-center py-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Cultural Insight</h2>
            <p className="text-slate-500">Ask about current slang, cultural events, or modern usage. Powered by Google Search.</p>
        </div>

        <form onSubmit={handleSearch} className="relative shadow-lg rounded-2xl">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., 'What is the most popular slang for cool in Paris right now?'"
                className="w-full pl-6 pr-32 py-5 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-lg text-slate-800 placeholder-slate-400"
            />
            <button 
                type="submit" 
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Ask
            </button>
        </form>

        {(response || loading) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[200px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                    </div>
                ) : (
                    <div className="prose prose-slate max-w-none">
                        <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                )}
            </div>
        )}

        {groundingChunks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                {groundingChunks.map((chunk, idx) => (
                    chunk.web && (
                        <a 
                            key={idx} 
                            href={chunk.web.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between">
                                <h4 className="font-semibold text-slate-800 text-sm mb-1 group-hover:text-indigo-600 line-clamp-2">
                                    {chunk.web.title}
                                </h4>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                            </div>
                            <p className="text-xs text-slate-500 truncate">{chunk.web.uri}</p>
                        </a>
                    )
                ))}
            </div>
        )}

      </div>
    </div>
  );
};
