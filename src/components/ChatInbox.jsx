import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Search, 
  User, 
  Phone, 
  Mail, 
  Building, 
  Tag, 
  Plus, 
  MessageCircle, 
  Clipboard,
  ExternalLink 
} from 'lucide-react';

function ChatInbox({ 
  clients, 
  activeChatId, 
  setActiveChatId, 
  onSendMessage, 
  onAddNote, 
  onUpdateStatus,
  quickReplies 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const messagesEndRef = useRef(null);
  
  const activeClient = clients.find(c => c.id === activeChatId) || null;

  // Auto-scroll messages to bottom on update or select
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeClient?.messages?.length, activeChatId]);

  // Format time helpers
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Get filtered thread list
  const filteredClients = clients
    .filter(c => {
      const search = searchTerm.toLowerCase();
      const nameMatch = c.name.toLowerCase().includes(search);
      const phoneMatch = c.phone.replace(/\D/g, '').includes(search);
      const companyMatch = c.company ? c.company.toLowerCase().includes(search) : false;
      const msgMatch = c.messages.some(m => m.body.toLowerCase().includes(search));
      return nameMatch || phoneMatch || companyMatch || msgMatch;
    })
    // Sort by last activity
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeClient) return;

    const textToSend = messageInput;
    setMessageInput('');
    await onSendMessage(activeClient.id, textToSend);
  };

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!noteInput.trim() || !activeClient) return;
    onAddNote(activeClient.id, noteInput);
    setNoteInput('');
  };

  const handleAddTagSubmit = async (e) => {
    e.preventDefault();
    if (!tagInput.trim() || !activeClient) return;

    // Check if tag already exists
    if (activeClient.tags.includes(tagInput.trim())) {
      setTagInput('');
      return;
    }

    const updatedTags = [...activeClient.tags, tagInput.trim()];
    
    // Call server to update tags
    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeClient.id,
          tags: updatedTags
        })
      });
      setTagInput('');
    } catch (err) {
      console.error("Failed to add tag:", err);
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    if (!activeClient) return;
    const updatedTags = activeClient.tags.filter(t => t !== tagToRemove);
    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeClient.id,
          tags: updatedTags
        })
      });
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  };

  const handleSelectQuickReply = (e) => {
    const qrId = e.target.value;
    if (!qrId) return;
    const selected = quickReplies.find(q => q.id === qrId);
    if (selected) {
      setMessageInput(prev => prev + selected.body);
    }
    e.target.value = ''; // Reset select dropdown
  };

  const getCleanPhone = (phoneStr) => {
    return phoneStr.replace(/\D/g, '');
  };

  return (
    <div className="inbox-container">
      {/* Threads List Panel */}
      <div className="inbox-list-panel">
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search className="search-icon-svg" size={16} />
            <input 
              type="text" 
              placeholder="Search chats, clients, tags..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="chat-threads-container">
          {filteredClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              No conversations found
            </div>
          ) : (
            filteredClients.map(client => {
              const lastMsg = client.messages.length > 0 ? client.messages[client.messages.length - 1] : null;
              const initials = client.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
              const isSelected = client.id === activeChatId;

              return (
                <div 
                  key={client.id} 
                  className={`chat-thread-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveChatId(client.id)}
                >
                  <div className="thread-avatar">
                    {initials || <User size={18} />}
                  </div>
                  
                  <div className="thread-info">
                    <div className="thread-header">
                      <span className="thread-name">{client.name}</span>
                      {lastMsg && (
                        <span className="thread-time">{formatTime(lastMsg.timestamp)}</span>
                      )}
                    </div>
                    <div className="thread-last-msg">
                      {lastMsg ? lastMsg.body : 'No messages logged'}
                    </div>
                    <div className="thread-footer">
                      <span className={`badge badge-${client.status.toLowerCase().replace(' ', '')}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                        {client.status}
                      </span>
                      {client.tags.length > 0 && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                          🏷️ {client.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Window Panel */}
      <div className="chat-window-panel">
        {activeClient ? (
          <>
            {/* Header */}
            <div className="chat-window-header">
              <div className="chat-active-info">
                <div className="thread-avatar" style={{ width: '40px', height: '40px', fontSize: '14px' }}>
                  {activeClient.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="chat-active-details">
                  <h3>{activeClient.name}</h3>
                  <p>{activeClient.phone}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <a 
                  href={`https://wa.me/${getCleanPhone(activeClient.phone)}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  title="Direct WhatsApp link"
                >
                  WhatsApp Web <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Message History */}
            <div className="chat-messages-container">
              {activeClient.messages.length === 0 ? (
                <div className="empty-state-view">
                  <MessageCircle size={36} className="empty-state-icon" />
                  <p style={{ fontSize: '13px' }}>No message logs. Send a quick template or type below.</p>
                </div>
              ) : (
                (() => {
                  let lastDate = '';
                  return activeClient.messages.map((msg, index) => {
                    const dateLabel = formatDateLabel(msg.timestamp);
                    const showDateSeparator = dateLabel !== lastDate;
                    lastDate = dateLabel;

                    return (
                      <React.Fragment key={msg.id || index}>
                        {showDateSeparator && (
                          <div style={{ alignSelf: 'center', margin: '8px 0', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-full)', fontSize: '10px', fontWeight: '600', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                            {dateLabel}
                          </div>
                        )}
                        <div className={`msg-wrapper ${msg.sender === 'client' ? 'inbound' : 'outbound'}`}>
                          <div className="msg-bubble">
                            {msg.body}
                          </div>
                          <div className="msg-meta">
                            {formatTime(msg.timestamp)}
                            {msg.sender === 'user' && <span style={{ color: 'var(--brand-color)' }}>✓</span>}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer Panel */}
            <div className="chat-input-panel">
              <form onSubmit={handleSend} className="chat-input-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Quick Replies Dropdown */}
                  <select 
                    onChange={handleSelectQuickReply}
                    className="filter-select" 
                    style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0, height: '36px' }}
                    defaultValue=""
                  >
                    <option value="" disabled>⚡ Quick Reply Template...</option>
                    {quickReplies.map(q => (
                      <option key={q.id} value={q.id}>{q.shortcut} - {q.title}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Press Send to sync. Output logs to outbox.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <textarea 
                    className="chat-input-textarea"
                    placeholder={`Reply to ${activeClient.name}...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '46px', height: '46px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="empty-state-view">
            <MessageCircle size={64} className="empty-state-icon" />
            <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '4px' }}>Inbox Center</h3>
            <p style={{ fontSize: '14px' }}>Select a conversation from the sidebar to view metrics, logs, and notes.</p>
          </div>
        )}
      </div>

      {/* Right Client Details Sidebar */}
      <div className="chat-detail-sidebar">
        {activeClient ? (
          <>
            {/* Quick Profile */}
            <div className="client-quick-profile">
              <div className="profile-avatar-large">
                {activeClient.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="profile-name">{activeClient.name}</div>
              <span className={`badge badge-${activeClient.status.toLowerCase().replace(' ', '')}`}>
                {activeClient.status}
              </span>
            </div>

            {/* Edit Pipeline Stage */}
            <div>
              <h4 className="sidebar-section-title">Pipeline Stage</h4>
              <select 
                className="filter-select"
                style={{ width: '100%', padding: '10px' }}
                value={activeClient.status}
                onChange={(e) => onUpdateStatus(activeClient.id, e.target.value)}
              >
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            {/* Client Info Details */}
            <div>
              <h4 className="sidebar-section-title">Contact Info</h4>
              <div className="quick-details-list">
                <div className="quick-detail-item">
                  <div className="quick-detail-label"><Phone size={12} style={{ display: 'inline', marginRight: '6px' }} /> Phone</div>
                  <div className="quick-detail-value">{activeClient.phone}</div>
                </div>
                <div className="quick-detail-item">
                  <div className="quick-detail-label"><Mail size={12} style={{ display: 'inline', marginRight: '6px' }} /> Email</div>
                  <div className="quick-detail-value">{activeClient.email || '—'}</div>
                </div>
                <div className="quick-detail-item">
                  <div className="quick-detail-label"><Building size={12} style={{ display: 'inline', marginRight: '6px' }} /> Company</div>
                  <div className="quick-detail-value">{activeClient.company || '—'}</div>
                </div>
              </div>
            </div>

            {/* Tags Widget */}
            <div>
              <h4 className="sidebar-section-title">Client Tags</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {activeClient.tags.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No tags added</span>
                ) : (
                  activeClient.tags.map((tag, idx) => (
                    <span key={idx} className="kanban-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                      {tag}
                      <button 
                        onClick={() => handleRemoveTag(tag)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <form onSubmit={handleAddTagSubmit} className="note-input-row">
                <input 
                  type="text" 
                  placeholder="New tag..." 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '8px' }}>
                  <Plus size={14} />
                </button>
              </form>
            </div>

            {/* Interaction Notes */}
            <div>
              <h4 className="sidebar-section-title">Interaction Notes</h4>
              <div className="sidebar-notes-container">
                <form onSubmit={handleAddNoteSubmit} className="note-input-row" style={{ marginBottom: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="Log a client update..." 
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px' }}>
                    <Plus size={14} />
                  </button>
                </form>
                
                <div className="sidebar-notes-list">
                  {activeClient.notes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      No interaction notes logged.
                    </div>
                  ) : (
                    activeClient.notes.map(note => (
                      <div key={note.id} className="sidebar-note-card">
                        <div className="note-card-text">{note.content}</div>
                        <div className="note-card-time">
                          {new Date(note.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Select a chat to view profile
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatInbox;
