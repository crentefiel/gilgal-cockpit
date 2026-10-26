/// <reference types="vite/client" />

type FusionRequest = {
  baseUrl: string;
  apiKey: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  fusion: {
    k?: number;
    models?: string[];
    judge?: string;
    strategy?: 'synthesize' | 'best_of';
    expose_panel: true;
  };
};

type FusionResponse = {
  content: string;
  route?: string;
  summary?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
};

interface Window {
  gilgalDesktop?: { isDesktop: true };
  gilgalFusion?: {
    review(request: FusionRequest): Promise<FusionResponse>;
  };
}
