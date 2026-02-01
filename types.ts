
export interface KeywordMetadata {
  word: string;
  relevance: number; // 1-100
  platforms: ('Adobe Stock' | 'Shutterstock' | 'Freepik')[];
}

export interface BatchItem {
  id: string;
  image: string; // base64
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: AnalysisResult;
  error?: string;
}

export interface AnalysisResult {
  taglines: string[];
  keywords: KeywordMetadata[];
  description: string;
  suggestedPlatforms: string[];
}

export interface GeminiResponse {
  taglines: string[];
  keywords: {
    word: string;
    relevance: number;
    platforms: ('Adobe Stock' | 'Shutterstock' | 'Freepik')[];
  }[];
  description: string;
  platforms: string[];
}
