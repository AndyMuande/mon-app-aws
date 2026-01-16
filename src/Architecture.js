import React, { useState } from 'react';
import { Folder, FileCode, Server, Database, Cloud, ChevronRight, ChevronDown, ShieldCheck, Key, Lock } from 'lucide-react';
import './Architecture.css';

const Architecture = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="architecture-section">
      <div className="arch-header" onClick={() => setIsOpen(!isOpen)}>
        <h3><Server size={20} /> Structure du Projet Fullstack</h3>
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} /> }
      </div>

      {isOpen && (
        <div className="arch-content">
          {/* COLONNE 1 : INFRASTRUCTURE */}
          <div className="arch-column">
            <h4><Cloud size={18} color="#667eea" /> Infrastructure AWS</h4>
            <ul className="tree">
              <li><Database size={16} /> <strong>DynamoDB:</strong> Table 'Messages'</li>
              <li><Server size={16} /> <strong>Lambda:</strong> Logique CRUD</li>
              <li><Cloud size={16} /> <strong>API Gateway:</strong> Point d'entrée REST</li>
            </ul>
          </div>

          {/* COLONNE 2 : FRONTEND */}
          <div className="arch-column">
            <h4><FileCode size={18} color="#764ba2" /> Frontend (React)</h4>
            <ul className="tree">
              <li><Folder size={16} /> <strong>Components</strong>
                <ul>
                  <li>MessageList / MessageCard</li>
                  <li>MessageForm / Filters</li>
                </ul>
              </li>
              <li><FileCode size={16} /> <strong>App.js:</strong> State Management</li>
            </ul>
          </div>

          {/* COLONNE 3 : SÉCURITÉ (NOUVELLE) */}
          <div className="arch-column">
            <h4><ShieldCheck size={18} color="#27ae60" /> Sécurité & Auth</h4>
            <ul className="tree">
              <li><Lock size={16} /> <strong>AWS Cognito:</strong> Gestion User Pool</li>
              <li><Key size={16} /> <strong>Amplify Auth:</strong> Sessions & JWT</li>
              <li><ShieldCheck size={16} /> <strong>Protected UI:</strong> HOC Wrapper</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Architecture;