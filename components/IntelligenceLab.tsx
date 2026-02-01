
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, SearchIcon, MapPinIcon, BrainIcon, PaperclipIcon, TrashIcon, ExternalLinkIcon, UserIcon, BotIcon } from 'lucide-react';
import { performChat } from '../services/geminiService';
import { ChatMessage } from '../types';

const IntelligenceLab: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<{file: File, base64: string}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    const userMsg: ChatMessage = { 
      role: 'user', 
      text: input, 
      images: attachments.map(a => `data:${a.file.type};base64,${a.base64}`) 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await performChat(
        input, 
        currentAttachments.map(a => ({ data: a.base64, mime: a.file.type })),
        isThinking,
        useSearch,
        useMaps
      );

      const modelMsg: ChatMessage = {
        role: 'model',
        text: response.text,
        groundingUrls: response.urls,
        isThinking
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fix: Added explicit File[] type to avoid 'unknown' inference when iterating over files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, { file, base64 }]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-5xl mx-auto w-full">
      {/* Settings Bar */}
      <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-2xl border border-gray-800">
        <button 
          onClick={() => setIsThinking(!isThinking)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isThinking ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
        >
          <BrainIcon className="w-4 h-4" />
          <span className="text-sm font-semibold">Deep Thinking</span>
        </button>
        <button 
          onClick={() => setUseSearch(!useSearch)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${useSearch ? 'bg-blue-600/20 border-blue-600 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
        >
          <SearchIcon className="w-4 h-4" />
          <span className="text-sm font-semibold">Google Search</span>
        </button>
        <button 
          onClick={() => setUseMaps(!useMaps)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${useMaps ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
        >
          <MapPinIcon className="w-4 h-4" />
          <span className="text-sm font-semibold">Google Maps</span>
        </button>
      </div>

      {/* Message Area */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto pr-2 space-y-6 min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
            <BrainIcon className="w-16 h-16 mb-4" />
            <h4 className="text-xl font-bold">Gemini Intelligence</h4>
            <p>Ask complex questions, analyze images, or browse the web.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-gray-800'}`}>
              <div className="flex items-center gap-2 mb-2 opacity-50 text-xs font-bold uppercase tracking-wider">
                {msg.role === 'user' ? <UserIcon className="w-3 h-3"/> : <BotIcon className="w-3 h-3"/>}
                {msg.role === 'user' ? 'User' : (msg.isThinking ? 'Gemini Thinking' : 'Gemini')}
              </div>
              
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {msg.images.map((img, i) => (
                    <img key={i} src={img} alt="attachment" className="w-32 h-32 object-cover rounded-lg border border-white/10" />
                  ))}
                </div>
              )}
              
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
              
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingUrls.map((link, i) => (
                      <a key={i} href={link.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-indigo-400 transition-colors">
                        <ExternalLinkIcon className="w-3 h-3" />
                        <span className="max-w-[150px] truncate">{link.title || link.uri}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
             <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
               <span className="text-xs text-gray-500 font-bold ml-2">GEMINI IS {isThinking ? 'THINKING' : 'TYPING'}...</span>
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900/80 backdrop-blur rounded-3xl border border-gray-800 shadow-2xl">
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3">
            {attachments.map((a, i) => (
              <div key={i} className="relative group">
                <img src={`data:${a.file.type};base64,${a.base64}`} alt="upload" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                <button 
                  onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-end gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-colors text-gray-400"
          >
            <PaperclipIcon className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
          
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask anything..."
            className="flex-grow bg-transparent border-none focus:ring-0 resize-none py-3 text-lg placeholder:text-gray-600"
            rows={1}
          />
          
          <button 
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-700 rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <SendIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceLab;
