const API_URL = 'https://4rca5iti3f.execute-api.eu-west-3.amazonaws.com/dev';

export const api = {
  // Récupérer tous les messages
  getMessages: async () => {
    try {
      const response = await fetch(`${API_URL}/messages`);
      if (!response.ok) {
        const text = await response.text();
        return { success: false, status: response.status, error: text };
      }
      return await response.json();
    } catch (error) {
      console.error('getMessages error:', error);
      return { success: false, error: error.message };
    }
  },

  // Envoyer un message (optionnellement avec image en base64)
  sendMessage: async (text, user = 'Vous', imageBase64 = null, imageType = null) => {
    try {
      const body = { text, user };
      if (imageBase64) {
        body.imageBase64 = imageBase64;
        body.imageType = imageType;
      }

      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('sendMessage failed:', response.status, text);
        return { success: false, status: response.status, error: text };
      }
      return await response.json();
    } catch (error) {
      console.error('sendMessage error:', error);
      return { success: false, error: error.message };
    }
  },

  // Supprimer un message
  deleteMessage: async (id) => {
    try {
      const response = await fetch(`${API_URL}/messages/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const text = await response.text();
        return { success: false, status: response.status, error: text };
      }
      return await response.json();
    } catch (error) {
      console.error('deleteMessage error:', error);
      return { success: false, error: error.message };
    }
  },

  // Vérifier la santé de l'API
  checkHealth: async () => {
    try {
      const response = await fetch(`${API_URL}/messages/health`);
      if (!response.ok) {
        const text = await response.text();
        return { success: false, status: response.status, error: text };
      }
      return await response.json();
    } catch (error) {
      console.error('checkHealth error:', error);
      return { success: false, error: error.message };
    }
  }
};