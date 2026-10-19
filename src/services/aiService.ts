import axios from 'axios';

export interface AIService {
  id: string;
  name: string;
  provider: string;
  icon: string;
  color: string;
  description: string;
  loginMethods: string[];
  apiEndpoint: string;
  website: string;
  supportsImages?: boolean;
}

export interface AIResponse {
  content: string;
  service: string;
  timestamp: Date;
  tokens?: number;
  model?: string;
}

export interface ServiceConnectionLabel {
  nickname?: string;
}

export const getServiceDisplayName = (
  service: AIService,
  connection?: ServiceConnectionLabel,
) => connection?.nickname?.trim() || service.name;

export const AI_SERVICES: AIService[] = [
  {
    id: 'openai',
    name: 'ChatGPT',
    provider: 'OpenAI',
    icon: 'FiCpu',
    color: '#D95B93',
    description: 'OpenAI models through the Chat Completions API.',
    loginMethods: ['api_key'],
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    website: 'https://platform.openai.com/',
  },
  {
    id: 'anthropic',
    name: 'Claude',
    provider: 'Anthropic',
    icon: 'FiMessageSquare',
    color: '#D95B93',
    description: 'Anthropic models through the Messages API.',
    loginMethods: ['api_key'],
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    website: 'https://console.anthropic.com/',
  },
  {
    id: 'google',
    name: 'Gemini',
    provider: 'Google AI Studio',
    icon: 'FiZap',
    color: '#D95B93',
    description: 'Gemini models with text and image prompting.',
    loginMethods: ['api_key'],
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/:model:generateContent',
    website: 'https://aistudio.google.com/',
    supportsImages: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    provider: 'Groq Cloud',
    icon: 'FiFastForward',
    color: '#D95B93',
    description: 'Fast open-model inference through an OpenAI-compatible API.',
    loginMethods: ['api_key'],
    apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    website: 'https://console.groq.com/',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    provider: 'OpenRouter',
    icon: 'FiGitBranch',
    color: '#D95B93',
    description: 'One key for a broad catalogue of routed and free open models.',
    loginMethods: ['api_key'],
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    website: 'https://openrouter.ai/',
  },
  {
    id: 'requesty',
    name: 'Requesty',
    provider: 'Requesty',
    icon: 'FiLayers',
    color: '#D95B93',
    description: 'OpenAI-compatible routing for models and fallback policies.',
    loginMethods: ['api_key'],
    apiEndpoint: 'https://router.requesty.ai/v1/chat/completions',
    website: 'https://www.requesty.ai/free-models',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    provider: 'Mistral AI',
    icon: 'FiWind',
    color: '#D95B93',
    description: 'Mistral chat models through the native completion API.',
    loginMethods: ['api_key'],
    apiEndpoint: 'https://api.mistral.ai/v1/chat/completions',
    website: 'https://console.mistral.ai/',
  },
];

export const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  google: 'gemini-1.5-flash',
  groq: 'llama3-8b-8192',
  openrouter: 'mistralai/mistral-7b-instruct:free',
  requesty: 'openai/gpt-4o-mini',
  mistral: 'mistral-small-latest',
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

const asText = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(part => typeof part === 'string' ? part : (part as { text?: string }).text || '')
      .join('');
  }
  return 'No response';
};

const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message || error.message;
  }
  return error instanceof Error ? error.message : 'Request failed.';
};

class AIServiceManager {
  private static instance: AIServiceManager;

  public static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager();
    }
    return AIServiceManager.instance;
  }

  private async callOpenAICompatible(
    serviceId: string,
    endpoint: string,
    prompt: string,
    apiKey: string,
    model: string,
    extraHeaders: Record<string, string> = {},
  ): Promise<AIResponse> {
    try {
      const response = await axios.post(
        endpoint,
        {
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...extraHeaders,
          },
        },
      );
      return {
        content: asText(response.data.choices?.[0]?.message?.content),
        service: serviceId,
        timestamp: new Date(),
        tokens: response.data.usage?.total_tokens,
        model: response.data.model || model,
      };
    } catch (error: unknown) {
      throw new Error(`${serviceId} error: ${errorMessage(error)}`);
    }
  }

  async callAnthropic(prompt: string, apiKey: string, model: string): Promise<AIResponse> {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
        },
      );
      return {
        content: asText(response.data.content?.[0]?.text),
        service: 'anthropic',
        timestamp: new Date(),
        tokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
        model: response.data.model || model,
      };
    } catch (error: unknown) {
      throw new Error(`Claude error: ${errorMessage(error)}`);
    }
  }

  async callGoogle(prompt: string, apiKey: string, model: string, image: File | null = null): Promise<AIResponse> {
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (image) {
      try {
        parts.push({ inline_data: { mime_type: image.type, data: await fileToBase64(image) } });
      } catch {
        throw new Error('Failed to process the image file.');
      }
    }

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { contents: [{ parts }], generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } },
        { headers: { 'Content-Type': 'application/json' } },
      );
      return {
        content: asText(response.data.candidates?.[0]?.content?.parts?.[0]?.text),
        service: 'google',
        timestamp: new Date(),
        tokens: response.data.usageMetadata?.totalTokenCount,
        model,
      };
    } catch (error: unknown) {
      throw new Error(`Gemini error: ${errorMessage(error)}`);
    }
  }

  async callAIService(
    serviceId: string,
    prompt: string,
    apiKey: string,
    model?: string,
    image: File | null = null,
  ): Promise<AIResponse> {
    const serviceModel = model || DEFAULT_MODELS[serviceId];
    switch (serviceId) {
      case 'openai':
        return this.callOpenAICompatible(serviceId, 'https://api.openai.com/v1/chat/completions', prompt, apiKey, serviceModel);
      case 'anthropic':
        return this.callAnthropic(prompt, apiKey, serviceModel);
      case 'google':
        return this.callGoogle(prompt, apiKey, serviceModel, image);
      case 'groq':
        return this.callOpenAICompatible(serviceId, 'https://api.groq.com/openai/v1/chat/completions', prompt, apiKey, serviceModel);
      case 'openrouter':
        return this.callOpenAICompatible(serviceId, 'https://openrouter.ai/api/v1/chat/completions', prompt, apiKey, serviceModel, { 'X-Title': 'Bunny Unispace' });
      case 'requesty':
        return this.callOpenAICompatible(serviceId, 'https://router.requesty.ai/v1/chat/completions', prompt, apiKey, serviceModel, { 'X-Title': 'Bunny Unispace' });
      case 'mistral':
        return this.callOpenAICompatible(serviceId, 'https://api.mistral.ai/v1/chat/completions', prompt, apiKey, serviceModel);
      default:
        throw new Error(`Unsupported AI service: ${serviceId}`);
    }
  }
}

export const aiServiceManager = AIServiceManager.getInstance();
