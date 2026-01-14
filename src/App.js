import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import Auth from './Auth';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import './App.css';

function App({ currentUser }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [showOnlyMyMessages, setShowOnlyMyMessages] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Vérifier la santé de l'API au chargement
  // Stable helpers using useCallback to satisfy lint rules
  const getCurrentUser = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      // Try multiple shapes to extract the email
      const email =
        (session?.getIdToken && typeof session.getIdToken === 'function' ? session.getIdToken().payload?.email : null)
        || session?.idToken?.payload?.email
        || session?.tokens?.idToken?.payload?.email
        || session?.username
        || null;

      return email || null;
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      return null;
    }
  }, []);

  const setupUser = useCallback(async () => {
    const email = await getCurrentUser();
    console.debug('setupUser: detected email ->', email);
    setCurrentUserEmail(email || '');
  }, [getCurrentUser]);

  const checkApi = useCallback(async () => {
    try {
      await api.checkHealth();
      setApiStatus('connected');
    } catch (error) {
      setApiStatus('disconnected');
      console.error('Erreur API:', error);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.getMessages();
      if (data && data.success === false) {
        console.error('Erreur chargement messages:', data);
        alert('Erreur récupération messages: ' + (data.error || 'voir la console'));
        return;
      }
      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else if (Array.isArray(data)) {
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      alert('Erreur récupération messages: ' + error.message);
    }
  }, []);

  useEffect(() => {
    checkApi();
    loadMessages();
    setupUser();
  }, [checkApi, loadMessages, setupUser]);

  // Sync with Authenticator-provided user when available
  useEffect(() => {
    if (!currentUser) {
      setCurrentUserEmail('');
      return;
    }
    const email = currentUser.signInDetails?.loginId || currentUser.username || currentUser.attributes?.email || null;
    console.debug('Auth prop user ->', email);
    setCurrentUserEmail(email || '');
  }, [currentUser]);



  // Listen to Amplify Auth events to update UI automatically (safe listener + cleanup)
  useEffect(() => {
    if (typeof Hub === 'undefined' || Hub === null || typeof Hub.listen !== 'function') {
      console.debug('Amplify Hub is not available, skipping auth listener');
    } else {
      const listener = (capsule) => {
        try {
          const { channel, payload } = capsule;
          console.debug('Amplify Hub event', channel, payload?.event || payload);
          if (channel === 'auth' && ['signIn','signOut','signUp','signIn_failure','signOut_failure'].includes(payload?.event)) {
            // Refresh user info and messages on auth changes
            setupUser();
            loadMessages();
          }
        } catch (err) {
          console.error('Hub listener error:', err);
        }
      };

      // Some Amplify versions return a cleanup function from listen
      const maybeRemove = Hub.listen('auth', listener);
      return () => {
        try {
          if (typeof maybeRemove === 'function') {
            maybeRemove();
            return;
          }
          // Fallbacks
          if (typeof Hub !== 'undefined' && typeof Hub.remove === 'function') {
            Hub.remove('auth', listener);
            return;
          }
          if (typeof Hub !== 'undefined' && typeof Hub.removeListener === 'function') {
            Hub.removeListener('auth', listener);
            return;
          }
        } catch (e) {
          console.debug('Hub cleanup not available or failed:', e?.message);
        }
      };
    }

    // no cleanup if Hub not available
    return () => {};
  }, [setupUser, loadMessages]);

  // Also listen to direct DOM event dispatched by Auth.js to cover all cases
  useEffect(() => {
    const handler = (ev) => {
      try {
        const user = ev.detail;
        console.debug('auth-user-changed event received', user);
        if (!user) {
          setCurrentUserEmail('');
          return;
        }
        const email = user.signInDetails?.loginId || user.username || user.attributes?.email || null;
        setCurrentUserEmail(email || '');
        // refresh messages as well
        loadMessages();
      } catch (err) {
        console.error('auth-user-changed handler error:', err);
      }
    };
    window.addEventListener('auth-user-changed', handler);
    return () => window.removeEventListener('auth-user-changed', handler);
  }, [loadMessages]);


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
  const displayedMessages = (() => {
    if (!showOnlyMyMessages) return messages;
    const ids = [];
    if (currentUserEmail) ids.push(currentUserEmail);
    if (currentUser?.username) ids.push(currentUser.username);
    if (currentUser?.attributes?.email) ids.push(currentUser.attributes.email);
    // Also include common fallbacks
    ids.push('Vous', 'Utilisateur');
    return messages.filter(msg => ids.includes(msg.user));
  })();

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
            <div style={{marginTop: '0.5rem', fontSize: '0.9rem', color: '#666', display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
              <span>Connecté: <strong>{currentUserEmail || '—'}</strong></span>
              <button onClick={setupUser} style={{fontSize: '0.8rem', padding: '0.2rem 0.4rem', borderRadius: 6}}>Actualiser</button>
            </div>
          </div>
          <div className="messages-list">
            {displayedMessages.length === 0 ? (
              <p className="empty">{showOnlyMyMessages ? 'Aucun message pour cet utilisateur.' : 'Aucun message. Envoyez-en un !'}</p>
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
        <h3>📊 Architecture AWS</h3>
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