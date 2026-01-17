import React, { useState } from 'react';
import './MessageCard.css';
import MessageReactions from './MessageReactions';
import MessageEditor from './MessageEditor';

const MessageCard = ({ msg, onDelete, currentUserEmail, onReact, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const isOwnMessage = msg.user === currentUserEmail;

  const handleSaveEdit = async (messageId, newText) => {
    await onEdit(messageId, newText);
    setIsEditing(false);
  };

  // Debug : afficher les infos du message
  console.log('Message data:', {
    id: msg.id,
    edited: msg.edited,
    editedAt: msg.editedAt
  });

  return (
    <div className={`message-card ${isOwnMessage ? 'own-message' : ''}`}>
      <div className="message-header">
        <span className="message-user">
          {isOwnMessage ? '✨ Moi' : `👤 ${msg.user}`}
        </span>
        <span className="message-time">
          {new Date(msg.timestamp).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          {/* Badge modifié - version avec fallback */}
          {(msg.edited === true || msg.editedAt) && (
            <span 
              className="edited-badge" 
              title={msg.editedAt 
                ? `Modifié le ${new Date(msg.editedAt).toLocaleString('fr-FR')}` 
                : 'Modifié'
              }
            >
              {' '}✏️ (modifié)
            </span>
          )}
        </span>
      </div>
      
      {/* Mode édition ou affichage normal */}
      {isEditing ? (
        <MessageEditor
          message={msg}
          onSave={handleSaveEdit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="message-body">
          <p>{msg.text}</p>
          {msg.imageUrl && (
            <div className="message-image-container">
              <img src={msg.imageUrl} alt="Contenu partagé" className="message-image" />
            </div>
          )}
        </div>
      )}

      {/* Réactions */}
      {!isEditing && (
        <MessageReactions
          messageId={msg.id}
          reactions={msg.reactions || {}}
          currentUser={currentUserEmail}
          onReact={onReact}
        />
      )}

      {/* Boutons d'action */}
      {!isEditing && (
        <div className="message-actions">
          {isOwnMessage && (
            <button 
              onClick={() => setIsEditing(true)} 
              className="edit-button"
              title="Modifier le message"
            >
              ✏️ Modifier
            </button>
          )}
          <button 
            onClick={() => onDelete(msg.id)} 
            className="delete-button"
          >
            🗑️ 
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageCard;