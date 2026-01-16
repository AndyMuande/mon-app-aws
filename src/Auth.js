import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './Auth.css';

export default function Auth({ children }) {
  return (
    <Authenticator
      signUpAttributes={['email']}
      components={{
        SignIn: {
          Header() {
            return (
              <div className="auth-custom-header">
                <h1>🔐</h1>
                <h2>Connexion</h2>
                <p>Connectez-vous à votre messagerie AWS</p>
              </div>
            );
          },
        },
        SignUp: {
          Header() {
            return (
              <div className="auth-custom-header">
                <h1>✨</h1>
                <h2>Inscription</h2>
                <p>Créez votre compte gratuitement</p>
              </div>
            );
          },
        },
      }}
      formFields={{
        signIn: {
          username: { label: 'Email', placeholder: 'Entrez votre email' },
          password: { label: 'Mot de passe', placeholder: 'Entrez votre mot de passe' },
        },
        signUp: {
          email: { label: 'Email', placeholder: 'Entrez votre email', order: 1 },
          password: { label: 'Mot de passe', placeholder: 'Créez un mot de passe', order: 2 },
          confirm_password: { label: 'Confirmer le mot de passe', placeholder: 'Confirmez', order: 3 },
        },
      }}
    >
      {/* C'est ici que la magie opère : 
          On reçoit signOut et user d'Amplify et on les injecte dans ton App.js
      */}
      {({ signOut, user }) => {
        // Cas 1 : Si children est une fonction (ton cas actuel dans App.js)
        if (typeof children === 'function') {
          return children({ signOut, user });
        }

        // Cas 2 : Si children est un composant React simple
        if (React.isValidElement(children)) {
          return React.cloneElement(children, { signOut, user });
        }

        // Cas 3 : Retour par défaut
        return children;
      }}
    </Authenticator>
  );
}