import React from 'react';
import './MessageList.css'; // <--- L'IMPORTATION EST ICI
import MessageCard from './MessageCard'; // <--- CETTE LIGNE EST OBLIGATOIRE ICI

const MessageList = ({ messages, onDelete, currentUserEmail, loading }) => {
  if (loading && messages.length === 0) {
    return <div className="messages-loading">Chargement des messages...</div>;
  }

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
          />
        ))
      )}
    </div>
  );
};

export default MessageList;