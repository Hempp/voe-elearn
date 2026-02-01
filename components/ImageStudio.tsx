
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { SparklesIcon, Edit3Icon, DownloadIcon, LayoutGridIcon, Maximize2Icon, ImagePlusIcon, RefreshCcwIcon } from 'lucide-react';
import { generateImagePro, editImageFlash } from '../services/geminiService';
import { AspectRatio, ImageSize } from '../types';

const ImageStudio: React.FC = () => {
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.K1);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editSource, setEditSource] = useState<{data: string, mime: string} | null>(null);

  const handleAction = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      if (mode === 'generate') {
        const url = await generateImagePro(prompt, aspectRatio, imageSize);
        setResultImage(url);
      } else if (editSource) {
        const url = await editImageFlash(prompt, editSource.data, editSource.mime);
        setResultImage(url);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setEditSource({ data: base64, mime: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Configuration Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-gray-900/50 p-6 rounded-3xl border border-gray-800 space-y-6">
          <div className="flex bg-gray-800 p-1 rounded-xl">
            <button 
              onClick={() => { setMode('generate'); setResultImage(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'generate' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <ImagePlusIcon className="w-4 h-4"/> Generate
            </button>
            <button 
              onClick={() => { setMode('edit'); setResultImage(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'edit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <Edit3Icon className="w-4 h-4"/> Edit
            </button>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-gray-500 uppercase">Prompt</label>
            <textarea 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={mode === 'generate' ? "Describe the image..." : "Describe the edits (e.g. 'Add a retro filter')"}
              className="w-full bg-gray-800 border-none rounded-2xl h-32 focus:ring-2 focus:ring-indigo-600 transition-all text-white placeholder:text-gray-600"
            />
          </div>

          {mode === 'generate' ? (
            <>
              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-500 uppercase">Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.values(AspectRatio).map(ratio => (
                    <button 
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${aspectRatio === ratio ? 'border-indigo-600 bg-indigo-600/10 text-indigo-400' : 'border-gray-800 bg-gray-800 text-gray-500 hover:text-white'}`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-500 uppercase">Resolution</label>
                <div className="flex gap-2">
                  {Object.values(ImageSize).map(size => (
                    <button 
                      key={size}
                      onClick={() => setImageSize(size)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${imageSize === size ? 'border-indigo-600 bg-indigo-600/10 text-indigo-400' : 'border-gray-800 bg-gray-800 text-gray-500 hover:text-white'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-500 uppercase">Source Image</label>
              {editSource ? (
                <div className="relative group">
                  <img src={`data:${editSource.mime};base64,${editSource.data}`} alt="source" className="w-full h-40 object-cover rounded-2xl border border-gray-700" />
                  <button 
                    onClick={() => setEditSource(null)}
                    className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white hover:bg-red-600 transition-colors"
                  >
                    <RefreshCcwIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-800 rounded-3xl cursor-pointer hover:border-indigo-600 transition-colors bg-gray-900/50">
                  <ImagePlusIcon className="w-8 h-8 text-gray-600 mb-2" />
                  <span className="text-xs font-bold text-gray-600 uppercase">Click to upload</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                </label>
              )}
            </div>
          )}

          <button 
            onClick={handleAction}
            disabled={isLoading || !prompt.trim() || (mode === 'edit' && !editSource)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-700 rounded-2xl text-lg font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3"
          >
            {isLoading ? <RefreshCcwIcon className="w-6 h-6 animate-spin"/> : <SparklesIcon className="w-6 h-6"/>}
            {mode === 'generate' ? 'Generate Pro' : 'Apply Edits'}
          </button>
        </div>
      </div>

      {/* Result Preview */}
      <div className="lg:col-span-8 flex flex-col min-h-[400px]">
        {resultImage ? (
          <div className="relative group h-full flex flex-col bg-gray-900/50 rounded-[40px] border border-gray-800 overflow-hidden shadow-2xl">
            <div className="flex-grow flex items-center justify-center p-8">
              <img src={resultImage} alt="result" className="max-w-full max-h-[60vh] rounded-2xl shadow-2xl object-contain bg-black" />
            </div>
            <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">Creation Ready</p>
                <p className="text-sm text-gray-500">Gemini {mode === 'generate' ? '3 Pro' : '2.5 Flash'} output</p>
              </div>
              <a href={resultImage} download={`gemini-creation-${Date.now()}.png`} className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-transform">
                <DownloadIcon className="w-5 h-5" /> Download
              </a>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center bg-gray-900/20 border border-gray-800 border-dashed rounded-[40px] p-20 text-center text-gray-600">
            {isLoading ? (
              <div className="space-y-6">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"/>
                <p className="text-xl font-bold animate-pulse">CREATING MASTERPIECE...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center mx-auto">
                   <LayoutGridIcon className="w-10 h-10 opacity-20" />
                </div>
                <h4 className="text-2xl font-bold">Image Canvas</h4>
                <p className="max-w-xs mx-auto">Configure your generation or editing request on the left to see results here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageStudio;
