import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AnnounceProvider } from './context/AnnounceContext';
import { LanguageProvider } from './context/LanguageContext';
import { VoiceCommandProvider } from './context/VoiceCommandContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnnounceProvider>
        <LanguageProvider>
          <AuthProvider>
            <VoiceCommandProvider>
              <App />
            </VoiceCommandProvider>
          </AuthProvider>
        </LanguageProvider>
      </AnnounceProvider>
    </BrowserRouter>
  </React.StrictMode>
);
