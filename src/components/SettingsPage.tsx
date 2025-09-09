import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AI_SERVICES, aiServiceManager, DEFAULT_MODELS } from '../services/aiService';
import Icon, { IconName } from './Icon';
import { toast } from 'react-hot-toast';
import { triggerHaptic } from '../utils/feedback';

const SettingsPage: React.FC = () => {
  const { connections, setConnection, removeConnection } = useApp();
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [modelNames, setModelNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleApiKeyChange = (serviceId: string, key: string) => {
    setApiKeys(prev => ({ ...prev, [serviceId]: key }));
  };

  const handleModelNameChange = (serviceId: string, name: string) => {
    setModelNames(prev => ({ ...prev, [serviceId]: name }));
  };

  const handleConnect = async (serviceId: string) => {
    triggerHaptic();
    const apiKey = apiKeys[serviceId];
    if (!apiKey) {
      toast.error('Please enter an API key.');
      return;
    }
    
    const model = modelNames[serviceId] || DEFAULT_MODELS[serviceId as keyof typeof DEFAULT_MODELS];
    
    setLoading(prev => ({ ...prev, [serviceId]: true }));
    const isConnected = await aiServiceManager.testConnection(serviceId, apiKey, model);
    setLoading(prev => ({ ...prev, [serviceId]: false }));

    const serviceName = AI_SERVICES.find(s => s.id === serviceId)?.name || 'Service';

    if (isConnected) {
      setConnection(serviceId, { id: serviceId, status: 'connected', apiKey, model });
      toast.success(`${serviceName} connected!`);
    } else {
      setConnection(serviceId, { id: serviceId, status: 'error' });
      toast.error(`Failed to connect to ${serviceName}. Check API key and model name.`);
    }
  };

  const handleDisconnect = (serviceId: string) => {
    triggerHaptic();
    const serviceName = AI_SERVICES.find(s => s.id === serviceId)?.name || 'Service';
    removeConnection(serviceId);
    setApiKeys(prev => ({ ...prev, [serviceId]: '' }));
    setModelNames(prev => ({ ...prev, [serviceId]: '' }));
    toast.success(`${serviceName} disconnected.`);
  };

  return (
    <div className="settings-page">
      <h2>AI Service Connections</h2>
      <p>Connect your services by providing an API key and optionally a custom model name.</p>
      <div className="settings-grid">
        {AI_SERVICES.map(service => {
          const connection = connections[service.id];
          const isConnected = connection?.status === 'connected';
          return (
            <div key={service.id} className={`settings-card ${isConnected ? 'connected' : ''}`}>
              <div className="settings-card-header">
                <Icon name={service.icon as IconName} style={{ color: service.color }} size={24}/>
                <h3>{service.name}</h3>
                <span className={`status-badge ${connection?.status || 'disconnected'}`}>
                  {connection?.status || 'disconnected'}
                </span>
              </div>
              <p>{service.description}</p>
              <div className="api-key-input-group">
                <input
                  type="password"
                  placeholder="API Key"
                  value={apiKeys[service.id] || ''}
                  onChange={(e) => handleApiKeyChange(service.id, e.target.value)}
                  disabled={isConnected}
                />
                <input
                  type="text"
                  placeholder={`Model (e.g., ${DEFAULT_MODELS[service.id as keyof typeof DEFAULT_MODELS]})`}
                  value={modelNames[service.id] || (isConnected ? connection?.model : '') || ''}
                  onChange={(e) => handleModelNameChange(service.id, e.target.value)}
                  disabled={isConnected}
                  className="model-input"
                />
                {isConnected ? (
                  <button className="button-disconnect" onClick={() => handleDisconnect(service.id)}>
                    Disconnect
                  </button>
                ) : (
                  <button className="button-connect" onClick={() => handleConnect(service.id)} disabled={loading[service.id]}>
                    {loading[service.id] ? 'Testing...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsPage;