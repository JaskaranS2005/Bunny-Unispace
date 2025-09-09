import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppProviders, useApp, useTheme } from './contexts/AppContext';
import { AI_SERVICES } from './services/aiService';
import MainPage from './components/MainPage';
import GaragePage from './components/GaragePage';
import SettingsPage from './components/SettingsPage';
import Icon from './components/Icon';
import bunnyLogo from './assets/bunnylogo.svg'; 

import './App.css';

const Header: React.FC<{
  currentPage: string;
  onPageChange: (page: string) => void;
}> = ({ currentPage, onPageChange }) => {
  const { connections } = useApp();
  const { theme, setTheme } = useTheme();
  const connectedCount = Object.values(connections).filter(c => c.status === 'connected').length;

  return (
    <header className="header">
      <div className="header-content">
        <button className="logo" onClick={() => onPageChange('main')}>
          {}
          <img src={bunnyLogo} alt="Bunny Logo" className="logo-image" />
          <span>BUNNY</span>
        </button>
        <nav className="header-nav">
          <button
            className={`nav-button garage-button ${currentPage === 'garage' ? 'active' : ''}`}
            onClick={() => onPageChange('garage')}
          >
            <Icon name="FiGrid" /> Garage
            {connectedCount >= 2 && (
              <span className="notification-badge">{connectedCount}</span>
            )}
          </button>
          <button 
            className={`nav-button settings-button ${currentPage === 'settings' ? 'active' : ''}`}
            onClick={() => onPageChange('settings')}
          >
            <Icon name="FiSettings" /> Settings
          </button>
          <div className="theme-toggle">
            <div
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Icon name="FiSun" />
            </div>
            <div
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Icon name="FiMoon" />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('main');
  const { connections } = useApp();
  const connectedServices = AI_SERVICES.filter(service => 
    connections[service.id]?.status === 'connected'
  );

  return (
    <div className="app">
      <Header
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      <main className="main-content">
        {currentPage === 'main' && <MainPage />}
        {currentPage === 'settings' && <SettingsPage />}
        {currentPage === 'garage' && (
          <GaragePage
            connectedServices={connectedServices}
            onBack={() => setCurrentPage('main')}
          />
        )}
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--theme-bg-secondary)',
            color: 'var(--theme-text)',
            border: '1px solid var(--theme-border)',
          },
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
};

export default App;