import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

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

  // Effet initial au chargement
  useEffect(() => {
    checkApi();
    fetchMessages();
    setupUser();
  }, [checkApi, fetchMessages, setupUser]);

  // --- LOGIQUE TEMPS RÉEL (POLLING) ---
  useEffect(() => {
    // Rafraîchit les messages toutes les 10 secondes
    const interval = setInterval(() => {
      if (!loading) {
        fetchMessages();
      }
    }, 10000); 

    // Nettoyage de l'intervalle si on quitte la page
    return () => clearInterval(interval);
  }, [fetchMessages, loading]);

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
        fetchMessages();
      } else {
        throw new Error("Erreur lors de l'envoi");
      }
    } catch (err) { 
      setError(err.message);
      setTimeout(() => setError(null), 5000); // Efface l'erreur après 5s
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

    // Filtre "Mes messages uniquement"
    if (showOnlyMyMessages) {
      filtered = filtered.filter(msg => msg.user === currentUserEmail);
    }

    // Filtre par recherche textuelle
    if (searchTerm.trim()) {
      filtered = filtered.filter(msg =>
        msg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par utilisateur spécifique
    if (filterUser !== 'all') {
      filtered = filtered.filter(msg => msg.user === filterUser);
    }

    // Filtre par date
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

    // Tri
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

  // Récupérer la liste unique des utilisateurs
  const getUniqueUsers = useCallback(() => {
    return [...new Set(messages.map(msg => msg.user))].sort();
  }, [messages]);

  // Messages filtrés
  const displayedMessages = getFilteredAndSortedMessages();

  // --- RENDU ---
  return (
    <Auth>
      {({ signOut, user }) => (
        <div className="App">
          {/* Bouton de personnalisation du thème */}
          <ThemeToggle />
          <Header 
            apiStatus={apiStatus} 
            currentUserEmail={user?.signInDetails?.loginId || user?.username || currentUserEmail} 
            setupUser={setupUser}
            signOut={signOut}
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