import React, { useState, useEffect } from 'react';
import { Moon, Sun, Palette } from 'lucide-react';
import './ThemeToggle.css';

const THEMES = {
  default: {
    name: 'Violet (Défaut)',
    primary: '#667eea',
    secondary: '#764ba2',
    emoji: '💜'
  },
  blue: {
    name: 'Bleu Océan',
    primary: '#4e54c8',
    secondary: '#8f94fb',
    emoji: '💙'
  },
  green: {
    name: 'Vert Nature',
    primary: '#56ab2f',
    secondary: '#a8e063',
    emoji: '💚'
  },
  orange: {
    name: 'Orange Sunset',
    primary: '#f2994a',
    secondary: '#f2c94c',
    emoji: '🧡'
  },
  pink: {
    name: 'Rose Doux',
    primary: '#ee0979',
    secondary: '#ff6a00',
    emoji: '💗'
  }
};

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  const [showPanel, setShowPanel] = useState(false);

  // Charger les préférences au démarrage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedMode = localStorage.getItem('darkMode');
    
    if (savedTheme && THEMES[savedTheme]) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    }
    
    if (savedMode === 'true') {
      setIsDark(true);
      document.documentElement.classList.add('dark-mode');
    }
  }, []);

  // Appliquer un thème
  const applyTheme = (themeKey) => {
    const theme = THEMES[themeKey];
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--secondary-color', theme.secondary);
    document.documentElement.style.setProperty('--gradient', `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    localStorage.setItem('darkMode', newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  // Changer de thème
  const changeTheme = (themeKey) => {
    setCurrentTheme(themeKey);
    applyTheme(themeKey);
    localStorage.setItem('theme', themeKey);
    setShowPanel(false);
  };

  return (
    <>
      {/* Bouton flottant */}
      <div className="theme-toggle-wrapper">
        <button 
          className="theme-toggle-btn"
          onClick={() => setShowPanel(!showPanel)}
          title="Personnaliser le thème"
        >
          <Palette size={24} />
        </button>

        <button 
          className="dark-mode-btn"
          onClick={toggleDarkMode}
          title={isDark ? 'Mode clair' : 'Mode sombre'}
        >
          {isDark ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      {/* Panneau de thèmes */}
      {showPanel && (
        <>
          <div 
            className="theme-panel-overlay" 
            onClick={() => setShowPanel(false)}
          />
          <div className="theme-panel">
            <div className="theme-panel-header">
              <h3>🎨 Personnalisation</h3>
              <button onClick={() => setShowPanel(false)}>✕</button>
            </div>

            <div className="theme-panel-content">
              <div className="theme-section">
                <h4>Mode d'affichage</h4>
                <div className="mode-toggle">
                  <button
                    className={`mode-option ${!isDark ? 'active' : ''}`}
                    onClick={() => {
                      if (isDark) toggleDarkMode();
                    }}
                  >
                    <Sun size={20} />
                    <span>Clair</span>
                  </button>
                  <button
                    className={`mode-option ${isDark ? 'active' : ''}`}
                    onClick={() => {
                      if (!isDark) toggleDarkMode();
                    }}
                  >
                    <Moon size={20} />
                    <span>Sombre</span>
                  </button>
                </div>
              </div>

              <div className="theme-section">
                <h4>Thème de couleur</h4>
                <div className="theme-options">
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <button
                      key={key}
                      className={`theme-option ${currentTheme === key ? 'active' : ''}`}
                      onClick={() => changeTheme(key)}
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`
                      }}
                    >
                      <span className="theme-emoji">{theme.emoji}</span>
                      <span className="theme-name">{theme.name}</span>
                      {currentTheme === key && (
                        <span className="theme-check">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="theme-info">
                <p>💡 Vos préférences sont sauvegardées automatiquement</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}