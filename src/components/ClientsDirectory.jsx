import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  MessageSquare, 
  FileText, 
  Plus, 
  X, 
  ExternalLink,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import SmartParser from './SmartParser';

function ClientsDirectory({ 
  clients, 
  onUpdateStatus, 
  onAddNote, 
  onSendMessage, 
  onDeleteClient,
  onOpenAddModal 
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClientForTimeline, setSelectedClientForTimeline] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [showSmartParser, setShowSmartParser] = useState(false);

  // Monday-style Inline Editing State
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [tempBudgetVal, setTempBudgetVal] = useState('');

  // Filter clients
  const filteredClients = clients.filter(c => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      c.name.toLowerCase().includes(searchLower) ||
      c.phone.replace(/\D/g, '').includes(searchLower) ||
      (c.email && c.email.toLowerCase().includes(searchLower)) ||
      (c.company && c.company.toLowerCase().includes(searchLower)) ||
      c.tags.some(t => t.toLowerCase().includes(searchLower)) ||
      (c.source && c.source.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSaveInlineBudget = async (clientId) => {
    setEditingBudgetId(null);
    const num = Number(tempBudgetVal) || 0;
    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, budget: num })
      });
    } catch (err) {
      console.error("Failed to save inline budget:", err);
    }
  };

  const handleSaveInlineSource = async (clientId, newSource) => {
    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, source: newSource })
      });
    } catch (err) {
      console.error("Failed to save inline source:", err);
    }
  };

  // Calculate chronological timeline events (Notes + Messages together)
  const getTimelineEvents = (client) => {
    if (!client) return [];
    
    const events = [];

    // Add notes
    client.notes.forEach(note => {
      events.push({
        id: note.id,
        type: 'note',
        title: 'Note Logged',
        description: note.content,
        timestamp: note.createdAt
      });
    });

    // Add messages
    client.messages.forEach(msg => {
      events.push({
        id: msg.id,
        type: 'message',
        title: msg.sender === 'client' ? 'Received Message' : 'Sent Message',
        description: msg.body,
        timestamp: msg.timestamp
      });
    });

    // Add creation date
    events.push({
      id: 'creation',
      type: 'system',
      title: 'Contact Created',
      description: `Client profile initialized in stage: ${client.status}`,
      timestamp: client.createdAt
    });

    // Sort newest first
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const handleAddNoteInDrawer = (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedClientForTimeline) return;
    
    onAddNote(selectedClientForTimeline.id, newNoteText);
    
    // Update local state instance to reflect immediately in the drawer
    const updatedClient = clients.find(c => c.id === selectedClientForTimeline.id);
    if (updatedClient) {
      setTimeout(() => {
        setSelectedClientForTimeline(clients.find(c => c.id === selectedClientForTimeline.id));
      }, 50);
    }
    setNewNoteText('');
  };

  const activeTimelineEvents = getTimelineEvents(selectedClientForTimeline);

  // Sum visible budgets
  const totalVisibleBudget = filteredClients.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);

  return (
    <div className="view-container" style={{ position: 'relative' }}>
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h2>Client Database</h2>
          <p>Spreadsheet grid management for budgets, attribution sources, and logs</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowSmartParser(!showSmartParser)}
            style={{ borderColor: showSmartParser ? 'var(--brand-color)' : 'var(--border-color)', color: showSmartParser ? 'var(--brand-color)' : 'white' }}
          >
            <ClipboardList size={16} /> 
            {showSmartParser ? 'Hide Paste Parser' : 'Smart Paste Import'}
          </button>
          <button className="btn btn-primary" onClick={onOpenAddModal}>
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Smart Parser Widget */}
      {showSmartParser && (
        <div className="card" style={{ animation: 'fadeIn 0.25s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'white', fontSize: '16px' }}>WhatsApp Smart Text Import</h3>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowSmartParser(false)}>
              <X size={16} />
            </button>
          </div>
          <SmartParser onParseSuccess={(client) => {
            setShowSmartParser(false);
            setSelectedClientForTimeline(client);
          }} />
        </div>
      )}

      {/* Table Actions Filter Panel */}
      <div className="card directory-actions" style={{ padding: '16px 20px' }}>
        <div className="search-input-wrapper" style={{ width: '300px' }}>
          <Search className="search-icon-svg" size={16} />
          <input 
            type="text" 
            placeholder="Search name, phone, source..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">📁 All Stages</option>
            <option value="New Lead">New Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Proposal">Proposal</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Monday Spreadsheet Grid */}
      <div className="table-wrapper">
        <table className="client-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Company</th>
              <th>WhatsApp Phone</th>
              <th>Lead Channel</th>
              <th>Deal Budget</th>
              <th>Stage Status</th>
              <th>Tags</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  No contacts found matching the selected filters.
                </td>
              </tr>
            ) : (
              <>
                {filteredClients.map(client => (
                  <tr key={client.id}>
                    {/* Name */}
                    <td style={{ fontWeight: '600', color: 'white' }}>{client.name}</td>
                    
                    {/* Company */}
                    <td>{client.company || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    
                    {/* Phone */}
                    <td>{client.phone}</td>
                    
                    {/* Channel Source dropdown */}
                    <td>
                      <select 
                        className="grid-select-edit"
                        value={client.source || 'Manual'}
                        onChange={(e) => handleSaveInlineSource(client.id, e.target.value)}
                      >
                        <option value="Meta Ads">Meta Ads</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Organic">Organic</option>
                        <option value="WhatsApp Link">WhatsApp Link</option>
                        <option value="Manual">Manual</option>
                      </select>
                    </td>

                    {/* Double Click Edit Budget cell */}
                    <td>
                      {editingBudgetId === client.id ? (
                        <input 
                          type="number"
                          className="grid-input-edit"
                          value={tempBudgetVal}
                          onChange={(e) => setTempBudgetVal(e.target.value)}
                          autoFocus
                          onBlur={() => handleSaveInlineBudget(client.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineBudget(client.id);
                            if (e.key === 'Escape') setEditingBudgetId(null);
                          }}
                        />
                      ) : (
                        <span 
                          className="grid-cell-editable"
                          onDoubleClick={() => {
                            setEditingBudgetId(client.id);
                            setTempBudgetVal(client.budget || 0);
                          }}
                          title="Double-click to edit budget"
                          style={{ fontWeight: '600', color: 'var(--brand-color)' }}
                        >
                          {client.budget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(client.budget) : '$0'}
                        </span>
                      )}
                    </td>
                    
                    {/* Status Dropdown */}
                    <td>
                      <select
                        className={`badge badge-${client.status.toLowerCase().replace(' ', '')}`}
                        style={{ border: 'none', cursor: 'pointer', outline: 'none', background: 'inherit' }}
                        value={client.status}
                        onChange={(e) => onUpdateStatus(client.id, e.target.value)}
                      >
                        <option value="New Lead">New Lead</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </td>

                    {/* Tags */}
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {client.tags.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                        ) : (
                          client.tags.map((t, idx) => (
                            <span key={idx} className="kanban-tag">{t}</span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => setSelectedClientForTimeline(client)}
                          title="View timeline history"
                        >
                          <FileText size={14} /> Timeline
                        </button>
                        <a 
                          href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--brand-color)' }}
                          title="Chat on WhatsApp Web"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => onDeleteClient(client.id)}
                          title="Delete client"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* Total Summary Row (Monday-style) */}
                <tr className="total-summary-row">
                  <td colSpan="4" style={{ textAlign: 'left', padding: '16px', color: 'white' }}>Total Pipeline Value:</td>
                  <td style={{ color: 'var(--brand-color)', fontWeight: '800', fontSize: '15px' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalVisibleBudget)}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Sliding Side Drawer for timeline history */}
      {selectedClientForTimeline && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 850 }}
            onClick={() => setSelectedClientForTimeline(null)}
          ></div>
          
          <div className={`drawer-overlay ${selectedClientForTimeline ? 'open' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ color: 'white', fontSize: '18px' }}>{selectedClientForTimeline.name}</h3>
                <span className={`badge badge-${selectedClientForTimeline.status.toLowerCase().replace(' ', '')}`} style={{ marginTop: '4px' }}>
                  {selectedClientForTimeline.status}
                </span>
              </div>
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setSelectedClientForTimeline(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Note logging inside drawer */}
            <form onSubmit={handleAddNoteInDrawer} className="form-group" style={{ margin: '16px 0 0 0' }}>
              <label>Quick Log Note</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Log a call, request, or proposal..." 
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '10px' }}>
                  Save
                </button>
              </div>
            </form>

            {/* Timeline Events Scroll Area */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              <h4 className="sidebar-section-title">Activity Timeline</h4>
              
              <div className="timeline-list">
                {activeTimelineEvents.map((evt, idx) => {
                  let badgeBg = 'var(--brand-color)';
                  if (evt.type === 'message') badgeBg = 'var(--accent-blue)';
                  if (evt.type === 'system') badgeBg = 'var(--text-muted)';

                  return (
                    <div key={evt.id || idx} className="timeline-node">
                      <span 
                        style={{ position: 'absolute', left: '-16px', top: '6px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: badgeBg, border: '2px solid var(--bg-secondary)', display: 'inline-block' }}
                      ></span>
                      <div className="timeline-node-title" style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{evt.title}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                          {new Date(evt.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="timeline-node-desc" style={{ color: evt.type === 'note' ? 'white' : 'var(--text-secondary)', background: evt.type === 'note' ? 'rgba(255,255,255,0.02)' : 'transparent', padding: evt.type === 'note' ? '8px' : '0', borderRadius: '4px', border: evt.type === 'note' ? '1px solid var(--border-color)' : 'none' }}>
                        {evt.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ClientsDirectory;
