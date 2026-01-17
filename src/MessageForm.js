import React from 'react';
import './MessageForm.css';

const MessageForm = ({ 
  newMessage, 
  setNewMessage, 
  handleSubmit, 
  handleImageSelect, 
  imagePreview, 
  clearImage, 
  loading, 
  error, 
  setError 
}) => {
  return (
    <div className="message-form">
      <h2>Nouveau Message</h2>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="Écrivez votre message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="textarea-field"
          rows="8"
          required
        />

        {/* Sélection d'image */}
        <div className="image-upload">
          <label htmlFor="image-input" className="upload-button">
            📷 Ajouter une image
          </label>
          <input
            id="image-input"
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Prévisualisation */}
        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="Preview" />
            <button 
              type="button" 
              onClick={clearImage}
              className="remove-image"
            >
              ✕ Retirer
            </button>
          </div>
        )}

        <button 
          type="submit" 
          className="submit-button"
          disabled={loading}
        >
          {loading ? '⏳ Envoi...' : '📤 Envoyer'}
        </button>
      </form>
    </div>
  );
};

export default MessageForm;