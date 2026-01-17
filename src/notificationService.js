// Service de notifications simplifié (sans GraphQL)

let messageSubscribers = [];

// S'abonner aux nouveaux messages
export const subscribeToMessages = (callback) => {
  messageSubscribers.push(callback);
  
  // Retourne un objet avec unsubscribe
  return {
    unsubscribe: () => {
      messageSubscribers = messageSubscribers.filter(cb => cb !== callback);
    }
  };
};

// Notifier tous les abonnés (appelé quand un nouveau message arrive)
export const notifyNewMessage = (message) => {
  messageSubscribers.forEach(callback => {
    try {
      callback(message);
    } catch (error) {
      console.error('Erreur callback notification:', error);
    }
  });
};

// Jouer un son de notification
export const playNotificationSound = () => {
  try {
    // Créer un bip simple
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('Impossible de jouer le son:', error);
  }
};

// Créer une notification (placeholder pour compatibilité)
export const createNotification = async (type, message, userId = null) => {
  console.log('Notification créée:', { type, message, userId });
  return true;
};