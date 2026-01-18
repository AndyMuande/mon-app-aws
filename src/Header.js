import React from 'react';
import './Header.css';
import ExportButton from './ExportButton';
import {
  LogOut,
  User,
  Wifi,
  WifiOff,
  Loader
} from 'lucide-react';

const API_URL = 'https://4rca5iti3f.execute-api.eu-west-3.amazonaws.com/dev';

export default function Header({
  apiStatus,
  currentUserEmail,
  setupUser,
  onSignOut,
  notificationBadge,
  messages  // Ajoutez ce prop
}) {
  const renderApiStatusIcon = () => {
    if (apiStatus === 'connected') return <Wifi size={18} />;
    if (apiStatus === 'disconnected') return <WifiOff size={18} />;
    return <Loader size={18} className="spin" />;
  };

  return (
    <header className="App-header">
      <div className="header-content">
        <div className="header-left">
          <h1>Messagerie AWS</h1>
        </div>

        <div className="header-right">
          {/* Badge notifications */}
          {notificationBadge}
          {/* Bouton d'export */}
          <ExportButton 
            messages={messages}
            currentUserEmail={currentUserEmail}
          />
          <a 
            href={`${API_URL}/messages/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="docs-link"
            title="Documentation API"
          >
            📖 API Docs
          </a>
          {/* Statut API */}
          <div className={`api-status ${apiStatus}`}>
            {renderApiStatusIcon()}
          </div>

          {/* Utilisateur */}
          <div className="user-info">
            <User size={18} />
            <span>{currentUserEmail || 'Anonyme'}</span>
          </div>

          {/* Déconnexion */}
          <button onClick={onSignOut} className="signout-btn">
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
