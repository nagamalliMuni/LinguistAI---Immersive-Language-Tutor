import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Volume2, XCircle, Play } from 'lucide-react';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { AudioVisualizer } from './AudioVisualizer';

interface LiveConversationProps {
  apiKey: string;
}

// Ensure 16kHz for input to Gemini Live
const INPUT_SAMPLE_RATE = 16000;
// Ensure 24kHz for output from Gemini Live
const OUTPUT_SAMPLE_RATE = 24000;

export const LiveConversation: React.FC<LiveConversationProps> = ({ apiKey }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<{user: string, model: string}>({ user: '', model: '' });
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        // Stop all current playing sources
        sourcesRef.current.forEach(s => {
            try { s.stop(); } catch(e) {}
        });
        sourcesRef.current.clear();
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    // Close session if possible - wrapper method might not exist on the promise directly, 
    // but the library handles disconnect on close.
    // We mainly just stop sending data.
    sessionRef.current = null;
    setIsConnected(false);
    nextStartTimeRef.current = 0;
  }, []);

  useEffect(() => {
      return () => cleanup();
  }, [cleanup]);

  const startSession = async () => {
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      // Visualizers
      inputAnalyserRef.current = inputAudioContextRef.current!.createAnalyser();
      outputAnalyserRef.current = outputAudioContextRef.current!.createAnalyser();
      inputAnalyserRef.current.fftSize = 256;
      outputAnalyserRef.current.fftSize = 256;

      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const outputNode = outputAudioContextRef.current!.createGain();
      outputNode.connect(outputAnalyserRef.current!);
      outputAnalyserRef.current!.connect(outputAudioContextRef.current!.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: 'You are a helpful language tutor. Correct my grammar gently and keep the conversation going.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('Live Session Opened');
            setIsConnected(true);

            // Connect Mic to Processor
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            // Visualization connection
            source.connect(inputAnalyserRef.current!);

            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Transcription
             if (message.serverContent?.outputTranscription) {
                setTranscription(prev => ({ ...prev, model: prev.model + message.serverContent?.outputTranscription?.text }));
             }
             if (message.serverContent?.inputTranscription) {
                setTranscription(prev => ({ ...prev, user: prev.user + message.serverContent?.inputTranscription?.text }));
             }

             if (message.serverContent?.turnComplete) {
                 // Clear for next turn if you want, or keep history. 
                 // For now, let's just log and maybe clear slightly delayed for UX
                 console.log("Turn complete");
                 setTimeout(() => {
                     setTranscription({ user: '', model: ''});
                 }, 3000);
             }

             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                try {
                    const audioBuffer = await decodeAudioData(
                        decode(base64Audio),
                        ctx,
                        OUTPUT_SAMPLE_RATE,
                        1
                    );
                    
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNode);
                    
                    source.addEventListener('ended', () => {
                        sourcesRef.current.delete(source);
                    });
                    
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);

                } catch (e) {
                    console.error("Audio decode error", e);
                }
             }
             
             // Handle Interruption
             if (message.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
                 setTranscription(prev => ({...prev, model: ''})); // Clear cut-off text
             }
          },
          onclose: () => {
              setIsConnected(false);
              console.log("Live Session Closed");
          },
          onerror: (err) => {
              console.error("Live Session Error", err);
              setError("Connection error occurred.");
              setIsConnected(false);
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start session");
      cleanup();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Live Tutor</h2>
                <p className="text-slate-500">Practice your pronunciation and flow with Gemini Live.</p>
            </div>
            {!isConnected ? (
                <button 
                    onClick={startSession}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                    <Mic className="w-5 h-5" />
                    Start Session
                </button>
            ) : (
                <button 
                    onClick={cleanup}
                    className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-600 px-6 py-3 rounded-full font-medium transition-all"
                >
                    <XCircle className="w-5 h-5" />
                    End Session
                </button>
            )}
        </div>

        {/* Visualization Area */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative flex flex-col items-center justify-center p-8 gap-12 bg-gradient-to-b from-white to-slate-50">
            
            {/* Visualizers Container */}
            <div className="flex w-full items-center justify-center gap-8 h-48">
                {/* User Mic */}
                <div className="flex flex-col items-center gap-4 w-1/3">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
                        <Mic className={`w-8 h-8 ${isConnected ? 'animate-pulse' : ''}`} />
                    </div>
                    <div className="h-24 w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative">
                        <AudioVisualizer analyser={inputAnalyserRef.current} isActive={isConnected} color="#6366f1" />
                    </div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">You</p>
                </div>

                {/* Divider */}
                <div className="h-32 w-px bg-slate-200"></div>

                {/* AI Output */}
                <div className="flex flex-col items-center gap-4 w-1/3">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                        <Volume2 className={`w-8 h-8 ${isConnected ? 'animate-pulse' : ''}`} />
                    </div>
                    <div className="h-24 w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative">
                        <AudioVisualizer analyser={outputAnalyserRef.current} isActive={isConnected} color="#10b981" />
                    </div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tutor</p>
                </div>
            </div>

            {/* Transcript Overlay */}
            <div className="w-full max-w-2xl space-y-4">
                {transcription.user && (
                    <div className="flex justify-start">
                         <div className="bg-indigo-50 text-indigo-900 px-4 py-2 rounded-2xl rounded-tl-none max-w-[80%] shadow-sm">
                            <p className="text-sm font-medium opacity-75 mb-1">You</p>
                            <p>{transcription.user}</p>
                         </div>
                    </div>
                )}
                {transcription.model && (
                    <div className="flex justify-end text-right">
                         <div className="bg-emerald-50 text-emerald-900 px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%] shadow-sm">
                            <p className="text-sm font-medium opacity-75 mb-1">Tutor</p>
                            <p>{transcription.model}</p>
                         </div>
                    </div>
                )}
            </div>

            {!isConnected && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mx-auto mb-4 text-indigo-500">
                             <Play className="w-8 h-8 ml-1" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Ready to practice?</h3>
                        <p className="text-slate-500">Tap 'Start Session' to begin.</p>
                    </div>
                </div>
            )}
            
            {error && (
                 <div className="absolute bottom-6 left-6 right-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                    <XCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};
