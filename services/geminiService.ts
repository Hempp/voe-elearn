
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  Video,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType,
  Type,
  Modality
} from '@google/genai';
import { GenerateVideoParams, GenerationMode, AspectRatio, ImageSize } from '../types';

export const generateVideo = async (
  params: GenerateVideoParams,
): Promise<{objectUrl: string; blob: Blob; uri: string; video: Video}> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const config: any = {
    numberOfVideos: 1,
    resolution: params.resolution,
  };

  if (params.mode !== GenerationMode.EXTEND_VIDEO) {
    config.aspectRatio = params.aspectRatio;
  }

  const generateVideoPayload: any = {
    model: params.model,
    config: config,
  };

  if (params.prompt) {
    generateVideoPayload.prompt = params.prompt;
  }

  if (params.mode === GenerationMode.FRAMES_TO_VIDEO) {
    if (params.startFrame) {
      generateVideoPayload.image = {
        imageBytes: params.startFrame.base64,
        mimeType: params.startFrame.file.type,
      };
    }

    const finalEndFrame = params.isLooping
      ? params.startFrame
      : params.endFrame;
    if (finalEndFrame) {
      generateVideoPayload.config.lastFrame = {
        imageBytes: finalEndFrame.base64,
        mimeType: finalEndFrame.file.type,
      };
    }
  } else if (params.mode === GenerationMode.REFERENCES_TO_VIDEO) {
    const referenceImagesPayload: VideoGenerationReferenceImage[] = [];

    if (params.referenceImages) {
      for (const img of params.referenceImages) {
        referenceImagesPayload.push({
          image: {
            imageBytes: img.base64,
            mimeType: img.file.type,
          },
          referenceType: VideoGenerationReferenceType.ASSET,
        });
      }
    }

    if (params.styleImage) {
      referenceImagesPayload.push({
        image: {
          imageBytes: params.styleImage.base64,
          mimeType: params.styleImage.file.type,
        },
        referenceType: VideoGenerationReferenceType.STYLE,
      });
    }

    if (referenceImagesPayload.length > 0) {
      generateVideoPayload.config.referenceImages = referenceImagesPayload;
    }
  } else if (params.mode === GenerationMode.EXTEND_VIDEO) {
    if (params.inputVideoObject) {
      // Standard extension using Veo's internal video reference
      generateVideoPayload.video = params.inputVideoObject;
    } else if (params.lastFrameFromVideo) {
      // Local file extension fallback: Start a new generation from the last frame of the upload
      generateVideoPayload.image = {
        imageBytes: params.lastFrameFromVideo,
        mimeType: 'image/png',
      };
      // For fallback mode, we must specify an aspect ratio
      generateVideoPayload.config.aspectRatio = params.aspectRatio;
    } else {
      throw new Error('An input video or extracted frame is required to extend.');
    }
  }

  let operation = await ai.models.generateVideos(generateVideoPayload);

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  if (operation?.response) {
    const videos = operation.response.generatedVideos;
    if (!videos || videos.length === 0) throw new Error('No videos generated.');

    const videoObject = videos[0].video;
    const url = decodeURIComponent(videoObject.uri);
    const res = await fetch(`${url}&key=${process.env.API_KEY}`);
    const videoBlob = await res.blob();
    return {objectUrl: URL.createObjectURL(videoBlob), blob: videoBlob, uri: url, video: videoObject};
  }
  throw new Error('Video generation failed.');
};

/** Educational Script Processor */
export const processCourseScript = async (script: string, level: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ 
      parts: [{ 
        text: `You are an expert e-learning director. 
        Take the following academic script intended for ${level} level and transform it into a highly detailed, cinematic, and professional visual prompt for a video generation AI (Veo).
        
        Focus on:
        1. Professional atmosphere (e.g., high-end laboratories, detailed astronomical vistas, or clean minimal modern graphics).
        2. Visual metaphors that help explain complex concepts.
        3. High production value lighting (e.g., cinematic rim lighting, 8k textures).
        4. NO text on screen (visual imagery only).
        
        OUTPUT ONLY THE VISUAL PROMPT.
        
        SCRIPT: ${script}` 
      }] 
    }]
  });
  return response.text || "A cinematic educational documentary scene.";
};

/** Image Generation & Editing */
export const generateImagePro = async (prompt: string, aspectRatio: AspectRatio, imageSize: ImageSize) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio, imageSize }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data in response");
};

export const editImageFlash = async (prompt: string, imageBase64: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: imageBase64, mimeType } },
        { text: prompt }
      ]
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image data in response");
};

/** Intelligence tools */
export const performChat = async (prompt: string, images: {data: string, mime: string}[], useThinking: boolean, useSearch: boolean, useMaps: boolean) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = useThinking ? 'gemini-3-pro-preview' : (useMaps ? 'gemini-2.5-flash' : 'gemini-3-flash-preview');
  
  const parts: any[] = [{ text: prompt }];
  images.forEach(img => parts.push({ inlineData: { data: img.data, mimeType: img.mime } }));

  const config: any = {};
  if (useThinking) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }
  
  const tools: any[] = [];
  if (useSearch) tools.push({ googleSearch: {} });
  if (useMaps) {
    tools.push({ googleMaps: {} });
    try {
      const pos: any = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      config.toolConfig = {
        retrievalConfig: {
          latLng: { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        }
      };
    } catch (e) { console.warn("Geo failed", e); }
  }
  
  if (tools.length > 0) config.tools = tools;

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config
  });

  const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const urls = grounding.map((c: any) => {
    if (c.web) return { uri: c.web.uri, title: c.web.title };
    if (c.maps) return { uri: c.maps.uri, title: c.maps.title };
    return null;
  }).filter(Boolean);

  return { text: response.text, urls };
};

/** Audio Tools */
export const transcribeAudio = async (base64: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType } },
        { text: "Transcribe the following audio precisely. Output only the text." }
      ]
    }
  });
  return response.text;
};

export const generateSpeech = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });

  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("No speech audio returned");
  return base64;
};
