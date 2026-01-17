import React, { useState } from 'react';
import './MessageReactions.css';

const EMOJI_OPTIONS = [
  { emoji: '👍', name: 'Like' },
  { emoji: '❤️', name: 'Amour' },
  { emoji: '😂', name: 'Rire' },
  { emoji: '😮', name: 'Surpris' },
  { emoji: '😢', name: 'Triste' },
  { emoji: '🎉', name: 'Fête' }
];

export default function MessageReactions({ 
  messageId, 
  reactions = {}, 
  currentUser,
  onReact 
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [animatingEmoji, setAnimatingEmoji] = useState(null);

  const handleReaction = async (emoji) => {
    setAnimatingEmoji(emoji);
    setTimeout(() => setAnimatingEmoji(null), 300);
    
    await onReact(messageId, emoji, currentUser);
    setShowPicker(false);
  };

  // Calculer le total de réactions
  const totalReactions = Object.values(reactions).reduce(
    (sum, users) => sum + users.length, 
    0
  );

  return (
    <div className="message-reactions-container">
      {/* Réactions existantes */}
      {Object.keys(reactions).length > 0 && (
        <div className="reactions-list">
          {Object.entries(reactions).map(([emoji, users]) => (
            users.length > 0 && (
              <button
                key={emoji}
                className={`reaction-item ${users.includes(currentUser) ? 'active' : ''} ${animatingEmoji === emoji ? 'animating' : ''}`}
                onClick={() => handleReaction(emoji)}
                title={users.join(', ')}
              >
                <span className="reaction-emoji">{emoji}</span>
                <span className="reaction-count">{users.length}</span>
              </button>
            )
          ))}
        </div>
      )}

      {/* Bouton ajouter réaction */}
      <div className="reaction-picker-wrapper">
        <button
          className="add-reaction-btn"
          onClick={() => setShowPicker(!showPicker)}
          title="Ajouter une réaction"
        >
          {showPicker ? '✕' : '😊'}
        </button>

        {/* Picker d'emojis */}
        {showPicker && (
          <div className="emoji-picker">
            {EMOJI_OPTIONS.map(({ emoji, name }) => (
              <button
                key={emoji}
                className="emoji-option"
                onClick={() => handleReaction(emoji)}
                title={name}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compteur total */}
      {totalReactions > 0 && (
        <span className="total-reactions">
          {totalReactions} réaction{totalReactions > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}