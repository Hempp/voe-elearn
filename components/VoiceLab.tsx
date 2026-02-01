
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { MicIcon, MicOffIcon, MessageSquareTextIcon, SpeakerIcon, PlayIcon, Volume2Icon, Loader2Icon, Trash2Icon, HeadphonesIcon } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { transcribeAudio, generateSpeech } from '../services/geminiService';

const VoiceLab: React.FC = () => {
  const [mode, setMode] = useState<'live' | 'tools'>('live');
  
  // Live API States
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState<{role: string, text: string}[]>([]);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);

  // Tools States
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [ttsInput, setTtsInput] = useState('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);

  // Audio helper functions
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };
  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  };

  const startLive = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            const source = inputAudioCtxRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtxRef.current!.destination);
            (window as any)._scriptProcessor = scriptProcessor;
          },
          onmessage: async (message) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioCtxRef.current) {
              const ctx = outputAudioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (message.serverContent?.outputTranscription) {
              setLiveTranscription(prev => [...prev, {role: 'gemini', text: message.serverContent!.outputTranscription!.text}]);
            }
            if (message.serverContent?.inputTranscription) {
              setLiveTranscription(prev => [...prev, {role: 'user', text: message.serverContent!.inputTranscription!.text}]);
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: (e) => console.error(e)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are a friendly, helpful conversational AI. Speak naturally and keep responses concise.'
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (e) {
      alert("Microphone access required for Live API.");
    }
  };

  const stopLive = () => {
    liveSessionRef.current?.close();
    setIsLiveActive(false);
    if ((window as any)._scriptProcessor) (window as any)._scriptProcessor.disconnect();
  };

  const handleTranscription = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsTranscribing(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const text = await transcribeAudio(base64, file.type);
          setTranscriptionResult(text);
          setIsTranscribing(false);
        };
        reader.readAsDataURL(file);
      } catch (e) { setIsTranscribing(false); }
    }
  };

  const handleTTS = async () => {
    if (!ttsInput.trim()) return;
    setIsGeneratingSpeech(true);
    try {
      const base64 = await generateSpeech(ttsInput);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await decodeAudioData(decode(base64), ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } finally { setIsGeneratingSpeech(false); }
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
      <div className="flex bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800 self-center">
        <button onClick={() => setMode('live')} className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${mode === 'live' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
          <MicIcon className="w-5 h-5"/> Live Conversation
        </button>
        <button onClick={() => setMode('tools')} className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${mode === 'tools' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
          <HeadphonesIcon className="w-5 h-5"/> Audio Tools
        </button>
      </div>

      {mode === 'live' ? (
        <div className="flex flex-col items-center gap-10 py-10">
          <div className="relative">
            <div className={`absolute inset-0 bg-indigo-600/20 rounded-full blur-3xl animate-pulse transition-opacity ${isLiveActive ? 'opacity-100' : 'opacity-0'}`} />
            <button 
              onClick={isLiveActive ? stopLive : startLive}
              className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center gap-3 transition-all border-4 shadow-2xl active:scale-95 ${isLiveActive ? 'bg-red-600/10 border-red-600 text-red-500 shadow-red-600/20' : 'bg-indigo-600/10 border-indigo-600 text-indigo-500 shadow-indigo-600/20'}`}
            >
              {isLiveActive ? <MicOffIcon className="w-12 h-12"/> : <MicIcon className="w-12 h-12"/>}
              <span className="font-black uppercase tracking-widest text-sm">{isLiveActive ? 'STOP LIVE' : 'START LIVE'}</span>
            </button>
          </div>

          <div className="w-full max-w-2xl bg-gray-900/50 rounded-3xl border border-gray-800 overflow-hidden flex flex-col h-[400px]">
             <div className="p-4 bg-black/40 border-b border-gray-800 flex items-center justify-between">
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Transcription</span>
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isLiveActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`} />
                 <span className="text-xs font-bold">{isLiveActive ? 'CONNECTED' : 'DISCONNECTED'}</span>
               </div>
             </div>
             <div className="flex-grow p-6 overflow-y-auto space-y-4">
               {liveTranscription.length === 0 ? (
                 <p className="text-center text-gray-700 italic mt-20">Start a conversation to see the transcript...</p>
               ) : (
                 liveTranscription.map((t, idx) => (
                   <div key={idx} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${t.role === 'user' ? 'bg-gray-800 text-white' : 'bg-indigo-600/10 border border-indigo-600/20 text-indigo-300'}`}>
                        {t.text}
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Transcription */}
          <div className="bg-gray-900/50 p-8 rounded-3xl border border-gray-800 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-600/20 p-2 rounded-lg"><MessageSquareTextIcon className="w-6 h-6 text-blue-400" /></div>
              <h4 className="text-xl font-bold">Transcription</h4>
            </div>
            <p className="text-sm text-gray-500">Upload audio files to get lightning-fast accurate transcripts via Gemini 3 Flash.</p>
            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-800 rounded-2xl hover:border-blue-600 transition-colors cursor-pointer">
              {isTranscribing ? <Loader2Icon className="w-8 h-8 animate-spin text-blue-500" /> : <MicIcon className="w-8 h-8 text-gray-700 mb-2" />}
              <span className="text-sm font-bold text-gray-600 uppercase">Upload Audio</span>
              <input type="file" className="hidden" accept="audio/*" onChange={handleTranscription} />
            </label>
            {transcriptionResult && (
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                {transcriptionResult}
              </div>
            )}
          </div>

          {/* TTS */}
          <div className="bg-gray-900/50 p-8 rounded-3xl border border-gray-800 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-600/20 p-2 rounded-lg"><SpeakerIcon className="w-6 h-6 text-purple-400" /></div>
              <h4 className="text-xl font-bold">Text to Speech</h4>
            </div>
            <p className="text-sm text-gray-500">Convert text into lifelike human audio using Gemini 2.5 TTS.</p>
            <textarea 
              value={ttsInput}
              onChange={e => setTtsInput(e.target.value)}
              placeholder="What should I say?"
              className="w-full bg-black/40 border border-gray-800 rounded-2xl h-40 p-4 focus:ring-2 focus:ring-purple-600 resize-none"
            />
            <button 
              onClick={handleTTS}
              disabled={isGeneratingSpeech || !ttsInput.trim()}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all"
            >
              {isGeneratingSpeech ? <Loader2Icon className="w-5 h-5 animate-spin" /> : <Volume2Icon className="w-5 h-5" />}
              Generate & Play
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceLab;
