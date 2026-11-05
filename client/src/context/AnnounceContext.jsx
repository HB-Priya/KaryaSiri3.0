import { createContext, useContext, useState, useCallback, useRef } from 'react';

const AnnounceContext = createContext(null);

export function AnnounceProvider({ children }) {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef(null);

  const announce = useCallback((msg) => {
    setMessage('');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setMessage(msg), 50);
  }, []);

  return (
    <AnnounceContext.Provider value={{ announce }}>
      {children}
      <div className="live-region" aria-live="polite" role="status">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce() {
  const ctx = useContext(AnnounceContext);
  if (!ctx) throw new Error('useAnnounce must be used within AnnounceProvider');
  return ctx.announce;
}
