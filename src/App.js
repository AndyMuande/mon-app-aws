import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { subscribeToMessages, playNotificationSound } from './notificationService';
import NotificationBadge from './NotificationBadge';

// Imports de tes composants
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
  
  // --- ÉTATS FILTRAGE ---
  const [showOnlyMyMessages, setShowOnlyMyMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // --- ÉTATS NOTIFICATIONS ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- LOGIQUE UTILISATEUR & API ---
  const getCurrentUser = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      return session?.tokens?.idToken?.payload?.email || session?.username || null;
    } catch (err) {
      return null;
    }
  }, []);

  const setupUser = useCallback(async () => {
    const email = await getCurrentUser();
    setCurrentUserEmail(email || '');
  }, [getCurrentUser]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/messages`);
      const data = await response.json();
      if (data.success) setMessages(data.messages);
    } catch (err) {
      setError('Erreur chargement: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkApi = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/messages/health`);
      const data = await response.json();
      setApiStatus(data.status === 'ok' ? 'connected' : 'disconnected');
    } catch (err) {
      setApiStatus('disconnected');
    }
  }, []);

  // --- GESTION DES NOTIFICATIONS ---
  const markNotificationAsRead = useCallback((notifId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notifId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Effet initial au chargement
  useEffect(() => {
    checkApi();
    fetchMessages();
    setupUser();
  }, [checkApi, fetchMessages, setupUser]);

  // --- ÉCOUTER LES NOUVEAUX MESSAGES DES AUTRES ONGLETS/UTILISATEURS ---
  useEffect(() => {
    const handleNewMessage = (event) => {
      const newMessageData = event.detail;
      
      // Ne pas notifier si c'est notre propre message
      if (newMessageData && newMessageData.user !== currentUserEmail) {
        const notif = {
          id: Date.now().toString() + Math.random(),
          type: 'new_message',
          message: `Nouveau message de ${newMessageData.user}: ${newMessageData.text.substring(0, 50)}${newMessageData.text.length > 50 ? '...' : ''}`,
          read: false,
          timestamp: new Date().toISOString()
        };
        
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Jouer un son
        playNotificationSound();
        
        // Notification navigateur
        if ('Notification' in window && Notification.permission === 'granted') {
          console.log('🔔 Envoi de la notification...');
          try {
            new Notification('Nouveau message', {
              body: `${newMessageData.user}: ${newMessageData.text.substring(0, 100)}`,
              icon: '/logo192.png',
              tag: 'new-message'
            });
            console.log('✅ Notification envoyée');
          } catch (err) {
            console.error('❌ Erreur lors de l\'envoi de la notification:', err);
          }
        } else {
          console.warn('⚠️ Permissions insuffisantes pour envoyer la notification');
        }
      }
      
      // Rafraîchir la liste des messages
      fetchMessages();
    };

    window.addEventListener('new-message', handleNewMessage);
    
    return () => {
      window.removeEventListener('new-message', handleNewMessage);
    };
  }, [currentUserEmail, fetchMessages]);

  // --- DEMANDER PERMISSION NOTIFICATIONS NAVIGATEUR ---
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        console.log('✅ Notifications déjà autorisées');
      } else if (Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          console.log('📢 Permission demandée, résultat:', permission);
        } catch (err) {
          console.error('❌ Erreur lors de la demande de permission:', err);
        }
      } else {
        console.warn('⚠️ Notifications refusées par l\'utilisateur');
      }
    } else {
      console.error('❌ Notifications non supportées');
    }
  }, []);

  useEffect(() => {
    // Initialiser et demander la permission au chargement
    if ('Notification' in window) {
      console.log('Notification permission:', Notification.permission);
    }
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // --- SUBSCRIPTIONS TEMPS RÉEL (WebSocket - optionnel) ---
  useEffect(() => {
    if (!currentUserEmail) return;

    const messageSubscription = subscribeToMessages((newMessage) => {
      console.log('Message via WebSocket:', newMessage);
      
      if (newMessage.user !== currentUserEmail) {
        const notif = {
          id: Date.now().toString() + Math.random(),
          type: 'new_message',
          message: `Nouveau message de ${newMessage.user}`,
          read: false,
          timestamp: new Date().toISOString()
        };
        
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
        playNotificationSound();
      }
      
      fetchMessages();
    });

    return () => {
      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }
    };
  }, [currentUserEmail, fetchMessages]);

  // Garder le dernier ID de message connu pour détecter les nouveaux
  const [lastMessageId, setLastMessageId] = useState(null);

  // --- LOGIQUE TEMPS RÉEL (POLLING AVEC DÉTECTION DE NOUVEAUX MESSAGES) ---
  useEffect(() => {
    let interval;
    
    const pollMessages = async () => {
      if (loading) return;
      
      try {
        const response = await fetch(`${API_URL}/messages`);
        const data = await response.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
          const latestMessage = data.messages[0];
          
          // Si on a un nouveau message et ce n'est pas le nôtre
          if (lastMessageId !== latestMessage.id && latestMessage.user !== currentUserEmail) {
            console.log('🆕 Nouveau message détecté:', latestMessage);
            
            // Créer une notification
            const notif = {
              id: Date.now().toString() + Math.random(),
              type: 'new_message',
              message: `Nouveau message de ${latestMessage.user}: ${latestMessage.text.substring(0, 50)}${latestMessage.text.length > 50 ? '...' : ''}`,
              read: false,
              timestamp: new Date().toISOString()
            };
            
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Jouer un son
            playNotificationSound();
            
            // Notification navigateur
            if ('Notification' in window && Notification.permission === 'granted') {
              console.log('🔔 Envoi de la notification...');
              try {
                new Notification('Nouveau message', {
                  body: `${latestMessage.user}: ${latestMessage.text.substring(0, 100)}`,
                  icon: '/logo192.png',
                  tag: 'new-message'
                });
                console.log('✅ Notification envoyée');
              } catch (err) {
                console.error('❌ Erreur lors de l\'envoi de la notification:', err);
              }
            } else {
              console.warn('⚠️ Permission notification non accordée');
            }
          }
          
          // Mettre à jour le dernier ID connu
          setLastMessageId(latestMessage.id);
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Erreur polling messages:', err);
      }
    };
    
    // Première vérification immédiate
    pollMessages();
    
    // Puis vérifier toutes les 3 secondes
    interval = setInterval(pollMessages, 3000);
    
    return () => clearInterval(interval);
  }, [loading, currentUserEmail, lastMessageId]);

  // --- CHARGER LES PRÉFÉRENCES DE FILTRES ---
  useEffect(() => {
    const savedFilters = localStorage.getItem('messageFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setSearchTerm(filters.searchTerm || '');
        setFilterUser(filters.filterUser || 'all');
        setFilterDate(filters.filterDate || 'all');
        setSortBy(filters.sortBy || 'newest');
        setShowOnlyMyMessages(filters.showOnlyMyMessages || false);
      } catch (e) {
        console.error('Erreur chargement filtres:', e);
      }
    }
  }, []);

  // --- SAUVEGARDER LES PRÉFÉRENCES DE FILTRES ---
  useEffect(() => {
    const filters = { searchTerm, filterUser, filterDate, sortBy, showOnlyMyMessages };
    localStorage.setItem('messageFilters', JSON.stringify(filters));
  }, [searchTerm, filterUser, filterDate, sortBy, showOnlyMyMessages]);

  // --- GESTION DES IMAGES ---
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("L'image est trop lourde (max 5Mo)");
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

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // --- ACTIONS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setError(null);

    try {
      setLoading(true);
      const messageData = { 
        text: newMessage, 
        user: currentUserEmail || 'Anonyme' 
      };
      
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
        const data = await response.json();
        
        // Réinitialiser le formulaire
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        
        // DÉCLENCHER L'ÉVÉNEMENT POUR LES NOTIFICATIONS
        if (data.success && data.message) {
          // Émettre l'événement pour les autres onglets/utilisateurs
          window.dispatchEvent(new CustomEvent('new-message', { 
            detail: {
              id: data.message.id,
              text: data.message.text,
              user: data.message.user,
              timestamp: data.message.timestamp,
              imageUrl: data.message.imageUrl
            }
          }));
          
          console.log('✅ Événement new-message émis:', data.message);
        }
        
        // Rafraîchir la liste
        fetchMessages();
      } else {
        throw new Error("Erreur lors de l'envoi");
      }
    } catch (err) { 
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      await fetch(`${API_URL}/messages/${id}`, { method: 'DELETE' });
      fetchMessages();
    } catch (err) { 
      setError(err.message); 
    }
  };

  // --- FILTRAGE AMÉLIORÉ ---
  const getFilteredAndSortedMessages = useCallback(() => {
    let filtered = [...messages];

    if (showOnlyMyMessages) {
      filtered = filtered.filter(msg => msg.user === currentUserEmail);
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(msg =>
        msg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterUser !== 'all') {
      filtered = filtered.filter(msg => msg.user === filterUser);
    }

    if (filterDate !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        
        switch (filterDate) {
          case 'today':
            return msgDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return msgDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return msgDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'oldest':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'user':
          return a.user.localeCompare(b.user);
        default:
          return 0;
      }
    });

    return filtered;
  }, [messages, showOnlyMyMessages, searchTerm, filterUser, filterDate, sortBy, currentUserEmail]);

  const getUniqueUsers = useCallback(() => {
    return [...new Set(messages.map(msg => msg.user))].sort();
  }, [messages]);

  const displayedMessages = getFilteredAndSortedMessages();

  // --- RENDU ---
  return (
    <Auth>
      {({ signOut, user }) => (
        <div className="App">
          <ThemeToggle />
          
          <Header 
            apiStatus={apiStatus} 
            currentUserEmail={user?.signInDetails?.loginId || user?.username || currentUserEmail} 
            setupUser={setupUser}
            onSignOut={signOut}
            notificationBadge={
              <NotificationBadge
                unreadCount={unreadCount}
                notifications={notifications}
                onMarkAsRead={markNotificationAsRead}
                onClearAll={markAllAsRead}
              />
            }
            messages={messages}
          />

          <div className="container">
            <div className="left-panel">
              <MessageForm 
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSubmit={handleSubmit}
                handleImageSelect={handleImageSelect}
                imagePreview={imagePreview}
                clearImage={clearImage}
                loading={loading}
                error={error}
                setError={setError}
              />
            </div>

            <div className="right-panel">
              <div className="messages-list-container">
                <Filters 
                  searchTerm={searchTerm} 
                  setSearchTerm={setSearchTerm}
                  filterUser={filterUser} 
                  setFilterUser={setFilterUser}
                  filterDate={filterDate} 
                  setFilterDate={setFilterDate}
                  sortBy={sortBy} 
                  setSortBy={setSortBy}
                  users={getUniqueUsers()}
                  totalMessages={messages.length}
                  filteredCount={displayedMessages.length}
                />
                
                <div className="messages-header">
                  <div className="title-section">
                    <h2>
                      Flux de messages ({displayedMessages.length}
                      {displayedMessages.length !== messages.length && `/${messages.length}`})
                    </h2>
                    <button 
                      className={`refresh-btn ${loading ? 'spinning' : ''}`} 
                      onClick={fetchMessages}
                      title="Actualiser les messages"
                      disabled={loading}
                    >
                      {loading ? '⏳' : '🔄'}
                    </button>
                  </div>
                  <label className="filter-controls">
                    <input 
                      type="checkbox" 
                      checked={showOnlyMyMessages} 
                      onChange={e => setShowOnlyMyMessages(e.target.checked)} 
                    />
                    <span> Mes messages</span>
                  </label>
                </div>

                <MessageList 
                  messages={displayedMessages} 
                  onDelete={handleDelete} 
                  currentUserEmail={user?.signInDetails?.loginId || user?.username || currentUserEmail}
                  loading={loading}
                  searchTerm={searchTerm}
                  onReactionUpdate={fetchMessages}  // Ajoutez cette ligne

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