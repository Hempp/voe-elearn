
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useCallback, useEffect, useState} from 'react';
import ApiKeyDialog from './components/ApiKeyDialog';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import VideoResult from './components/VideoResult';
import ImageStudio from './components/ImageStudio';
import IntelligenceLab from './components/IntelligenceLab';
import VoiceLab from './components/VoiceLab';
import CourseStudio from './components/CourseStudio';
import {generateVideo} from './services/geminiService';
import {
  AppState,
  AspectRatio,
  GenerateVideoParams,
  GenerationMode,
  Resolution,
  VideoFile,
  NavigationTab,
  VeoModel,
} from './types';
import { FilmIcon, ImageIcon, BrainCircuitIcon, MicIcon, LayoutGridIcon, GraduationCapIcon } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>(NavigationTab.INTELLIGENCE);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastConfig, setLastConfig] = useState<GenerateVideoParams | null>(null);
  const [lastVideoObject, setLastVideoObject] = useState<any>(null);
  const [lastVideoBlob, setLastVideoBlob] = useState<Blob | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<GenerateVideoParams | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
          }
        } catch (error) {
          setShowApiKeyDialog(true);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleGenerate = useCallback(async (params: GenerateVideoParams) => {
    if (window.aistudio) {
      if (!(await window.aistudio.hasSelectedApiKey())) {
        setShowApiKeyDialog(true);
        return;
      }
    }

    setAppState(AppState.LOADING);
    setErrorMessage(null);
    setLastConfig(params);

    try {
      const {objectUrl, blob, video} = await generateVideo(params);
      setVideoUrl(objectUrl);
      setLastVideoBlob(blob);
      setLastVideoObject(video);
      setAppState(AppState.SUCCESS);
    } catch (error: any) {
      setErrorMessage(error.message || 'An unknown error occurred.');
      setAppState(AppState.ERROR);
      if (error.message?.includes('API') || error.message?.includes('permission')) setShowApiKeyDialog(true);
    }
  }, []);

  const handleApiKeyDialogContinue = async () => {
    setShowApiKeyDialog(false);
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
  };

  const navItems = [
    { id: NavigationTab.INTELLIGENCE, icon: BrainCircuitIcon, label: 'Intelligence' },
    { id: NavigationTab.IMAGE, icon: ImageIcon, label: 'Image Lab' },
    { id: NavigationTab.VIDEO, icon: FilmIcon, label: 'Video Lab' },
    { id: NavigationTab.VOICE, icon: MicIcon, label: 'Voice Lab' },
    { id: NavigationTab.COURSE, icon: GraduationCapIcon, label: 'Course Studio' },
  ];

  return (
    <div className="h-screen bg-[#0a0a0b] text-gray-200 flex overflow-hidden font-sans">
      {showApiKeyDialog && <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />}
      
      {/* Sidebar Navigation */}
      <nav className="w-20 md:w-64 bg-[#111113] border-r border-gray-800 flex flex-col py-8 px-4 gap-2 transition-all">
        <div className="flex items-center gap-3 px-2 mb-10 overflow-hidden">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <LayoutGridIcon className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl hidden md:block tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Studio Pro</span>
        </div>

        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-4 px-3 py-3.5 rounded-xl transition-all group ${
              activeTab === item.id 
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
              : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
            }`}
          >
            <item.icon className={`w-6 h-6 shrink-0 transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="font-medium hidden md:block">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col relative overflow-y-auto overflow-x-hidden">
        <header className="py-6 px-10 flex items-center justify-between sticky top-0 bg-[#0a0a0b]/80 backdrop-blur-md z-20 border-b border-gray-900">
          <h2 className="text-2xl font-semibold tracking-tight">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono px-2 py-1 bg-gray-900 rounded border border-gray-800 text-gray-400">GEMINI 3.0 ECOSYSTEM</span>
          </div>
        </header>

        <div className="flex-grow p-4 md:p-10 max-w-6xl mx-auto w-full flex flex-col">
          {activeTab === NavigationTab.VIDEO && (
            <div className="flex-grow flex flex-col">
              {appState === AppState.IDLE ? (
                <div className="flex-grow flex flex-col">
                  <div className="text-center mb-10">
                    <h3 className="text-3xl font-bold mb-3">Cinematic Video Studio</h3>
                    <p className="text-gray-500 max-w-xl mx-auto">Create stunning visuals with Veo 3.1. Describe your scene, upload reference frames, or extend existing clips.</p>
                  </div>
                  <div className="mt-auto">
                    <PromptForm onGenerate={handleGenerate} initialValues={initialFormValues} />
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center">
                  {appState === AppState.LOADING && <LoadingIndicator />}
                  {appState === AppState.SUCCESS && videoUrl && (
                    <VideoResult
                      videoUrl={videoUrl}
                      onRetry={() => handleGenerate(lastConfig!)}
                      onNewVideo={() => {
                        setInitialFormValues(null);
                        setAppState(AppState.IDLE);
                      }}
                      onExtend={() => {
                        setInitialFormValues({
                          prompt: lastConfig?.prompt || '',
                          model: lastConfig?.model || VeoModel.VEO_FAST,
                          aspectRatio: lastConfig?.aspectRatio || AspectRatio.LANDSCAPE,
                          resolution: Resolution.P720,
                          mode: GenerationMode.EXTEND_VIDEO,
                          inputVideoObject: lastVideoObject,
                          inputVideoUrl: videoUrl,
                        });
                        setAppState(AppState.IDLE);
                      }} 
                      canExtend={lastConfig?.resolution === Resolution.P720}
                      aspectRatio={lastConfig?.aspectRatio || AspectRatio.LANDSCAPE}
                    />
                  )}
                  {appState === AppState.ERROR && (
                    <div className="text-center max-w-md bg-red-900/10 border border-red-500/20 p-10 rounded-3xl">
                      <p className="text-red-400 mb-6">{errorMessage}</p>
                      <button onClick={() => setAppState(AppState.IDLE)} className="px-8 py-3 bg-red-600 rounded-xl hover:bg-red-500 transition-colors font-bold">Try Again</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === NavigationTab.IMAGE && <ImageStudio />}
          {activeTab === NavigationTab.INTELLIGENCE && <IntelligenceLab />}
          {activeTab === NavigationTab.VOICE && <VoiceLab />}
          {activeTab === NavigationTab.COURSE && <CourseStudio />}
        </div>
      </main>
    </div>
  );
};

export default App;
