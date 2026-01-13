import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './Auth.css';

export default function Auth({ children }) {
  return (
    <Authenticator
      // Configuration des champs du formulaire
      signUpAttributes={['email']}
      
      // Personnalisation des textes en français
      components={{
        SignIn: {
          Header() {
            return (
              <div style={{ textAlign: 'center', padding: '2rem 0 1rem' }}>
                <h1 style={{ margin: 0, fontSize: '2rem' }}>🔐</h1>
                <h2 style={{ margin: '0.5rem 0', color: '#667eea' }}>
                  Connexion
                </h2>
                <p style={{ color: '#666' }}>
                  Connectez-vous à votre compte
                </p>
              </div>
            );
          },
        },
        SignUp: {
          Header() {
            return (
              <div style={{ textAlign: 'center', padding: '2rem 0 1rem' }}>
                <h1 style={{ margin: 0, fontSize: '2rem' }}>✨</h1>
                <h2 style={{ margin: '0.5rem 0', color: '#667eea' }}>
                  Inscription
                </h2>
                <p style={{ color: '#666' }}>
                  Créez votre compte gratuitement
                </p>
              </div>
            );
          },
        },
      }}
      
      // Labels en français
      formFields={{
        signIn: {
          username: {
            label: 'Email',
            placeholder: 'Entrez votre email',
          },
          password: {
            label: 'Mot de passe',
            placeholder: 'Entrez votre mot de passe',
          },
        },
        signUp: {
          email: {
            label: 'Email',
            placeholder: 'Entrez votre email',
            order: 1,
          },
          password: {
            label: 'Mot de passe',
            placeholder: 'Créez un mot de passe',
            order: 2,
          },
          confirm_password: {
            label: 'Confirmer le mot de passe',
            placeholder: 'Confirmez votre mot de passe',
            order: 3,
          },
        },
      }}
    >
      {({ signOut, user }) => (
        <div>
          {children}
          
          {/* Bouton de déconnexion flottant */}
          <button
            onClick={signOut}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              zIndex: 1000,
            }}
          >
            🚪 Déconnexion
          </button>
          
          {/* Info utilisateur */}
          <div
            style={{
              position: 'fixed',
              top: '80px',
              right: '20px',
              padding: '10px 15px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontSize: '0.9rem',
              zIndex: 1000,
            }}
          >
            👤 {user.signInDetails?.loginId || user.username}
          </div>
        </div>
      )}
    </Authenticator>
  );
}