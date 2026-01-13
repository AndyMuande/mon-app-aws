import { fetchAuthSession } from 'aws-amplify/auth';
import Auth from './Auth';
import React, { useState, useEffect } from 'react';
import { api } from './api';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [showOnlyMyMessages, setShowOnlyMyMessages] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Vérifier la santé de l'API au chargement
  useEffect(() => {
    const setupUser = async () => {
      const email = await getCurrentUser();
      setCurrentUserEmail(email);
    };
    
    checkApi();
    loadMessages();
    setupUser();
  }, []);

  const getCurrentUser = async () => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.payload.email || 'Utilisateur';
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    return 'Utilisateur';
  }
};

  const checkApi = async () => {
    try {
      await api.checkHealth();
      setApiStatus('connected');
    } catch (error) {
      setApiStatus('disconnected');
      console.error('Erreur API:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await api.getMessages();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const sendMessage = async () => {
  if (!message.trim() || loading) return;

  setLoading(true);
  try {
    const userEmail = await getCurrentUser();
    const data = await api.sendMessage(message, userEmail);
    if (data.success) {
      await loadMessages();
      setMessage('');
    }
  } catch (error) {
    console.error('Erreur envoi message:', error);
    alert('Erreur lors de l\'envoi du message');
  } finally {
    setLoading(false);
  }
};

  /* const sendMessage = async () => {
    if (!message.trim() || loading) return;

    setLoading(true);
    try {
      const data = await api.sendMessage(message, 'Andy');
      if (data.success) {
        await loadMessages();
        setMessage('');
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  }; */

  const deleteMessage = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce message ?')) {
      return;
    }

    try {
      const data = await api.deleteMessage(id);
      if (data.success) {
        await loadMessages();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Filtrer les messages affichés
  const displayedMessages = showOnlyMyMessages
    ? messages.filter(msg => msg.user === currentUserEmail)
    : messages;

  return (
    <Auth>
    <div className="App">
      <header className="App-header">
        <h1>🚀 Application AWS Full-Stack</h1>
        <p>React + Node.js + Lambda + DynamoDB</p>
        <div className={`api-status ${apiStatus}`}>
          {apiStatus === 'connected' ? '🟢 API Connectée' : 
           apiStatus === 'disconnected' ? '🔴 API Déconnectée' : 
           '🟡 Vérification...'}
        </div>
      </header>

      <div className="container">
        <div className="message-box">
          <h2>💬 Messages stockés dans DynamoDB ({messages.length})</h2>
          <div className="filter-controls">
            <label>
              <input
                type="checkbox"
                checked={showOnlyMyMessages}
                onChange={(e) => setShowOnlyMyMessages(e.target.checked)}
              />
              <span> Afficher uniquement mes messages</span>
            </label>
            <div style={{marginTop: '0.5rem', fontSize: '0.9rem', color: '#666'}}>Connecté: {currentUserEmail || '—'}</div>
          </div>
          <div className="messages-list">
            {displayedMessages.length === 0 ? (
              <p className="empty">Aucun message. Envoyez-en un !</p>
            ) : (
              displayedMessages.map(msg => (
                <div key={msg.id} className="message">
                  <div className="message-header">
                    <span className="username">{msg.user}</span>
                    <div>
                      <span className="time">
                        {new Date(msg.timestamp).toLocaleString('fr-FR')}
                      </span>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteMessage(msg.id)}
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p className="message-text">{msg.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="input-box">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Tapez votre message..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading}>
            {loading ? '⏳ Envoi...' : '📤 Envoyer'}
          </button>
        </div>
      </div>

      <div className="info-box">
        <h3>📊 Architecture AWSS</h3>
        <div className="architecture">
          <div className="arch-item">
            <div className="arch-icon">🎨</div>
            <div>Frontend React</div>
            <small>AWS Amplify</small>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-item">
            <div className="arch-icon">🌐</div>
            <div>API Gateway</div>
            <small>REST API</small>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-item">
            <div className="arch-icon">λ</div>
            <div>Lambda</div>
            <small>Node.js 22</small>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-item">
            <div className="arch-icon">💾</div>
            <div>DynamoDB</div>
            <small>NoSQL Database</small>
          </div>
        </div>
      </div>
    </div>
    </Auth>
  );
}

export default App;