import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

interface AIConnection {
  id: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  apiKey?: string; // ✨ CORRECTED: Made apiKey optional to fix type error on disconnect.
  email?: string;
  model?: string;
}

interface AppContextType {
  connections: Record<string, AIConnection>;
  setConnection: (serviceId: string, connection: AIConnection) => void;
  removeConnection: (serviceId: string) => void;
  clearHistory: () => void;
  resetAllSettings: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const AppContext = createContext<AppContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface ProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<ProvidersProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('bunny-theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const [connections, setConnections] = useState<Record<string, AIConnection>>(() => {
    const saved = localStorage.getItem('bunny-connections');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('bunny-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('bunny-connections', JSON.stringify(connections));
  }, [connections]);

  const setConnection = (serviceId: string, connection: AIConnection) => {
    setConnections(prev => ({ ...prev, [serviceId]: connection }));
  };

  const removeConnection = (serviceId: string) => {
    setConnections(prev => {
      const newConnections = { ...prev };
      delete newConnections[serviceId];
      return newConnections;
    });
  };

  const clearHistory = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bunny-chat-history')) {
        localStorage.removeItem(key);
      }
    });
    toast.success('Response history cleared!');
  };

  const resetAllSettings = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bunny-')) {
        localStorage.removeItem(key);
      }
    });
    toast.success('All settings have been reset.');
    setTimeout(() => window.location.reload(), 1000);
  };

  const themeValue: ThemeContextType = {
    theme,
    setTheme,
  };

  const appValue: AppContextType = {
    connections,
    setConnection,
    removeConnection,
    clearHistory,
    resetAllSettings,
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <AppContext.Provider value={appValue}>{children}</AppContext.Provider>
    </ThemeContext.Provider>
  );
};

