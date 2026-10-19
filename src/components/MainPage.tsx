import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AI_SERVICES, aiServiceManager, AIResponse } from '../services/aiService';
import { toast } from 'react-hot-toast';
import ResponseRenderer from './ResponseRenderer';
import Icon, { IconName } from './Icon';
import AgentThinking from './AgentThinking';

interface ChatResponse {
  id: string;
  content: string;
  service: string;
  loading: boolean;
  error?: string;
  timestamp?: Date;
  tokens?: number;
  serviceName?: string;
  serviceIcon?: string;
}

const MainPage: React.FC = () => {
  const { connections } = useApp();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState<Record<string, ChatResponse>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const connectedIds = AI_SERVICES
      .filter(service => connections[service.id]?.status === 'connected')
      .map(service => service.id);
    setSelectedServices(connectedIds);
  }, [connections]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const handleServiceToggle = (serviceId: string) => {
    if (connections[serviceId]?.status !== 'connected') {
      toast.error(`${AI_SERVICES.find(s => s.id === serviceId)?.name} is not connected.`);
      return;
    }
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); };
      reader.readAsDataURL(file);
    } else if (file) {
      toast.error('Please select a valid image file.');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) { fileInputRef.current.value = ""; }
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one AI service to prompt!');
      return;
    }
    if ((!prompt.trim() && !selectedImage) || isSubmitting) return;

    setIsSubmitting(true);
    const currentPrompt = prompt;
    const currentImage = selectedImage;
    setPrompt('');
    removeImage();

    const servicesToQuery = AI_SERVICES.filter(s => selectedServices.includes(s.id));
    
    const initialResponses: Record<string, ChatResponse> = {};
    servicesToQuery.forEach(service => {
      initialResponses[service.id] = { id: `${service.id}-${Date.now()}`, content: '', service: service.id, loading: true, serviceName: service.name, serviceIcon: service.icon };
    });
    setResponses(initialResponses);

    const promises = servicesToQuery.map(async (service) => {
      try {
        const connection = connections[service.id];
        if (!connection?.apiKey) throw new Error('API key not found');
        
        const response: AIResponse = await aiServiceManager.callAIService(service.id, currentPrompt, connection.apiKey, connection.model, currentImage);
        
        setResponses(prev => ({...prev, [service.id]: {...prev[service.id], content: response.content, loading: false, timestamp: response.timestamp, tokens: response.tokens }}));
        if ('vibrate' in navigator) navigator.vibrate(50);
      } catch (error: any) {
        setResponses(prev => ({...prev, [service.id]: {...prev[service.id], content: '', loading: false, error: error.message }}));
        toast.error(`${service.name}: ${error.message}`);
      }
    });

    await Promise.allSettled(promises);
    setIsSubmitting(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = async (text: string, serviceName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${serviceName} response copied!`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const hasResponses = Object.keys(responses).length > 0;
  const selectedServiceNames = AI_SERVICES
      .filter(s => selectedServices.includes(s.id))
      .map(s => s.name)
      .join(', ');

  return (
    <div className="main-page-layout">
      <section className="ai-selection-bar">
        {AI_SERVICES.map(service => {
          const isConnected = connections[service.id]?.status === 'connected';
          const isSelected = selectedServices.includes(service.id);
          return (
            <button
              type="button"
              key={service.id}
              className={`ai-selection-pill ${isConnected ? 'connected' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleServiceToggle(service.id)}
              aria-pressed={isSelected}
              aria-label={`${service.name} ${isConnected ? (isSelected ? 'selected' : 'not selected') : 'not connected'}`}
            >
              <Icon name={service.icon as IconName} />
              <span>{service.name}</span>
              <span className="status-dot" aria-hidden="true"></span>
            </button>
          );
        })}
      </section>

      <main className="content-area">
        {!hasResponses ? (
          <div className="welcome-message">
          
            <h1>How can I help you today?</h1>
          </div>
        ) : (
          <div className="responses-container">
            {Object.values(responses).map((response) => {
              const service = AI_SERVICES.find(s => s.id === response.service);

              // ✨ THIS IS THE FIX: Check if service exists before rendering
              if (!service) {
                return null; // Or render an error state for this column
              }

              return (
                <div key={response.id} className="response-column"> 
                  <div className="response-header">
                    <div className="response-service" style={{ color: service.color }}>
                      <Icon name={service.icon as IconName} />
                      <span>{service.name}</span>
                    </div>
                    <span className={`response-state ${response.loading ? 'is-thinking' : ''}`}>
                      <span className="response-state-dot" aria-hidden="true"></span>
                      {response.loading ? 'Thinking' : response.error ? 'Needs attention' : 'Ready'}
                    </span>
                  </div>
                  <div className="response-content">
                    {response.loading && (
                      <div className="response-loading">
                        <AgentThinking serviceName={service.name} />
                        <div className="response-skeleton" aria-hidden="true">
                          <span className="response-skeleton-line"></span>
                          <span className="response-skeleton-line"></span>
                          <span className="response-skeleton-line"></span>
                        </div>
                      </div>
                    )}
                    {response.error && (
                      <div className="response-error" role="alert">
                        <p>Unable to complete this response.</p>
                        <small>{response.error}</small>
                      </div>
                    )}
                    
                    {response.content && !response.loading && (
                      <div className="response-body">
                        <button 
                          className="response-action" 
                          onClick={() => copyToClipboard(response.content, service.name)} 
                          title="Copy response"
                          aria-label={`Copy ${service.name} response`}
                        >
                          <Icon name="FiCopy"/>
                        </button>
                        <div className="response-text">
                          <ResponseRenderer content={response.content} serviceName={service.name} serviceIcon={service.icon} />
                          {response.tokens && (
                            <div className="response-meta">
                              <small>Tokens used: {response.tokens}</small>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="prompt-board">
        <div className="prompt-container">
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Selected preview" />
              <button className="remove-image-button" onClick={removeImage} aria-label="Remove attached image">×</button>
            </div>
          )}
          <div className="prompt-input-wrapper">
            <button className="action-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach an image">
              <Icon name="FiImage" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            <textarea
              ref={textareaRef}
              className="prompt-input"
              placeholder={`Ask ${selectedServiceNames || 'a selected AI'}...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isSubmitting}
            />
            <button 
              className="submit-button" 
              onClick={handleSubmit} 
              disabled={(!prompt.trim() && !selectedImage) || isSubmitting || selectedServices.length === 0}
              aria-label={isSubmitting ? 'Sending prompt' : 'Send prompt'}
            >
              {isSubmitting ? <Icon name="FiLoader" className="spinner"/> : <Icon name="FiArrowUp"/>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;