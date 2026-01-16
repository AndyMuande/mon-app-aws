import React from 'react';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import './Filters.css';

export default function Filters({
  searchTerm,
  setSearchTerm,
  filterUser,
  setFilterUser,
  filterDate,
  setFilterDate,
  sortBy,
  setSortBy,
  users,
  totalMessages,
  filteredCount
}) {
  return (
    <div className="filters-container">
      {/* Ligne du haut : Recherche + Filtres */}
      <div className="filters-top-row">
        
        <div className="search-box">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <Filter size={14} />
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="filter-select">
              <option value="all">Utilisateurs</option>
              {users.map(user => <option key={user} value={user}>{user}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <Filter size={14} />
            <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="filter-select">
              <option value="all">Dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
            </select>
          </div>

          <div className="filter-group">
            {sortBy === 'newest' ? <SortDesc size={14} /> : <SortAsc size={14} />}
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
              <option value="newest">Récent</option>
              <option value="oldest">Ancien</option>
              <option value="user">Nom (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ligne du bas : Compteur */}
      <div className="results-count">
        {filteredCount === totalMessages ? (
          <span>📊 {totalMessages} message{totalMessages > 1 ? 's' : ''} au total</span>
        ) : (
          <span>🔍 {filteredCount} résultat{filteredCount > 1 ? 's' : ''} sur {totalMessages}</span>
        )}
      </div>
    </div>
  );
}