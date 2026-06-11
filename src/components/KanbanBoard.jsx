import React, { useState } from 'react';
import { MessageSquare, Calendar, ChevronRight, Play } from 'lucide-react';

function KanbanBoard({ clients, onUpdateStatus, onNavigate }) {
  const [draggedClientId, setDraggedClientId] = useState(null);
  const [activeOverStage, setActiveOverStage] = useState(null);

  const stages = [
    { name: 'New Lead', color: '#3b82f6', desc: 'Incoming requests' },
    { name: 'Contacted', color: '#8b5cf6', desc: 'Initial contact made' },
    { name: 'Proposal', color: '#f59e0b', desc: 'Pricing proposal sent' },
    { name: 'Negotiation', color: '#ec4899', desc: 'Contract discussions' },
    { name: 'Won', color: '#10b981', desc: 'Deal closed successfully' },
    { name: 'Lost', color: '#ef4444', desc: 'Deal lost/archived' }
  ];

  // Drag and Drop Handlers
  const handleDragStart = (e, clientId) => {
    setDraggedClientId(clientId);
    e.dataTransfer.setData('text/plain', clientId);
    // Visual effect
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedClientId(null);
    setActiveOverStage(null);
  };

  const handleDragOver = (e, stageName) => {
    e.preventDefault();
    if (activeOverStage !== stageName) {
      setActiveOverStage(stageName);
    }
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('text/plain') || draggedClientId;
    if (clientId) {
      onUpdateStatus(clientId, targetStage);
    }
    setDraggedClientId(null);
    setActiveOverStage(null);
  };

  const getClientLastActivity = (client) => {
    const lastDate = new Date(client.updatedAt);
    return lastDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="view-container" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h2>Sales Pipeline</h2>
          <p>Drag and drop clients to manage sales progress and follow-up states</p>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="kanban-grid">
        {stages.map(stage => {
          const stageClients = clients.filter(c => c.status === stage.name);
          const isOver = activeOverStage === stage.name;

          return (
            <div 
              key={stage.name} 
              className="kanban-column"
              onDragOver={(e) => handleDragOver(e, stage.name)}
              onDrop={(e) => handleDrop(e, stage.name)}
              style={{
                borderColor: isOver ? stage.color : 'var(--border-color)',
                backgroundColor: isOver ? 'rgba(255, 255, 255, 0.02)' : 'rgba(13, 18, 32, 0.4)',
                boxShadow: isOver ? `0 0 15px ${stage.color}15` : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Column Header */}
              <div className="kanban-column-header">
                <div className="kanban-column-title" style={{ color: stage.color }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage.color, marginRight: '8px', display: 'inline-block' }}></span>
                  {stage.name}
                </div>
                <span className="kanban-column-count">{stageClients.length}</span>
              </div>
              
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-8px' }}>
                {stage.desc}
              </span>

              {/* Cards Container */}
              <div className="kanban-cards-container">
                {stageClients.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', fontSize: '12px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                    Empty Stage
                  </div>
                ) : (
                  stageClients.map(client => {
                    const lastMessage = client.messages.length > 0 
                      ? client.messages[client.messages.length - 1].body 
                      : "No messages yet";

                    return (
                      <div
                        key={client.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, client.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="kanban-card-title">{client.name}</div>
                        {client.company && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', marginTop: '-4px', fontWeight: '500' }}>
                            🏢 {client.company}
                          </div>
                        )}
                        <div className="kanban-card-body">{lastMessage}</div>
                        
                        {/* Tags */}
                        {client.tags && client.tags.length > 0 && (
                          <div className="kanban-card-tags">
                            {client.tags.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="kanban-tag">{t}</span>
                            ))}
                            {client.tags.length > 2 && (
                              <span className="kanban-tag">+{client.tags.length - 2}</span>
                            )}
                          </div>
                        )}

                        <div style={{ height: '1px', background: 'var(--border-color)', margin: '10px 0' }}></div>

                        <div className="kanban-card-footer">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} /> {getClientLastActivity(client)}
                          </span>
                          <button
                            style={{ 
                              background: 'rgba(255,255,255,0.03)', 
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              color: 'var(--brand-color)',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            onClick={() => onNavigate(client.id)}
                          >
                            Open Chat <MessageSquare size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KanbanBoard;
