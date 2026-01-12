const API_URL = 'https://4rca5iti3f.execute-api.eu-west-3.amazonaws.com/dev';

export const api = {
  // Récupérer tous les messages
  getMessages: async () => {
    const response = await fetch(`${API_URL}/messages`);
    return response.json();
  },

  // Envoyer un message
  sendMessage: async (text, user = 'Vous') => {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, user })
    });
    return response.json();
  },

  // Supprimer un message
  deleteMessage: async (id) => {
    const response = await fetch(`${API_URL}/messages/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // Vérifier la santé de l'API
  checkHealth: async () => {
    const response = await fetch(`${API_URL}/messages/health`);
    return response.json();
  }
};