import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AI_SERVICES, DEFAULT_MODELS, getServiceDisplayName } from '../services/aiService';
import Icon, { IconName } from './Icon';
import { toast } from 'react-hot-toast';
import { triggerHaptic } from '../utils/feedback';

interface ProviderDraft {
  apiKey: string;
  model: string;
  nickname: string;
}

const SettingsPage: React.FC = () => {
  const { connections, setConnection, removeConnection } = useApp();
  const [drafts, setDrafts] = useState<Record<string, ProviderDraft>>({});

  const getDraft = (serviceId: string): ProviderDraft => {
    const connection = connections[serviceId];
    return drafts[serviceId] || {
      apiKey: '',
      model: connection?.model || DEFAULT_MODELS[serviceId],
      nickname: connection?.nickname || '',
    };
  };

  const updateDraft = (serviceId: string, field: keyof ProviderDraft, value: string) => {
    setDrafts(previous => ({
      ...previous,
      [serviceId]: { ...getDraft(serviceId), [field]: value },
    }));
  };

  const saveProvider = (serviceId: string) => {
    triggerHaptic();
    const service = AI_SERVICES.find(item => item.id === serviceId);
    const connection = connections[serviceId];
    const draft = getDraft(serviceId);
    const apiKey = draft.apiKey.trim() || connection?.apiKey;

    if (!apiKey) {
      toast.error('Enter an API key to save this provider.');
      return;
    }

    setConnection(serviceId, {
      id: serviceId,
      status: 'connected',
      apiKey,
      model: draft.model.trim() || DEFAULT_MODELS[serviceId],
      nickname: draft.nickname.trim(),
    });
    setDrafts(previous => ({
      ...previous,
      [serviceId]: { ...draft, apiKey: '' },
    }));
    toast.success(getServiceDisplayName(service!, { nickname: draft.nickname }) + ' is ready for this browser session.');
  };

  const disconnectProvider = (serviceId: string) => {
    triggerHaptic();
    const service = AI_SERVICES.find(item => item.id === serviceId);
    removeConnection(serviceId);
    setDrafts(previous => ({ ...previous, [serviceId]: { apiKey: '', model: DEFAULT_MODELS[serviceId], nickname: '' } }));
    toast.success((service?.name || 'Provider') + ' removed.');
  };

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <header className="settings-intro">
        <div>
          <h1 id="settings-title">Providers</h1>
          <p>Add the models you want to compare. Each provider can have its own model name and nickname.</p>
        </div>
        <div className="security-note" role="note">
          <Icon name="FiShield" aria-hidden="true" />
          <span>Keys are kept only for this browser session and are never sent for validation when you save.</span>
        </div>
      </header>

      <div className="provider-list">
        {AI_SERVICES.map(service => {
          const connection = connections[service.id];
          const draft = getDraft(service.id);
          const isConnected = connection?.status === 'connected';
          const displayName = getServiceDisplayName(service, connection);

          return (
            <article key={service.id} className="provider-row">
              <div className="provider-overview">
                <Icon name={service.icon as IconName} size={20} aria-hidden="true" />
                <div>
                  <h2>{displayName}</h2>
                  <p>{service.description}</p>
                </div>
                <span className={'connection-state ' + (isConnected ? 'connected' : '')}>
                  {isConnected ? 'Ready' : 'Not connected'}
                </span>
              </div>

              <div className="provider-form">
                <label>
                  <span>Nickname</span>
                  <input
                    type="text"
                    value={draft.nickname}
                    onChange={event => updateDraft(service.id, 'nickname', event.target.value)}
                    placeholder={service.name}
                    maxLength={32}
                  />
                </label>
                <label>
                  <span>Model</span>
                  <input
                    type="text"
                    value={draft.model}
                    onChange={event => updateDraft(service.id, 'model', event.target.value)}
                    placeholder={DEFAULT_MODELS[service.id]}
                    spellCheck="false"
                  />
                </label>
                <label className="api-key-field">
                  <span>{isConnected ? 'Replace API key' : 'API key'}</span>
                  <input
                    type="password"
                    value={draft.apiKey}
                    onChange={event => updateDraft(service.id, 'apiKey', event.target.value)}
                    placeholder={isConnected ? 'Stored for this session' : 'Paste your API key'}
                    autoComplete="off"
                    spellCheck="false"
                  />
                </label>
                <div className="provider-actions">
                  <a href={service.website} target="_blank" rel="noreferrer" className="endpoint-link">
                    <Icon name="FiExternalLink" aria-hidden="true" /> Get a key
                  </a>
                  {isConnected && (
                    <button type="button" className="button-secondary" onClick={() => disconnectProvider(service.id)}>
                      Remove
                    </button>
                  )}
                  <button type="button" className="button-primary" onClick={() => saveProvider(service.id)}>
                    {isConnected ? 'Save changes' : 'Save provider'}
                  </button>
                </div>
                <p className="endpoint-note">Endpoint: {service.apiEndpoint}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default SettingsPage;
