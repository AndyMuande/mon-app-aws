import React, { useState, useEffect } from 'react';
import { Code, Book, Zap, Shield, Clock } from 'lucide-react';
import './ApiDocs.css';

const API_URL = 'https://4rca5iti3f.execute-api.eu-west-3.amazonaws.com/dev';

export default function ApiDocs() {
  const [docs, setDocs] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
    fetchHealth();
  }, []);

  const fetchDocs = async () => {
    try {
      const response = await fetch(`${API_URL}/messages/docs`);
      const data = await response.json();
      setDocs(data);
    } catch (error) {
      console.error('Erreur chargement docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/messages/health`);
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Erreur health check:', error);
    }
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: '#10b981',
      POST: '#3b82f6',
      PUT: '#f59e0b',
      DELETE: '#ef4444'
    };
    return colors[method] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="api-docs">
        <div className="loading">Chargement de la documentation...</div>
      </div>
    );
  }

  return (
    <div className="api-docs">
      <div className="docs-header">
        <Book size={48} />
        <h1>{docs?.title || 'API Documentation'}</h1>
        <p>{docs?.description}</p>
        <div className="docs-meta">
          <span className="badge">Version {docs?.version}</span>
          <span className="badge">{docs?.baseURL}</span>
        </div>
      </div>

      {/* Health Status */}
      {health && (
        <div className="health-status">
          <div className="health-card">
            <Zap size={24} />
            <div>
              <strong>Status</strong>
              <span className={health.status === 'ok' ? 'status-ok' : 'status-error'}>
                {health.status === 'ok' ? '✓ Opérationnel' : '✗ Erreur'}
              </span>
            </div>
          </div>
          <div className="health-card">
            <Clock size={24} />
            <div>
              <strong>Uptime</strong>
              <span>{Math.floor(health.uptime / 60)}m</span>
            </div>
          </div>
          <div className="health-card">
            <Shield size={24} />
            <div>
              <strong>Rate Limit</strong>
              <span>{docs?.rateLimiting?.requests}/min</span>
            </div>
          </div>
        </div>
      )}

      {/* Endpoints */}
      <div className="endpoints-section">
        <h2>📡 Endpoints disponibles</h2>
        {docs?.endpoints?.map((endpoint, index) => (
          <div key={index} className="endpoint-card">
            <div className="endpoint-header">
              <span 
                className="method-badge" 
                style={{ backgroundColor: getMethodColor(endpoint.method) }}
              >
                {endpoint.method}
              </span>
              <code className="endpoint-path">{endpoint.path}</code>
            </div>

            <p className="endpoint-description">{endpoint.description}</p>

            {endpoint.params && (
              <div className="endpoint-section">
                <strong>Paramètres URL :</strong>
                <pre>{JSON.stringify(endpoint.params, null, 2)}</pre>
              </div>
            )}

            {endpoint.queryParams && (
              <div className="endpoint-section">
                <strong>Query Parameters :</strong>
                <pre>{JSON.stringify(endpoint.queryParams, null, 2)}</pre>
              </div>
            )}

            {endpoint.body && (
              <div className="endpoint-section">
                <strong>Body :</strong>
                <pre>{JSON.stringify(endpoint.body, null, 2)}</pre>
              </div>
            )}

            <div className="endpoint-section">
              <strong>Réponse :</strong>
              <pre>{JSON.stringify(endpoint.response, null, 2)}</pre>
            </div>

            {endpoint.errors && (
              <div className="endpoint-section errors">
                <strong>Codes d'erreur :</strong>
                <ul>
                  {Object.entries(endpoint.errors).map(([code, desc]) => (
                    <li key={code}>
                      <code>{code}</code> - {desc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="endpoint-auth">
              {endpoint.authentication ? '🔒 Authentification requise' : '🌐 Public'}
            </div>
          </div>
        ))}
      </div>

      {/* Error Codes */}
      <div className="error-codes-section">
        <h2>⚠️ Codes d'erreur HTTP</h2>
        <div className="error-codes-grid">
          {Object.entries(docs?.errorCodes || {}).map(([code, description]) => (
            <div key={code} className="error-code-card">
              <code className="error-code">{code}</code>
              <span>{description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="rate-limit-section">
        <h2>⏱️ Rate Limiting</h2>
        <div className="rate-limit-info">
          <Code size={32} />
          <div>
            <p>
              Limite : <strong>{docs?.rateLimiting?.requests} requêtes</strong> 
              {' '}par <strong>{docs?.rateLimiting?.window}</strong>
            </p>
            <p>
              Code d'erreur : <code>{docs?.rateLimiting?.errorCode}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}