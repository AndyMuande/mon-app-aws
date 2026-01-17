import React from 'react';
import './MessageList.css';
import MessageCard from './MessageCard';

const API_URL = 'https://4rca5iti3f.execute-api.eu-west-3.amazonaws.com/dev';

const MessageList = ({ messages, onDelete, currentUserEmail, loading, searchTerm, onReactionUpdate }) => {
  if (loading && messages.length === 0) {
    return <div className="messages-loading">Chargement des messages...</div>;
  }

  const handleReaction = async (messageId, emoji, user) => {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}/reactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, user })
      });
      
      if (response.ok) {
        onReactionUpdate();
      }
    } catch (error) {
      console.error('Erreur réaction:', error);
    }
  };

  return (
    <div className="messages-content">
      {messages.length === 0 ? (
        <div className="no-messages">Aucun message à afficher.</div>
      ) : (
        messages.map((msg) => (
          <MessageCard 
            key={msg.id} 
            msg={msg} 
            onDelete={onDelete} 
            currentUserEmail={currentUserEmail}
            onReact={handleReaction}  // Passer la fonction au MessageCard
          />
        ))
      )}
    </div>
  );
};

export default MessageList;