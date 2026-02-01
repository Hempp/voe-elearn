
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { BookOpenIcon, PlayIcon, SparklesIcon, FileTextIcon, Loader2Icon, CheckCircle2Icon, GraduationCapIcon, FilmIcon } from 'lucide-react';
import { generateVideo, processCourseScript } from '../services/geminiService';
import { AppState, AspectRatio, GenerationMode, Resolution, VeoModel } from '../types';
import VideoResult from './VideoResult';
import LoadingIndicator from './LoadingIndicator';

const CourseStudio: React.FC = () => {
  const [script, setScript] = useState('');
  const [academicLevel, setAcademicLevel] = useState('College');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<'analyzing' | 'rendering'>('analyzing');

  const handleGenerateCourseVideo = async () => {
    if (!script.trim()) return;
    
    setAppState(AppState.LOADING);
    setLoadingPhase('analyzing');
    setErrorMessage(null);

    try {
      // Step 1: Use Gemini Pro to analyze and visualize the script
      const directorPrompt = await processCourseScript(script, academicLevel);
      
      setLoadingPhase('rendering');

      // Step 2: Use Veo to generate the cinematic educational video
      const result = await generateVideo({
        prompt: directorPrompt,
        model: VeoModel.VEO_FAST,
        aspectRatio: AspectRatio.LANDSCAPE,
        resolution: Resolution.P720,
        mode: GenerationMode.TEXT_TO_VIDEO
      });

      setVideoUrl(result.objectUrl);
      setAppState(AppState.SUCCESS);
    } catch (error: any) {
      setErrorMessage(error.message || 'Generation failed.');
      setAppState(AppState.ERROR);
    }
  };

  if (appState === AppState.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <LoadingIndicator />
        <div className="mt-8 flex flex-col items-center gap-2">
           <div className="flex items-center gap-3 text-indigo-400 font-bold uppercase tracking-widest text-xs">
             {loadingPhase === 'analyzing' ? (
               <Loader2Icon className="w-4 h-4 animate-spin" />
             ) : (
               <CheckCircle2Icon className="w-4 h-4" />
             )}
             <span>Gemini Pro Analyzing Script</span>
           </div>
           <div className={`flex items-center gap-3 font-bold uppercase tracking-widest text-xs ${loadingPhase === 'rendering' ? 'text-indigo-400' : 'text-gray-700'}`}>
             {loadingPhase === 'rendering' ? (
               <Loader2Icon className="w-4 h-4 animate-spin" />
             ) : (
               <div className="w-4 h-4 rounded-full border border-gray-800" />
             )}
             <span>Veo Rendering Visuals</span>
           </div>
        </div>
      </div>
    );
  }

  if (appState === AppState.SUCCESS && videoUrl) {
    return (
      <VideoResult 
        videoUrl={videoUrl} 
        onRetry={handleGenerateCourseVideo} 
        onNewVideo={() => setAppState(AppState.IDLE)} 
        onExtend={() => {}} 
        canExtend={true}
        aspectRatio={AspectRatio.LANDSCAPE}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Editor Side */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-gray-900/50 p-8 rounded-3xl border border-gray-800 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600/20 p-2 rounded-xl">
                <FileTextIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold">Course Script Editor</h3>
            </div>
            <select 
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              className="bg-gray-800 border-gray-700 rounded-lg text-xs font-bold px-3 py-2 text-gray-300 outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option>K-12</option>
              <option>College</option>
              <option>Professional</option>
              <option>Scientific</option>
            </select>
          </div>
          
          <textarea 
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Paste your lecture notes or course script here... 
Example: 'Today we discuss the structural integrity of carbon nanotubes at the molecular scale...'"
            className="flex-grow bg-transparent border-none resize-none text-lg leading-relaxed text-gray-300 placeholder:text-gray-700 focus:ring-0"
          />

          <div className="mt-6 pt-6 border-t border-gray-800 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <span className="font-bold text-gray-400">{script.length}</span> characters
            </div>
            <button 
              onClick={handleGenerateCourseVideo}
              disabled={!script.trim()}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-700 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
            >
              <FilmIcon className="w-5 h-5" />
              Generate Learning Module
            </button>
          </div>
        </div>
      </div>

      {/* Info Side */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-gray-900/50 p-8 rounded-3xl border border-gray-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600/20 p-2 rounded-xl">
              <GraduationCapIcon className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold">E-Learning Pipeline</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
              <div>
                <p className="font-bold text-sm">Contextual Analysis</p>
                <p className="text-xs text-gray-500">Gemini 3 Pro analyzes the script for key educational metaphors and academic level.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
              <div>
                <p className="font-bold text-sm">Cinematic Directing</p>
                <p className="text-xs text-gray-500">The AI generates a sophisticated visual prompt for the video engine.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 font-bold text-xs">3</div>
              <div>
                <p className="font-bold text-sm">Veo Rendering</p>
                <p className="text-xs text-gray-500">Veo 3.1 creates high-fidelity visuals matching the academic tone.</p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600/5 p-6 rounded-2xl border border-indigo-500/10">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="w-4 h-4 text-indigo-400" />
              <p className="text-xs font-black uppercase text-indigo-400 tracking-widest">Pro Tip</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Academic videos perform best with descriptive scientific nouns. Instead of "Show a lab", try describing "A brightly lit quantum computing lab with glowing blue fiber optics."
            </p>
          </div>
        </div>

        {appState === AppState.ERROR && (
           <div className="bg-red-900/10 border border-red-500/20 p-6 rounded-3xl">
             <p className="text-red-400 text-sm font-bold">{errorMessage}</p>
             <button onClick={() => setAppState(AppState.IDLE)} className="mt-4 text-xs font-bold text-red-500 hover:underline uppercase">Dismiss</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default CourseStudio;
