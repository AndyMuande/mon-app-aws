import React, { useState } from 'react';
import './MessageEditor.css';

export default function MessageEditor({ 
  message, 
  onSave, 
  onCancel 
}) {
  const [editedText, setEditedText] = useState(message.text);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editedText.trim()) {
      alert('Le message ne peut pas être vide');
      return;
    }

    if (editedText === message.text) {
      onCancel();
      return;
    }

    setSaving(true);
    await onSave(message.id, editedText);
    setSaving(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="message-editor">
      <textarea
        className="message-editor-input"
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        onKeyDown={handleKeyPress}
        autoFocus
        rows={3}
        disabled={saving}
      />
      
      <div className="message-editor-actions">
        <button
          className="editor-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '💾 Sauvegarde...' : '✓ Sauvegarder'}
        </button>
        <button
          className="editor-cancel-btn"
          onClick={onCancel}
          disabled={saving}
        >
          ✕ Annuler
        </button>
      </div>
      
      <div className="editor-hint">
        💡 Appuyez sur <kbd>Enter</kbd> pour sauvegarder, <kbd>Esc</kbd> pour annuler
      </div>
    </div>
  );
}