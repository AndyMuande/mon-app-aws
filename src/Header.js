import React from 'react';
import './Header.css';
// Import des icônes spécifiques depuis la bibliothèque
import { Bell, LogOut, RefreshCw, User } from 'lucide-react';

const Header = ({ apiStatus, currentUserEmail, setupUser, signOut, unreadCount, resetNotifications }) => {
  return (
    <header className="App-header">
      <div className="header-left">
        <h1>💬 Messagerie AWS</h1>
        <div className="header-left-info">
          <div className={`api-status ${apiStatus}`}>
            {/* On peut aussi mettre une icône ici */}
            {apiStatus === 'connected' ? '🟢' : '🔴' &&'🟡 Vérif...'} 

            <span style={{marginLeft: '5px'}}>
              {apiStatus === 'connected' ? 'Connectée' : 'Déconnectée'}
            </span>
          </div>
          <span className="user-info">
            <User size={16} style={{marginRight: '5px'}} />
            {currentUserEmail ? currentUserEmail.split('@')[0] : 'Anonyme'}
          </span>
          <button onClick={setupUser} className="refresh-btn" title="Actualiser">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="header-center">
        <div className="scroll-container">
          <p className="scroll-text">
            {unreadCount > 0 
              ? `NOUVEAU(X) MESSAGE(S) : ${unreadCount} ! — ` 
              : `🚀 Système opérationnel — `}
            Région : Paris eu-west-3
          </p>
        </div>
      </div>

      <div className="header-right">
        <div className="notification-bell-wrapper" onClick={resetNotifications} style={{ cursor: 'pointer' }}>
          {/* L'icône Bell de Lucide */}
          {/* <Bell size={24} color={unreadCount > 0 ? "#ff4757" : "currentColor"} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )} */}
  <Bell size={24} color={unreadCount > 0 ? "#ff4757" : "currentColor"} />
  {unreadCount > 0 && (
    <span className="notification-badge">{unreadCount}</span>
  )}
        </div>

        <button onClick={signOut} className="logout-btn-top">
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </header>
  );
};

export default Header;