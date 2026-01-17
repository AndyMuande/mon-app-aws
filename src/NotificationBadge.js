import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import './NotificationBadge.css';

export default function NotificationBadge({ 
  unreadCount, 
  notifications, 
  onMarkAsRead,
  onClearAll 
}) {
  const [showPanel, setShowPanel] = useState(false);
  const [shake, setShake] = useState(false);

  // Animation shake quand nouveau message
  useEffect(() => {
    if (unreadCount > 0) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }, [unreadCount]);

  return (
    <div className="notification-badge-wrapper">
      <button 
        className={`notification-btn ${shake ? 'shake' : ''}`}
        onClick={() => setShowPanel(!showPanel)}
        title={`${unreadCount} nouvelle${unreadCount > 1 ? 's' : ''} notification${unreadCount > 1 ? 's' : ''}`}
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="badge-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div 
            className="notification-overlay" 
            onClick={() => setShowPanel(false)}
          />
          <div className="notification-panel">
            <div className="notification-header">
              <h3>
                🔔 Notifications 
                {unreadCount > 0 && <span className="count">({unreadCount})</span>}
              </h3>
              <div className="notification-actions">
                {unreadCount > 0 && (
                  <button 
                    onClick={onClearAll}
                    className="clear-all-btn"
                  >
                    Tout lire
                  </button>
                )}
                <button 
                  onClick={() => setShowPanel(false)}
                  className="close-btn"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="empty-notifications">
                  <Bell size={48} className="empty-icon" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`notification-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => onMarkAsRead(notif.id)}
                  >
                    <div className="notification-icon">
                      {notif.type === 'new_message' ? '💬' : '🔔'}
                    </div>
                    <div className="notification-content">
                      <p className="notification-message">{notif.message}</p>
                      <span className="notification-time">
                        {new Date(notif.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    {!notif.read && (
                      <div className="unread-dot"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}