import React from 'react';
import './Header.css';
import {
  LogOut,
  User,
  Wifi,
  WifiOff,
  Loader
} from 'lucide-react';

export default function Header({
  apiStatus,
  currentUserEmail,
  setupUser,
  onSignOut,
  notificationBadge
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
