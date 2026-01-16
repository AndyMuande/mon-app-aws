import React from 'react';
import './MessageCard.css'; // <--- L'IMPORTATION EST ICI

const MessageCard = ({ msg, onDelete, currentUserEmail }) => {
  const isOwnMessage = msg.user === currentUserEmail;

  return (
    <div className={`message-card ${isOwnMessage ? 'own-message' : ''}`}>
      <div className="message-header">
        <span className="message-user">
          {isOwnMessage ? '✨ Moi' : `👤 ${msg.user}`}
        </span>
        <span className="message-time">
          {new Date(msg.timestamp).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
      <div className="message-body">
        <p>{msg.text}</p>
        {msg.imageUrl && (
          <div className="message-image-container">
            <img src={msg.imageUrl} alt="Contenu partagé" className="message-image" />
          </div>
        )}
      </div>

      <button onClick={() => onDelete(msg.id)} className="delete-button">🗑️</button>
    </div>
  );
};

export default MessageCard;