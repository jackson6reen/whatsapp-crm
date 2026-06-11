import React, { useState } from 'react';
import { Plus, Copy, Trash2, Edit3, X, Check } from 'lucide-react';

function QuickReplies({ quickReplies, setQuickReplies }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  // Form State
  const [editId, setEditId] = useState(null);
  const [shortcut, setShortcut] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenAdd = () => {
    setEditId(null);
    setShortcut('/');
    setTitle('');
    setBody('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (reply) => {
    setEditId(reply.id);
    setShortcut(reply.shortcut);
    setTitle(reply.title);
    setBody(reply.body);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!shortcut.startsWith('/')) {
      setErrorMsg('Shortcuts must begin with a forward slash (e.g., /hello)');
      return;
    }
    if (!title || !body) {
      setErrorMsg('Title and template text body are required.');
      return;
    }

    try {
      const res = await fetch('/api/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          shortcut,
          title,
          body
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save quick reply.');
      } else {
        if (editId) {
          // Update
          setQuickReplies(prev => prev.map(q => q.id === editId ? data : q));
        } else {
          // Add new
          setQuickReplies(prev => [...prev, data]);
        }
        setIsModalOpen(false);
      }
    } catch (err) {
      setErrorMsg('Server connection failed. Could not write quick replies.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this template response?")) return;
    try {
      const res = await fetch(`/api/quick-replies/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setQuickReplies(prev => prev.filter(q => q.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete quick reply:", err);
    }
  };

  const handleCopyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h2>Quick Replies Manager</h2>
          <p>Create canned text snippets that you can copy to your clipboard or send directly in chat</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Grid List */}
      <div className="quick-replies-grid">
        {quickReplies.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            No quick reply templates created. Click "New Template" above to initialize your first snippet.
          </div>
        ) : (
          quickReplies.map(reply => (
            <div key={reply.id} className="card quick-reply-card">
              <div>
                <div className="quick-reply-header">
                  <span className="quick-reply-shortcut">{reply.shortcut}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px', borderRadius: '6px' }}
                      onClick={() => handleOpenEdit(reply)}
                      title="Edit response"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '6px', borderRadius: '6px' }}
                      onClick={() => handleDelete(reply.id)}
                      title="Delete response"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                
                <h4 style={{ color: 'white', fontSize: '15px', marginBottom: '8px' }}>{reply.title}</h4>
                <p className="quick-reply-body">{reply.body}</p>
              </div>

              <div className="quick-reply-actions">
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: copiedId === reply.id ? 'var(--brand-color)' : 'var(--border-color)', color: copiedId === reply.id ? 'var(--brand-color)' : 'white' }}
                  onClick={() => handleCopyToClipboard(reply.body, reply.id)}
                >
                  {copiedId === reply.id ? (
                    <>
                      <Check size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy to Clipboard
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '20px', color: 'white' }}>
                {editId ? 'Edit Quick Reply' : 'Create Quick Reply'}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {errorMsg && (
                <div style={{ color: '#f87171', background: 'rgba(239, 44, 44, 0.1)', border: '1px solid rgba(239, 44, 44, 0.2)', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                  {errorMsg}
                </div>
              )}
              <div className="form-group">
                <label>Shortcut Keyword *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. /pricing (must start with /)" 
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Template Title / Label *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. standard price catalog" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Template Message Text *</label>
                <textarea 
                  className="form-control" 
                  placeholder="Type the message body that will be copied or sent..." 
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows="5"
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickReplies;
