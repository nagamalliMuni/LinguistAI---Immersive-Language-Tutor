import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Image as ImageIcon, Wand2, Loader2, ArrowRight } from 'lucide-react';
import { blobToBase64 } from '../utils/audioUtils';

export const ImageEditor: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResultImage(null);
    }
  };

  const handleEdit = async () => {
    if (!file || !prompt) return;

    setLoading(true);
    setResultImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = await blobToBase64(file);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type
                    }
                },
                { text: prompt }
            ]
        }
      });

      // Extract image from parts
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
          for (const part of parts) {
              if (part.inlineData) {
                  const imgUrl = `data:image/png;base64,${part.inlineData.data}`;
                  setResultImage(imgUrl);
                  break;
              }
          }
      }
      
      if (!resultImage && !parts?.some(p => p.inlineData)) {
         // Fallback if model refuses to generate image and returns text
         console.warn("No image returned");
      }

    } catch (e) {
      console.error(e);
      alert("Failed to edit image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
        
        <div className="text-center py-6">
             <h2 className="text-3xl font-bold text-slate-800">Scenario Builder</h2>
             <p className="text-slate-500">Transform simple photos into complex scenarios for description practice.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Input Column */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Source Image</label>
                    <div className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors group">
                        <input type="file" onChange={handleFileChange} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        {file ? (
                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Source" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <ImageIcon className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-sm">Upload Photo</span>
                            </div>
                        )}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Instruction</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. 'Make it look like a rainy day in Tokyo' or 'Add a person reading a book'"
                        className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                    />
                 </div>

                 <button 
                    onClick={handleEdit}
                    disabled={!file || !prompt || loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
                 >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    Generate Scenario
                 </button>
            </div>

            {/* Output Column */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full min-h-[500px] flex flex-col">
                <label className="text-sm font-semibold text-slate-700 mb-4">Generated Scenario</label>
                
                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden relative">
                    {resultImage ? (
                        <img src={resultImage} alt="Result" className="w-full h-full object-contain animate-in fade-in duration-700" />
                    ) : loading ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                            <p className="text-slate-500 font-medium">Drawing new pixels...</p>
                        </div>
                    ) : (
                        <div className="text-slate-400 text-center p-8">
                            <Wand2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p>Result will appear here</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
