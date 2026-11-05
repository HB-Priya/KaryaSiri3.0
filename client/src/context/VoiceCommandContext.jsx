import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

const VoiceCommandContext = createContext(null);

/**
 * A lightweight pub-sub registry so any page can contribute voice commands
 * that only make sense in its own context (e.g. "apply" and "submit" on a
 * job detail page), without the global access-bar mic handler needing to
 * know anything about that page. Page-specific commands are always checked
 * before universal ones, so "submit" on the login form and "submit" on a
 * job application do different, locally-relevant things.
 *
 * Each command is: { patterns: ['submit', 'send application'], handler: (transcript) => void }
 * The handler is responsible for its own feedback (announce/speak).
 */
export function VoiceCommandProvider({ children }) {
  const registryRef = useRef(new Map()); // id -> commands[]

  const register = useCallback((id, commands) => {
    registryRef.current.set(id, commands);
    return () => {
      registryRef.current.delete(id);
    };
  }, []);

  // Returns true if a page-specific command matched and ran.
  const tryPageCommands = useCallback((transcriptLower) => {
    for (const commands of registryRef.current.values()) {
      for (const cmd of commands) {
        if (cmd.patterns.some((p) => transcriptLower.includes(p))) {
          cmd.handler(transcriptLower);
          return true;
        }
      }
    }
    return false;
  }, []);

  return (
    <VoiceCommandContext.Provider value={{ register, tryPageCommands }}>
      {children}
    </VoiceCommandContext.Provider>
  );
}

/**
 * Registers a set of voice commands for as long as the calling component is
 * mounted. Pass a stable-ish `commands` array (it's fine to recreate each
 * render; only `deps` controls re-registration).
 */
export function useRegisterVoiceCommands(id, commands, deps = []) {
  const ctx = useContext(VoiceCommandContext);
  useEffect(() => {
    if (!ctx) return undefined;
    return ctx.register(id, commands);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useVoiceCommandRegistry() {
  const ctx = useContext(VoiceCommandContext);
  if (!ctx) throw new Error('useVoiceCommandRegistry must be used within VoiceCommandProvider');
  return ctx;
}
