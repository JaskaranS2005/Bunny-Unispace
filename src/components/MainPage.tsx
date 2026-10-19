import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AI_SERVICES, aiServiceManager, AIResponse, getServiceDisplayName } from '../services/aiService';
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
}

const EXAMPLE_PROMPTS = [
  'Compare the best study plan for a calculus exam next week.',
  'Explain this concept with an example I can remember.',
  'Turn these notes into a clear project plan.',
];

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
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
  }, [prompt]);

  const labelFor = (serviceId: string) => {
    const service = AI_SERVICES.find(item => item.id === serviceId);
    return service ? getServiceDisplayName(service, connections[serviceId]) : 'Provider';
  };

  const handleServiceToggle = (serviceId: string) => {
    if (connections[serviceId]?.status !== 'connected') {
      toast.error(labelFor(serviceId) + ' is not connected yet.');
      return;
    }
    setSelectedServices(previous => (
      previous.includes(serviceId)
        ? previous.filter(id => id !== serviceId)
        : [...previous, serviceId]
    ));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file) {
      toast.error('Please select a valid image file.');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      toast.error('Select at least one connected provider.');
      return;
    }
    if ((!prompt.trim() && !selectedImage) || isSubmitting) return;

    setIsSubmitting(true);
    const currentPrompt = prompt;
    const currentImage = selectedImage;
    setPrompt('');
    removeImage();

    const servicesToQuery = AI_SERVICES.filter(service => selectedServices.includes(service.id));
    const initialResponses = Object.fromEntries(
      servicesToQuery.map(service => [
        service.id,
        { id: service.id + '-' + Date.now(), content: '', service: service.id, loading: true },
      ]),
    ) as Record<string, ChatResponse>;
    setResponses(initialResponses);

    const requests = servicesToQuery.map(async service => {
      try {
        const connection = connections[service.id];
        if (!connection?.apiKey) throw new Error('The session key is unavailable. Add it again in Settings.');

        const response: AIResponse = await aiServiceManager.callAIService(
          service.id,
          currentPrompt,
          connection.apiKey,
          connection.model,
          currentImage,
        );
        setResponses(previous => ({
          ...previous,
          [service.id]: {
            ...previous[service.id],
            content: response.content,
            loading: false,
            timestamp: response.timestamp,
            tokens: response.tokens,
          },
        }));
        if ('vibrate' in navigator) navigator.vibrate(50);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Request failed.';
        setResponses(previous => ({
          ...previous,
          [service.id]: { ...previous[service.id], content: '', loading: false, error: message },
        }));
        toast.error(labelFor(service.id) + ': ' + message);
      }
    });

    await Promise.allSettled(requests);
    setIsSubmitting(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const applyExample = (example: string) => {
    setPrompt(example);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const copyToClipboard = async (text: string, serviceName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(serviceName + ' response copied.');
    } catch {
      toast.error('Failed to copy the response.');
    }
  };

  const hasResponses = Object.keys(responses).length > 0;
  const selectedServiceNames = AI_SERVICES
    .filter(service => selectedServices.includes(service.id))
    .map(service => getServiceDisplayName(service, connections[service.id]))
    .join(', ');

  return (
    <div className="main-page-layout">
      <section className="ai-selection-bar" aria-label="Choose providers for this comparison">
        {AI_SERVICES.map(service => {
          const isConnected = connections[service.id]?.status === 'connected';
          const isSelected = selectedServices.includes(service.id);
          const displayName = getServiceDisplayName(service, connections[service.id]);
          return (
            <button
              type="button"
              key={service.id}
              className={'ai-selection-pill ' + (isConnected ? 'connected ' : '') + (isSelected ? 'selected' : '')}
              onClick={() => handleServiceToggle(service.id)}
              aria-pressed={isSelected}
              aria-label={displayName + (isConnected ? (isSelected ? ' selected' : ' not selected') : ' not connected')}
            >
              <Icon name={service.icon as IconName} aria-hidden="true" />
              <span>{displayName}</span>
              <span className="status-dot" aria-hidden="true"></span>
            </button>
          );
        })}
      </section>

      <p className="comparison-status" aria-live="polite">
        {selectedServices.length
          ? selectedServices.length + ' provider' + (selectedServices.length === 1 ? '' : 's') + ' selected'
          : 'Choose a provider to begin'}
      </p>

      <main className="content-area">
        {!hasResponses ? (
          <section className="welcome-message" aria-labelledby="workspace-title">
            <h1 id="workspace-title">Ask once. Compare what matters.</h1>
            <p>Send one prompt to your selected AI providers, then keep the answer that earns your trust.</p>
            <div className="example-prompts" aria-label="Example prompts">
              {EXAMPLE_PROMPTS.map(example => (
                <button type="button" key={example} onClick={() => applyExample(example)}>
                  {example}
                </button>
              ))}
            </div>
            <button type="button" className="empty-primary-action" onClick={() => textareaRef.current?.focus()}>
              Write a prompt <Icon name="FiArrowDown" aria-hidden="true" />
            </button>
          </section>
        ) : (
          <div className="responses-container">
            {Object.values(responses).map(response => {
              const service = AI_SERVICES.find(item => item.id === response.service);
              if (!service) return null;
              const serviceName = getServiceDisplayName(service, connections[service.id]);

              return (
                <article key={response.id} className="response-column" aria-label={serviceName + ' response'}>
                  <div className="response-header">
                    <div className="response-service">
                      <Icon name={service.icon as IconName} aria-hidden="true" />
                      <span>{serviceName}</span>
                    </div>
                    <span className={'response-state ' + (response.loading ? 'is-thinking' : '')}>
                      <span className="response-state-dot" aria-hidden="true"></span>
                      {response.loading ? 'Thinking' : response.error ? 'Needs attention' : 'Ready'}
                    </span>
                  </div>
                  <div className="response-content">
                    {response.loading && (
                      <div className="response-loading">
                        <AgentThinking serviceName={serviceName} />
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
                          onClick={() => copyToClipboard(response.content, serviceName)}
                          title="Copy response"
                          aria-label={'Copy ' + serviceName + ' response'}
                        >
                          <Icon name="FiCopy" aria-hidden="true" />
                          <span>Copy</span>
                        </button>
                        <div className="response-text">
                          <ResponseRenderer content={response.content} serviceName={serviceName} serviceIcon={service.icon} />
                          {response.tokens && <div className="response-meta">Tokens used: {response.tokens}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <div className="prompt-board">
        <div className="prompt-container">
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Selected image preview" />
              <button className="remove-image-button" onClick={removeImage} aria-label="Remove attached image">
                <Icon name="FiX" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="prompt-input-wrapper">
            <button type="button" className="action-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach an image">
              <Icon name="FiImage" aria-hidden="true" />
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*" hidden />
            <textarea
              ref={textareaRef}
              className="prompt-input"
              placeholder={'Ask ' + (selectedServiceNames || 'a selected AI') + '...'}
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="submit-button"
              onClick={handleSubmit}
              disabled={(!prompt.trim() && !selectedImage) || isSubmitting || selectedServices.length === 0}
              aria-label={isSubmitting ? 'Sending prompt' : 'Send prompt'}
            >
              <Icon name={isSubmitting ? 'FiLoader' : 'FiArrowUp'} className={isSubmitting ? 'spinner' : ''} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
