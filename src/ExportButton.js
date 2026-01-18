import React, { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import './ExportButton.css';

export default function ExportButton({ messages, currentUserEmail }) {
  const [showMenu, setShowMenu] = useState(false);
  const [onlyMyMessages, setOnlyMyMessages] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filtrer les messages
  const getMessagesToExport = () => {
    if (onlyMyMessages) {
      return messages.filter(msg => msg.user === currentUserEmail);
    }
    return messages;
  };

  // Export JSON
  const exportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      exportedBy: currentUserEmail,
      totalMessages: getMessagesToExport().length,
      filter: onlyMyMessages ? 'Mes messages uniquement' : 'Tous les messages',
      messages: getMessagesToExport()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, `messages_${getTimestamp()}.json`);
  };

  // Export CSV
  const exportCSV = () => {
    const messagesToExport = getMessagesToExport();
    
    // En-têtes
    let csv = 'ID,Utilisateur,Message,Date,Réactions,Modifié\n';
    
    // Lignes
    messagesToExport.forEach(msg => {
      const reactions = msg.reactions 
        ? Object.entries(msg.reactions)
            .map(([emoji, users]) => `${emoji}: ${users.length}`)
            .join('; ')
        : '';
      
      const edited = msg.edited ? 'Oui' : 'Non';
      const text = `"${msg.text.replace(/"/g, '""')}"`;
      const date = new Date(msg.timestamp).toLocaleString('fr-FR');
      
      csv += `${msg.id},${msg.user},${text},"${date}","${reactions}",${edited}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `messages_${getTimestamp()}.csv`);
  };

  // Export TXT
  const exportTXT = () => {
    const messagesToExport = getMessagesToExport();
    
    let txt = '═══════════════════════════════════════\n';
    txt += '    EXPORT DES MESSAGES\n';
    txt += '═══════════════════════════════════════\n';
    txt += `Date d'export : ${new Date().toLocaleString('fr-FR')}\n`;
    txt += `Exporté par : ${currentUserEmail}\n`;
    txt += `Filtre : ${onlyMyMessages ? 'Mes messages uniquement' : 'Tous les messages'}\n`;
    txt += `Total : ${messagesToExport.length} message(s)\n\n`;

    messagesToExport.forEach(msg => {
      txt += '───────────────────────────────────────\n';
      txt += `[${new Date(msg.timestamp).toLocaleString('fr-FR')}] ${msg.user}\n`;
      txt += `${msg.text}\n`;
      
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        const reactions = Object.entries(msg.reactions)
          .map(([emoji, users]) => `${emoji} ${users.length}`)
          .join(' | ');
        txt += `Réactions : ${reactions}\n`;
      }
      
      if (msg.edited) {
        txt += `✏️ Modifié le ${new Date(msg.editedAt).toLocaleString('fr-FR')}\n`;
      }
      
      txt += '\n';
    });

    txt += '═══════════════════════════════════════\n';
    txt += `Fin de l'export - ${messagesToExport.length} message(s)\n`;
    txt += '═══════════════════════════════════════\n';

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    downloadFile(blob, `messages_${getTimestamp()}.txt`);
  };

  // Fonction de téléchargement
  const downloadFile = (blob, filename) => {
    setExporting(true);
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setTimeout(() => {
      setExporting(false);
      setShowMenu(false);
    }, 500);
  };

  // Timestamp pour nom de fichier
  const getTimestamp = () => {
    return new Date().toISOString().split('T')[0] + '_' + 
           new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  };

  return (
    <div className="export-button-wrapper">
      <button
        className={`export-btn ${exporting ? 'exporting' : ''}`}
        onClick={() => setShowMenu(!showMenu)}
        disabled={messages.length === 0}
        title={messages.length === 0 ? 'Aucun message à exporter' : 'Exporter les messages'}
      >
        <Download size={20} />
        {exporting ? 'Export...' : 'Exporter'}
      </button>

      {showMenu && (
        <>
          <div 
            className="export-overlay" 
            onClick={() => setShowMenu(false)}
          />
          <div className="export-menu">
            <div className="export-menu-header">
              <h3>📥 Exporter les messages</h3>
            </div>

            <div className="export-options">
              <button 
                className="export-option"
                onClick={exportJSON}
              >
                <FileJson size={20} />
                <div>
                  <strong>JSON</strong>
                  <span>Données structurées</span>
                </div>
              </button>

              <button 
                className="export-option"
                onClick={exportCSV}
              >
                <FileSpreadsheet size={20} />
                <div>
                  <strong>CSV</strong>
                  <span>Compatible Excel</span>
                </div>
              </button>

              <button 
                className="export-option"
                onClick={exportTXT}
              >
                <FileText size={20} />
                <div>
                  <strong>TXT</strong>
                  <span>Format lisible</span>
                </div>
              </button>
            </div>

            <div className="export-filter">
              <label>
                <input
                  type="checkbox"
                  checked={onlyMyMessages}
                  onChange={(e) => setOnlyMyMessages(e.target.checked)}
                />
                <span>Mes messages uniquement</span>
              </label>
              <span className="export-count">
                {getMessagesToExport().length} message(s)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}