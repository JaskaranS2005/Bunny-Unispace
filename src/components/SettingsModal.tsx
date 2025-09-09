import React, { useState } from 'react';
import { useApp, useTheme } from '../contexts/AppContext';
import { AI_SERVICES, aiServiceManager } from '../services/aiService';
import { toast } from 'react-hot-toast';
import './SettingsModal.css';
import Icon, { IconName } from './Icon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { connections, setConnection, removeConnection, clearHistory, resetAllSettings } = useApp();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('ai_services');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApiKeyChange = (serviceId: string, apiKey: string) => {
    setApiKeys(prev => ({ ...prev, [serviceId]: apiKey }));
  };

  const testConnection = async (serviceId: string, apiKey: string) => {
    if (!apiKey.trim()) { toast.error('Please enter an API key first'); return; }
    setTestingConnection(serviceId);
    try {
      const isValid = await aiServiceManager.testConnection(serviceId, apiKey);
      if (isValid) {
        setConnection(serviceId, { id: serviceId, status: 'connected', apiKey });
        toast.success(`Successfully connected to ${AI_SERVICES.find(s => s.id === serviceId)?.name}!`);
        setApiKeys(prev => ({ ...prev, [serviceId]: '' }));
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error: any) {
      toast.error(`Connection failed: ${error.message}`);
      setConnection(serviceId, { id: serviceId, status: 'error' });
    } finally {
      setTestingConnection(null);
    }
  };

  const disconnect = (serviceId: string) => {
    removeConnection(serviceId);
    toast.success(`Disconnected from ${AI_SERVICES.find(s => s.id === serviceId)?.name}`);
  };

  const handleExport = () => {
    const data = { connections, theme, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bunny-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported successfully!');
  };

  const handleClearHistory = () => {
    if (window.confirm('This will clear all your AI responses. Continue?')) {
      clearHistory();
    }
  };

  const handleReset = () => {
    if (window.confirm('This will disconnect all services and reset all settings. Continue?')) {
      resetAllSettings();
    }
  };

  const tabs = [
    { id: 'ai_services', name: 'AI Services', icon: 'FiCpu' },
    { id: 'appearance', name: 'Appearance', icon: 'FiSun' },
    { id: 'account', name: 'Account', icon: 'FiUser' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai_services':
        return (
          <div className="tab-content">
            <h3 className="tab-title">AI Services</h3>
            <p className="tab-description">Connect to your AI services using API keys. Your keys are stored securely in your browser.</p>
            <div className="services-list">
              {AI_SERVICES.map(service => {
                const connection = connections[service.id];
                const isConnected = connection?.status === 'connected';
                const isConnecting = testingConnection === service.id;
                const currentApiKey = apiKeys[service.id] || '';
                return (
                  <div key={service.id} className="service-config-card">
                    <div className="service-config-header">
                      <div className="service-config-info">
                        <Icon name={service.icon as IconName} className="service-config-icon" style={{ color: service.color }} />
                        <div>
                          <h4>{service.name}</h4>
                          <p>{service.provider}</p>
                        </div>
                      </div>
                      <div className="service-config-status">
                        {isConnected && (<span className="status-badge status-connected">Connected</span>)}
                        {connection?.status === 'error' && (<span className="status-badge status-error">Error</span>)}
                        {!connection && (<span className="status-badge status-disconnected">Not Connected</span>)}
                      </div>
                    </div>
                    <p className="service-config-description">{service.description}</p>
                    {!isConnected && (
                      <div className="api-key-form">
                        <div className="form-group">
                          <label className="form-label">API Key</label>
                          <input type="password" className="form-input" placeholder={`Enter your ${service.provider} API key`} value={currentApiKey} onChange={(e) => handleApiKeyChange(service.id, e.target.value)} disabled={isConnecting}/>
                          <div className="form-help">Get your API key from the {service.provider} developer console</div>
                        </div>
                        <div className="form-actions">
                          <button className="button button-primary" onClick={() => testConnection(service.id, currentApiKey)} disabled={!currentApiKey.trim() || isConnecting}>
                            {isConnecting ? (<><Icon name="FiRotateCw" className="animate-spin" /> Testing...</>) : (<><Icon name="FiLink" /> Connect</>)}
                          </button>
                        </div>
                      </div>
                    )}
                    {isConnected && (
                      <div className="connected-actions">
                        <button className="button button-danger" onClick={() => disconnect(service.id)}>
                           <Icon name="FiPower" /> Disconnect
                        </button>
                        <div className="connection-info">
                          <Icon name="FiCheckCircle" />
                          <small>Connected and ready to use</small>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="tab-content">
            <h3 className="tab-title">Appearance</h3>
            <p className="tab-description">Customize the look and feel of your BUNNY experience.</p>
            <div className="appearance-section">
              <h4>Theme</h4>
              <div className="theme-options">
                <button className={`theme-option-button ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
                  <span className="theme-icon"><Icon name="FiSun" /></span>
                  <div>
                    <div>Light Mode</div>
                    <small>Clean and bright interface</small>
                  </div>
                </button>
                <button className={`theme-option-button ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
                  <span className="theme-icon"><Icon name="FiMoon" /></span>
                  <div>
                    <div>Dark Mode</div>
                    <small>Easy on the eyes</small>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      case 'account':
        const connectedCount = Object.values(connections).filter(c => c.status === 'connected').length;
        return (
          <div className="tab-content">
            <h3 className="tab-title">Account</h3>
            <p className="tab-description">Manage your BUNNY settings and data.</p>
            <div className="account-section">
              <h4>Connected Services</h4>
              <div className="account-stats">
                <div className="stat-card">
                  <div className="stat-number">{connectedCount}</div>
                  <div className="stat-label">AI Services Connected</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{AI_SERVICES.length}</div>
                  <div className="stat-label">Total Services Available</div>
                </div>
              </div>
            </div>
            <div className="account-section">
              <h4>Data Management</h4>
              <div className="data-actions">
                <button className="button button-secondary" onClick={handleExport}>
                  <Icon name="FiDownload" /> Export Settings
                </button>
                <button className="button button-danger-outline" onClick={handleClearHistory}>
                  <Icon name="FiTrash2" /> Clear History
                </button>
                <button className="button button-danger-outline" onClick={handleReset}>
                  <Icon name="FiAlertTriangle" /> Reset All Settings
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="close-button" onClick={onClose}>
            <Icon name="FiX" />
          </button>
        </div>
        <div className="modal-body">
          <div className="settings-sidebar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon"><Icon name={tab.icon as IconName} /></span>
                <span className="tab-name">{tab.name}</span>
              </button>
            ))}
          </div>
          <div className="settings-content">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

