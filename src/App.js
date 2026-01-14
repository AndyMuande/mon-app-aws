/* import { fetchAuthSession } from 'aws-amplify/auth';
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

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
  if ((!message.trim() && !selectedFile) || loading) return;

  setLoading(true);
  try {
    const userEmail = await getCurrentUser();
    if (!userEmail) {
      alert('Veuillez vous connecter pour envoyer un message');
      setLoading(false);
      return;
    }

    let imageBase64 = null;
    let imageType = null;
    if (selectedFile) {
      // Convert file to base64
      imageType = selectedFile.type;
      imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Erreur lecture fichier'));
        reader.readAsDataURL(selectedFile);
      });
    }

    const data = await api.sendMessage(message, userEmail, imageBase64, imageType);
    console.log('sendMessage response:', data);
    if (data && data.success === false) {
      console.error('sendMessage failed:', data);
      alert('Erreur lors de l\'envoi du message: ' + (data.error || 'voir la console'));
    } else {
      await loadMessages();
      setMessage('');
      setSelectedFile(null);
      setPreviewUrl('');
    }
  } catch (error) {
    console.error('Erreur envoi message:', error);
    alert('Erreur lors de l\'envoi du message: ' + error.message);
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

  /* const deleteMessage = async (id) => {
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
                  {msg.imageUrl && (
                    <div className="message-image-wrap">
                      <img src={msg.imageUrl} alt="attachment" className="message-image" />
                    </div>
                  )}
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

          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <label className="file-input-label">
              📁
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 10 * 1024 * 1024) { // 10MB limit
                    alert('Fichier trop gros (max 10MB)');
                    e.target.value = '';
                    return;
                  }
                  setSelectedFile(f);
                  const url = URL.createObjectURL(f);
                  setPreviewUrl(url);
                }}
                style={{display: 'none'}}
              />
            </label>

            {previewUrl && (
              <div className="file-preview">
                <img src={previewUrl} alt="preview" />
                <button className="remove-file-btn" onClick={() => { setSelectedFile(null); setPreviewUrl(''); }} title="Retirer">✖</button>
              </div>
            )}

            <button onClick={sendMessage} disabled={loading || (!message.trim() && !selectedFile)}>
              {loading ? '⏳ Envoi...' : '📤 Envoyer'}
            </button>
          </div>
        </div>
      </div>

      <div className="info-box">
        <h3>📊 Architecture AWSSSS</h3>
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

export default App; */
/* import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'https://4rca5iti3f.execute-api.eu-west-3.amazonaws.com/dev';

function App() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger les messages au démarrage
  useEffect(() => {
    fetchMessages();
  }, []);

  // Récupérer tous les messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/messages`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      } else {
        setError('Erreur lors du chargement des messages');
      }
    } catch (err) {
      setError('Impossible de charger les messages: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gérer la sélection d'image
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image trop grande (max 5MB)');
        return;
      }

      setSelectedImage(file);
      
      // Créer une prévisualisation
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Convertir l'image en base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Envoyer un nouveau message
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      setError('Le message ne peut pas être vide');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const messageData = {
        text: newMessage,
        user: userName || 'Anonyme'
      };

      // Ajouter l'image si sélectionnée
      if (selectedImage) {
        const base64Image = await convertImageToBase64(selectedImage);
        messageData.imageBase64 = base64Image;
        messageData.imageType = selectedImage.type;
      }

      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });

      const data = await response.json();

      if (data.success) {
        // Réinitialiser le formulaire
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        
        // Recharger les messages
        await fetchMessages();
      } else {
        setError('Erreur lors de l\'envoi: ' + data.error);
      }
    } catch (err) {
      setError('Impossible d\'envoyer le message: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un message
  const handleDelete = async (messageId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await fetchMessages();
      } else {
        setError('Erreur lors de la suppression');
      }
    } catch (err) {
      setError('Impossible de supprimer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Annuler la sélection d'image
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>💬 Messagerie AWS</h1>
        <p>Application de messages avec support d'images</p>
      </header>

      <div className="container">
        /* Formulaire d'envoi */
        /* <div className="message-form">
          <h2>Nouveau Message</h2>
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Votre nom (optionnel)"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="input-field"
            />

            <textarea
              placeholder="Écrivez votre message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="textarea-field"
              rows="4"
              required
            />

            /* Sélection d'image */
            /* <div className="image-upload">
              <label htmlFor="image-input" className="upload-button">
                📷 Ajouter une image
              </label>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Prévisualisation */
            /* {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button 
                  type="button" 
                  onClick={clearImage}
                  className="remove-image"
                >
                  ✕ Retirer
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? '⏳ Envoi...' : '📤 Envoyer'}
            </button>
          </form>
        </div>

        {/* Liste des messages *//* }
        <div className="messages-list">
          <h2>Messages ({messages.length})</h2>
          
          {loading && messages.length === 0 ? (
            <div className="loading">Chargement...</div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="message-card">
                <div className="message-header">
                  <span className="message-user">👤 {message.user}</span>
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>

                <div className="message-content">
                  <p>{message.text}</p>
                  
                  {/* Affichage de l'image *//* }
                  {message.imageUrl && (
                    <div className="message-image">
                      <img 
                        src={message.imageUrl} 
                        alt="Message attachment"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(message.id)}
                  className="delete-button"
                  disabled={loading}
                >
                  🗑️ Supprimer
                </button>
              </div>
            ))
          )}

          {messages.length === 0 && !loading && (
            <div className="empty-state">
              <p>Aucun message pour le moment.</p>
              <p>Soyez le premier à poster ! 🚀</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App; */

import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import Auth from './Auth';
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_URL = 'https://4rca5iti3f.execute-api.eu-west-3.amazonaws.com/dev';

function App({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [showOnlyMyMessages, setShowOnlyMyMessages] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Récupérer l'utilisateur actuel
  const getCurrentUser = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
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

  // Vérifier la santé de l'API
  const checkApi = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/messages/health`);
      const data = await response.json();
      if (data.status === 'ok') {
        setApiStatus('connected');
      } else {
        setApiStatus('disconnected');
      }
    } catch (error) {
      setApiStatus('disconnected');
      console.error('Erreur API:', error);
    }
  }, []);

  // Charger les messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/messages`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      } else {
        setError('Erreur lors du chargement des messages');
      }
    } catch (err) {
      setError('Impossible de charger les messages: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger au démarrage
  useEffect(() => {
    checkApi();
    fetchMessages();
    setupUser();
  }, [checkApi, fetchMessages, setupUser]);

  // Sync avec l'utilisateur Authenticator
  useEffect(() => {
    if (!currentUser) {
      setCurrentUserEmail('');
      return;
    }
    const email = currentUser.signInDetails?.loginId || currentUser.username || currentUser.attributes?.email || null;
    console.debug('Auth prop user ->', email);
    setCurrentUserEmail(email || '');
  }, [currentUser]);

  // Écouter les événements d'authentification
  useEffect(() => {
    if (typeof Hub === 'undefined' || Hub === null || typeof Hub.listen !== 'function') {
      console.debug('Amplify Hub is not available, skipping auth listener');
    } else {
      const listener = (capsule) => {
        try {
          const { channel, payload } = capsule;
          console.debug('Amplify Hub event', channel, payload?.event || payload);
          if (channel === 'auth' && ['signIn','signOut','signUp','signIn_failure','signOut_failure'].includes(payload?.event)) {
            setupUser();
            fetchMessages();
          }
        } catch (err) {
          console.error('Hub listener error:', err);
        }
      };

      const maybeRemove = Hub.listen('auth', listener);
      return () => {
        try {
          if (typeof maybeRemove === 'function') {
            maybeRemove();
            return;
          }
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
    return () => {};
  }, [setupUser, fetchMessages]);

  // Écouter les événements DOM
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
        fetchMessages();
      } catch (err) {
        console.error('auth-user-changed handler error:', err);
      }
    };
    window.addEventListener('auth-user-changed', handler);
    return () => window.removeEventListener('auth-user-changed', handler);
  }, [fetchMessages]);

  // Gérer la sélection d'image
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image trop grande (max 5MB)');
        return;
      }

      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Convertir l'image en base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Envoyer un nouveau message
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      setError('Le message ne peut pas être vide');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userEmail = await getCurrentUser();
      const messageData = {
        text: newMessage,
        user: userEmail || 'Anonyme'
      };

      // Ajouter l'image si sélectionnée
      if (selectedImage) {
        const base64Image = await convertImageToBase64(selectedImage);
        messageData.imageBase64 = base64Image;
        messageData.imageType = selectedImage.type;
      }

      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });

      const data = await response.json();

      if (data.success) {
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        await fetchMessages();
      } else {
        setError('Erreur lors de l\'envoi: ' + data.error);
      }
    } catch (err) {
      setError('Impossible d\'envoyer le message: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un message
  const handleDelete = async (messageId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await fetchMessages();
      } else {
        setError('Erreur lors de la suppression');
      }
    } catch (err) {
      setError('Impossible de supprimer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Annuler la sélection d'image
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Filtrer les messages affichés
  const displayedMessages = (() => {
    if (!showOnlyMyMessages) return messages;
    const ids = [];
    if (currentUserEmail) ids.push(currentUserEmail);
    if (currentUser?.username) ids.push(currentUser.username);
    if (currentUser?.attributes?.email) ids.push(currentUser.attributes.email);
    ids.push('Vous', 'Utilisateur');
    return messages.filter(msg => ids.includes(msg.user));
  })();

  return (
    <Auth>
      <div className="App">
        <header className="App-header">
          <h1>💬 Messagerie AWS Full-Stack</h1>
          <p>React + Lambda + DynamoDB + S3 + Cognito</p>
          <div className={`api-status ${apiStatus}`}>
            {apiStatus === 'connected' ? '🟢 API Connectée' : 
             apiStatus === 'disconnected' ? '🔴 API Déconnectée' : 
             '🟡 Vérification...'}
          </div>
        </header>

        <div className="container">
          {/* Formulaire d'envoi */}
          <div className="message-form">
            <h2>Nouveau Message</h2>
            
            <div className="user-info">
              <span>Connecté: <strong>{currentUserEmail || 'Anonyme'}</strong></span>
              <button onClick={setupUser} className="refresh-btn">🔄</button>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
                <button onClick={() => setError(null)}>✕</button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <textarea
                placeholder="Écrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="textarea-field"
                rows="4"
                required
              />

              {/* Sélection d'image */}
              <div className="image-upload">
                <label htmlFor="image-input" className="upload-button">
                  📷 Ajouter une image
                </label>
                <input
                  id="image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Prévisualisation */}
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button 
                    type="button" 
                    onClick={clearImage}
                    className="remove-image"
                  >
                    ✕ Retirer
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? '⏳ Envoi...' : '📤 Envoyer'}
              </button>
            </form>
          </div>

          {/* Liste des messages */}
          <div className="messages-list">
            <div className="messages-header">
              <h2>Messages ({messages.length})</h2>
              <div className="filter-controls">
                <label>
                  <input
                    type="checkbox"
                    checked={showOnlyMyMessages}
                    onChange={(e) => setShowOnlyMyMessages(e.target.checked)}
                  />
                  <span> Mes messages uniquement</span>
                </label>
              </div>
            </div>
            
            {loading && messages.length === 0 ? (
              <div className="loading">Chargement...</div>
            ) : displayedMessages.length === 0 ? (
              <div className="empty-state">
                <p>{showOnlyMyMessages ? 'Aucun message pour cet utilisateur.' : 'Aucun message pour le moment.'}</p>
                <p>Soyez le premier à poster ! 🚀</p>
              </div>
            ) : (
              displayedMessages.map((message) => (
                <div key={message.id} className="message-card">
                  <div className="message-header">
                    <span className="message-user">👤 {message.user}</span>
                    <span className="message-time">
                      {new Date(message.timestamp).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  <div className="message-content">
                    <p>{message.text}</p>
                    
                    {/* Affichage de l'image */}
                    {message.imageUrl && (
                      <div className="message-image">
                        <img 
                          src={message.imageUrl} 
                          alt="Message attachment"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(message.id)}
                    className="delete-button"
                    disabled={loading}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Architecture */}
        <div className="info-box">
          <h3>📊 Architecture AWS</h3>
          <div className="architecture">
            <div className="arch-item">
              <div className="arch-icon">🎨</div>
              <div>React</div>
              <small>Amplify</small>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-item">
              <div className="arch-icon">🔐</div>
              <div>Cognito</div>
              <small>Auth</small>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-item">
              <div className="arch-icon">🌐</div>
              <div>API Gateway</div>
              <small>REST</small>
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
              <small>NoSQL</small>
            </div>
            <div className="arch-arrow">+</div>
            <div className="arch-item">
              <div className="arch-icon">📦</div>
              <div>S3</div>
              <small>Images</small>
            </div>
          </div>
        </div>
      </div>
    </Auth>
  );
}

export default App;