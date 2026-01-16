import React from 'react';
import './Header.css';

const Header = ({ apiStatus, currentUserEmail, setupUser, signOut }) => {
  return (
    <header className="App-header">
      {/* GAUCHE : Logo et Infos */}
      <div className="header-left">
        <h1>💬 Messagerie AWS</h1>
        <div className="header-left-info">
          <div className={`api-status ${apiStatus}`}>
            {apiStatus === 'connected' ? '🟢 Connectée' : 
             apiStatus === 'disconnected' ? '🔴 Déconnectée' : 
             '🟡 Vérif...'}
          </div>
          <span className="user-info">👤 {currentUserEmail || 'Anonyme'}</span>
          <button onClick={setupUser} className="refresh-btn" title="Actualiser">🔄</button>
        </div>
      </div>

      {/* CENTRE : Texte défilant */}
      <div className="header-center">
        <div className="scroll-container">
          <p className="scroll-text">
            🚀 Bienvenue sur la messagerie AWS — Update v2.4 disponible — Serveur : US-EAST-1 opérationnel
          </p>
        </div>
      </div>

      {/* DROITE : Déconnexion isolée */}
      <div className="header-right">
        <button onClick={signOut} className="logout-btn-top" title="Se déconnecter">
          🚪 Déconnexion
        </button>
      </div>
    </header>
  );
};

export default Header;