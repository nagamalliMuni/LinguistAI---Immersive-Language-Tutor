import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Clapperboard, Loader2, PlayCircle, AlertCircle } from 'lucide-react';
import { blobToBase64 } from '../utils/audioUtils';

// Fix: Removed conflicting global declaration for Window interface. 
// We will use (window as any) to access aistudio to avoid type conflicts with existing environment definitions.

export const VeoAnimator: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!file) return;

    setError(null);
    setIsLoading(true);
    setStatus('Checking API Key permissions...');

    try {
      // 1. Check/Request API Key
      // Fix: Cast window to any to access aistudio properties
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setStatus('Waiting for API Key selection...');
        await (window as any).aistudio.openSelectKey();
      }

      // Re-instantiate AI to pick up the key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      setStatus('Uploading and processing image...');
      const base64Data = await blobToBase64(file);

      setStatus('Initializing generation (this may take a minute)...');
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this naturally',
        image: {
            imageBytes: base64Data,
            mimeType: file.type,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9', // Landscape for better visibility
        }
      });

      setStatus('Generating video frames...');

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      if (operation.error) {
          // Fix: Cast error to any to access message property safely
          throw new Error((operation.error as any).message || "Unknown generation error");
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No video URI returned.");

      setStatus('Fetching final video...');
      
      const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const videoBlob = await videoResponse.blob();
      const localUrl = URL.createObjectURL(videoBlob);
      
      setVideoUrl(localUrl);

    } catch (e: any) {
        if (e.message && e.message.includes("Requested entity was not found")) {
            setError("Session expired or key invalid. Please try again to select a key.");
             // Reset key selection state logic if we could, but here we just prompt user
        } else {
            setError(e.message || "An error occurred during video generation.");
        }
    } finally {
      setIsLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
        
        <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">Visual Vocabulary</h2>
                <p className="text-indigo-200">Upload a static image of a word or object and see it come to life with Veo.</p>
            </div>
            <Clapperboard className="absolute -right-6 -bottom-6 w-48 h-48 text-indigo-800/50 rotate-12" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
            
            {/* Input Section */}
            <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">1. Upload Image</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {file ? (
                        <div className="flex flex-col items-center">
                            <img src={URL.createObjectURL(file)} alt="Preview" className="h-32 object-cover rounded-lg shadow-sm mb-2" />
                            <span className="text-sm font-medium text-slate-600">{file.name}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-slate-400">
                            <Upload className="w-10 h-10 mb-2" />
                            <span className="text-sm">Click to upload an image</span>
                        </div>
                    )}
                </div>

                <label className="block text-sm font-medium text-slate-700">2. Prompt (Optional)</label>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A cat driving at top speed"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />

                <button
                    onClick={handleGenerate}
                    disabled={!file || isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <PlayCircle className="w-6 h-6" />}
                    {isLoading ? 'Generating Video...' : 'Animate with Veo'}
                </button>
            </div>

            {/* Status & Error */}
            {isLoading && (
                <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex items-center gap-3 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    {status}
                </div>
            )}
            
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Generation Failed</p>
                        <p>{error}</p>
                        <p className="mt-2 text-xs opacity-75">Note: Veo requires a paid project API Key.</p>
                    </div>
                </div>
            )}

            {/* Result */}
            {videoUrl && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Result</h3>
                    <video 
                        src={videoUrl} 
                        controls 
                        autoPlay 
                        loop
                        className="w-full rounded-xl shadow-lg border border-slate-100 bg-black aspect-video"
                    />
                </div>
            )}

        </div>
      </div>
    </div>
  );
};