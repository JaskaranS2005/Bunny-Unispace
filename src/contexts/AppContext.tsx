import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export interface AIConnection {
  id: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  apiKey?: string;
  email?: string;
  model?: string;
  nickname?: string;
}

interface AppContextType {
  connections: Record<string, AIConnection>;
  setConnection: (serviceId: string, connection: AIConnection) => void;
  removeConnection: (serviceId: string) => void;
  clearHistory: () => void;
  resetAllSettings: () => void;
}

const CONNECTIONS_STORAGE_KEY = 'bunny-connections';
const KEY_STORAGE_PREFIX = 'bunny-session-key-';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context hooks intentionally share this module with their providers.
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

const loadConnections = (): Record<string, AIConnection> => {
  try {
    const saved = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
    if (!saved) return {};

    const stored = JSON.parse(saved) as Record<string, AIConnection>;
    return Object.fromEntries(
      Object.entries(stored).map(([serviceId, connection]) => {
        const apiKey = sessionStorage.getItem(`${KEY_STORAGE_PREFIX}${serviceId}`) || undefined;
        return [
          serviceId,
          {
            ...connection,
            apiKey,
            status: connection.status === 'connected' && apiKey ? 'connected' : 'disconnected',
          },
        ];
      }),
    );
  } catch {
    return {};
  }
};

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('bunny-theme');
    return (saved as 'light' | 'dark') || 'dark';
  });
  const [connections, setConnections] = useState<Record<string, AIConnection>>(loadConnections);

  useEffect(() => {
    localStorage.setItem('bunny-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const persistentConnections = Object.fromEntries(
      Object.entries(connections).map(([serviceId, connection]) => {
        const safeConnection = { ...connection };
        delete safeConnection.apiKey;
        return [serviceId, safeConnection];
      }),
    );
    localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(persistentConnections));
  }, [connections]);

  const setConnection = (serviceId: string, connection: AIConnection) => {
    if (connection.apiKey) {
      sessionStorage.setItem(`${KEY_STORAGE_PREFIX}${serviceId}`, connection.apiKey);
    }
    setConnections(previous => ({
      ...previous,
      [serviceId]: {
        ...previous[serviceId],
        ...connection,
        apiKey: connection.apiKey || previous[serviceId]?.apiKey,
      },
    }));
  };

  const removeConnection = (serviceId: string) => {
    sessionStorage.removeItem(`${KEY_STORAGE_PREFIX}${serviceId}`);
    setConnections(previous => {
      const nextConnections = { ...previous };
      delete nextConnections[serviceId];
      return nextConnections;
    });
  };

  const clearHistory = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bunny-chat-history')) localStorage.removeItem(key);
    });
    toast.success('Response history cleared.');
  };

  const resetAllSettings = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bunny-')) localStorage.removeItem(key);
    });
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('bunny-')) sessionStorage.removeItem(key);
    });
    setConnections({});
    toast.success('All Bunny settings have been reset.');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <AppContext.Provider value={{ connections, setConnection, removeConnection, clearHistory, resetAllSettings }}>
        {children}
      </AppContext.Provider>
    </ThemeContext.Provider>
  );
};
