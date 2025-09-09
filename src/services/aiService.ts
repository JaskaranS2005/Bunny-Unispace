import axios from 'axios';

export interface AIService {
  id: string;
  name: string;
  provider: string;
  icon: string;
  color: string;
  description: string;
  loginMethods: string[];
  apiEndpoint?: string;
}

export interface AIResponse {
  content: string;
  service: string;
  timestamp: Date;
  tokens?: number;
  model?: string;
}

export const AI_SERVICES: AIService[] = [
  {
    id: 'openai',
    name: 'ChatGPT',
    provider: 'OpenAI',
    icon: 'FiCpu',
    color: '#00A67E',
    description: "OpenAI's ChatGPT with GPT-4 access",
    loginMethods: ['api_key'],
  },
  {
    id: 'anthropic',
    name: 'Claude',
    provider: 'Anthropic',
    icon: 'FiMessageSquare',
    color: '#CC785C',
    description: "Anthropic's Claude with advanced reasoning",
    loginMethods: ['api_key'],
  },
  {
    id: 'google',
    name: 'Gemini',
    provider: 'Google',
    icon: 'FiZap',
    color: '#4285F4',
    description: "Google's Gemini Pro multimodal AI",
    loginMethods: ['api_key'],
  },
  {
    id: 'groq',
    name: 'Groq',
    provider: 'Groq',
    icon: 'FiFastForward',
    color: '#F55036',
    description: 'Ultra-fast inference with Groq LPU',
    loginMethods: ['api_key'],
  }
];

export const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  google: 'gemini-1.5-flash',
  groq: 'llama3-8b-8192'
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });

class AIServiceManager {
  private static instance: AIServiceManager;

  public static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager();
    }
    return AIServiceManager.instance;
  }

  async callOpenAI(prompt: string, apiKey: string, model: string): Promise<AIResponse> {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', { model, messages: [{ role: 'user', content: prompt }], max_tokens: 2048, temperature: 0.7 }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }});
      return { content: response.data.choices[0]?.message?.content || 'No response', service: 'openai', timestamp: new Date(), tokens: response.data.usage?.total_tokens, model: response.data.model };
    } catch (error: any) { throw new Error(`OpenAI Error: ${error.response?.data?.error?.message || error.message}`); }
  }

  async callAnthropic(prompt: string, apiKey: string, model: string): Promise<AIResponse> {
    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', { model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }, { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' }});
      return { content: response.data.content[0]?.text || 'No response', service: 'anthropic', timestamp: new Date(), tokens: response.data.usage?.input_tokens + response.data.usage?.output_tokens, model: response.data.model };
    } catch (error: any) { throw new Error(`Claude Error: ${error.response?.data?.error?.message || error.message}`); }
  }

  async callGoogle(prompt: string, apiKey: string, model: string, image: File | null = null): Promise<AIResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const parts: any[] = [{ text: prompt }];

    if (image) {
        try {
            const base64Data = await fileToBase64(image);
            parts.push({ inline_data: { mime_type: image.type, data: base64Data } });
        } catch (error) {
            throw new Error('Failed to process image file.');
        }
    }
    
    try {
        const payload = { contents: [{ parts }], generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } };
        const response = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }});
        const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        return { content, service: 'google', timestamp: new Date(), tokens: response.data.usageMetadata?.totalTokenCount, model };
    } catch (error: any) { throw new Error(`Gemini Error: ${error.response?.data?.error?.message || error.message}`); }
  }

  async callGroq(prompt: string, apiKey: string, model: string): Promise<AIResponse> {
    try {//https://api.groq.com/openai/v1/chat/completions'
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', { model, messages: [{ role: 'user', content: prompt }], max_tokens: 2048, temperature: 0.7 }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }});
      return { content: response.data.choices[0]?.message?.content || 'No response', service: 'groq', timestamp: new Date(), tokens: response.data.usage?.total_tokens, model: response.data.model };
    } catch (error: any) { throw new Error(`Groq Error: ${error.response?.data?.error?.message || error.message}`); }
  }

  async callAIService(serviceId: string, prompt: string, apiKey: string, model?: string, image: File | null = null): Promise<AIResponse> {
    const serviceModel = model || DEFAULT_MODELS[serviceId as keyof typeof DEFAULT_MODELS];
    switch (serviceId) {
      case 'openai': return this.callOpenAI(prompt, apiKey, serviceModel);
      case 'anthropic': return this.callAnthropic(prompt, apiKey, serviceModel);
      case 'google': return this.callGoogle(prompt, apiKey, serviceModel, image);
      case 'groq': return this.callGroq(prompt, apiKey, serviceModel);
      default: throw new Error(`Unsupported AI service: ${serviceId}`);
    }
  }

  async testConnection(serviceId: string, apiKey: string, model: string): Promise<boolean> {
    try {
      const testPrompt = "Hello";
      await this.callAIService(serviceId, testPrompt, apiKey, model);
      return true;
    } catch (error) {
      console.error(`Connection test failed for ${serviceId}:`, error);
      return false;
    }
  }
}

export const aiServiceManager = AIServiceManager.getInstance();