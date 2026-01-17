import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

import Auth from './Auth';
import Header from './Header';
import MessageForm from './MessageForm';
import Filters from './Filters';
import Architecture from './Architecture';
import MessageList from './MessageList';
import ThemeToggle from './ThemeToggle';
import './App.css';

const API_URL = 'https://4rca5iti3f.execute-api.eu-west-3.amazonaws.com/dev';

function App() {
  // --- ÉTATS ---
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  
  // --- ÉTATS NOTIFICATIONS ---
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  // --- ÉTATS FILTRAGE ---
  const [showOnlyMyMessages, setShowOnlyMyMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // --- LOGIQUE UTILISATEUR ---
  const getCurrentUser = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      return session?.tokens?.idToken?.payload?.email || session?.username || null;
    } catch (err) { return null; }
  }, []);

  const setupUser = useCallback(async () => {
    const email = await getCurrentUser();
    setCurrentUserEmail(email || '');
  }, [getCurrentUser]);

  const triggerPushNotification = useCallback((msg) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Message de ${msg.user.split('@')[0]}`, {
        body: msg.text.substring(0, 60) + "...",
        icon: "/favicon.ico"
      });
    }
  }, []);

  // Fonction pour effacer le badge rouge
  const clearNotifications = () => {
    setUnreadCount(0);
    document.title = "Chat Architecture AWS";
  };

  // --- RÉCUPÉRATION DES MESSAGES ---
  const fetchMessages = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && messages.length === 0) setLoading(true);

      const response = await fetch(`${API_URL}/messages`);
      const data = await response.json();

      if (data.success) {
        // Calcul du nombre de nouveaux messages arrivés
        const diff = data.messages.length - messages.length;

        if (messages.length > 0 && diff > 0) {
          const newest = data.messages[0];

          // Si le message n'est pas de moi
          if (newest.user !== currentUserEmail) {
            // On ajoute le nombre exact de nouveaux messages au badge
            setUnreadCount(prev => prev + diff);
            
            // Notification système (si onglet caché)
            if (!isWindowFocused) {
              triggerPushNotification(newest);
            }

            // Toast visuel (en haut à droite)
            setLastNotification(newest);
            setTimeout(() => setLastNotification(null), 5000);
          }
        }
        
        // Mise à jour stable de la liste des messages
        setMessages(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data.messages)) return prev;
          return data.messages;
        });
      }
    } catch (err) {
      console.error("Erreur API:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserEmail, isWindowFocused, messages.length, triggerPushNotification]);

  // --- EFFETS ---
  const checkApi = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/messages/health`);
      const data = await response.json();
      setApiStatus(data.status === 'ok' ? 'connected' : 'disconnected');
    } catch (err) { setApiStatus('disconnected'); }
  }, []);

  useEffect(() => {
    checkApi();
    fetchMessages();
    setupUser();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [checkApi, fetchMessages, setupUser]);

  // Polling toutes les 5 secondes (plus réactif pour le badge)
  useEffect(() => {
    if (!currentUserEmail) return;
    const interval = setInterval(() => fetchMessages(true), 5000); 
    return () => clearInterval(interval);
  }, [fetchMessages, currentUserEmail]);

  // Gestion du Focus et Titre
  useEffect(() => {
    const onFocus = () => setIsWindowFocused(true);
    const onBlur = () => setIsWindowFocused(false);
    
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Nouveau message !`;
    } else {
      document.title = "Chat Architecture AWS";
    }
  }, [unreadCount]);

  // --- ACTIONS FORMULAIRE ---
  // --- ACTIONS IMAGES ---
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        setError("L'image est trop lourde (max 5Mo)"); 
        return; 
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      setLoading(true);
      const messageData = { text: newMessage, user: currentUserEmail || 'Anonyme' };
      if (selectedImage) { 
        messageData.imageBase64 = imagePreview; 
        messageData.imageType = selectedImage.type; 
      }
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      if (response.ok) {
        setNewMessage(''); 
        setSelectedImage(null); 
        setImagePreview(null);
        fetchMessages(true);
      }
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      await fetch(`${API_URL}/messages/${id}`, { method: 'DELETE' });
      fetchMessages(true);
    } catch (err) { setError(err.message); }
  };

  // --- FILTRAGE ---
  const getUniqueUsers = useCallback(() => [...new Set(messages.map(msg => msg.user))].sort(), [messages]);
  
  const displayedMessages = messages
    .filter(msg => !showOnlyMyMessages || msg.user === currentUserEmail)
    .filter(msg => msg.text.toLowerCase().includes(searchTerm.toLowerCase()) || msg.user.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(msg => filterUser === 'all' || msg.user === filterUser)
    .sort((a, b) => sortBy === 'newest' ? new Date(b.timestamp) - new Date(a.timestamp) : new Date(a.timestamp) - new Date(b.timestamp));

  // --- RENDU ---
  return (
    <Auth>
      {({ signOut, user }) => (
        <div className="App">
          {/* Toast Notification */}
          {lastNotification && (
            <div className="notification-toast">
              <div className="toast-content">
                <span>🔔</span>
                <div className="toast-text">
                  <strong>{lastNotification.user.split('@')[0]}</strong>
                  <p>{lastNotification.text.substring(0, 40)}...</p>
                </div>
              </div>
            </div>
          )}

          <ThemeToggle />

          <Header 
            apiStatus={apiStatus} 
            currentUserEmail={user?.signInDetails?.loginId || user?.username || currentUserEmail} 
            setupUser={setupUser}
            signOut={signOut}
            unreadCount={unreadCount}
            resetNotifications={clearNotifications}
          />

          <div className="container">
            <div className="left-panel">
              <MessageForm 
                newMessage={newMessage} setNewMessage={setNewMessage}
                handleSubmit={handleSubmit} handleImageSelect={handleImageSelect}
                imagePreview={imagePreview} clearImage={() => {setSelectedImage(null); setImagePreview(null);}}
                loading={loading} error={error} setError={setError}
              />
            </div>

            <div className="right-panel">
              <div className="messages-list-container">
                <Filters 
                  searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                  filterUser={filterUser} setFilterUser={setFilterUser}
                  sortBy={sortBy} setSortBy={setSortBy}
                  users={getUniqueUsers()} totalMessages={messages.length}
                  filteredCount={displayedMessages.length}
                />
                
                <div className="messages-header">
                  <div className="title-section">
                    <h2>Flux de messages ({displayedMessages.length})</h2>
                    <button className={`refresh-btn ${loading ? 'spinning' : ''}`} onClick={() => fetchMessages()} disabled={loading}>
                      {loading ? '⏳' : '🔄'}
                    </button>
                  </div>
                  <label className="filter-controls">
                    <input type="checkbox" checked={showOnlyMyMessages} onChange={e => setShowOnlyMyMessages(e.target.checked)} />
                    <span> Mes messages</span>
                  </label>
                </div>

                <MessageList 
                  messages={displayedMessages} onDelete={handleDelete} 
                  currentUserEmail={user?.signInDetails?.loginId || user?.username || currentUserEmail}
                  loading={loading} searchTerm={searchTerm}
                />
              </div>
            </div>
          </div>
          <Architecture />
        </div>
      )}
    </Auth>
  );
}

export default App;