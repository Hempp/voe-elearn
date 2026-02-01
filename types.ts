
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video} from '@google/genai';

export enum AppState {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export enum NavigationTab {
  VIDEO = 'Video Lab',
  IMAGE = 'Image Lab',
  VOICE = 'Voice Lab',
  INTELLIGENCE = 'Intelligence Lab',
  COURSE = 'Course Studio',
}

export enum VeoModel {
  VEO_FAST = 'veo-3.1-fast-generate-preview',
  VEO = 'veo-3.1-generate-preview',
}

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  TWO_THREE = '2:3',
  THREE_TWO = '3:2',
  THREE_FOUR = '3:4',
  FOUR_THREE = '4:3',
  ULTRAWIDE = '21:9',
}

export enum ImageSize {
  K1 = '1K',
  K2 = '2K',
  K4 = '4K',
}

export enum Resolution {
  P720 = '720p',
  P1080 = '1080p',
  P4K = '4k',
}

export enum GenerationMode {
  TEXT_TO_VIDEO = 'Text to Video',
  FRAMES_TO_VIDEO = 'Frames to Video',
  REFERENCES_TO_VIDEO = 'References to Video',
  EXTEND_VIDEO = 'Extend Video',
}

export interface ImageFile {
  file: File;
  base64: string;
}

export interface VideoFile {
  file: File;
  base64: string;
}

export interface AudioFile {
  file: File;
  base64: string;
}

export interface GenerateVideoParams {
  prompt: string;
  model: VeoModel;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  mode: GenerationMode;
  startFrame?: ImageFile | null;
  endFrame?: ImageFile | null;
  referenceImages?: ImageFile[];
  styleImage?: ImageFile | null;
  inputVideo?: VideoFile | null;
  inputVideoObject?: Video | null;
  inputVideoUrl?: string | null; // For previewing generated videos in Extend mode
  lastFrameFromVideo?: string | null;
  isLooping?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  images?: string[];
  groundingUrls?: {uri: string; title: string}[];
  isThinking?: boolean;
}
