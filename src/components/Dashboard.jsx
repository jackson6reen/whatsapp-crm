import React from 'react';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';

function Dashboard({ clients, onNavigate }) {
  // Calculations
  const totalClients = clients.length;
  const activeLeads = clients.filter(c => !['Won', 'Lost'].includes(c.status)).length;
  const wonClients = clients.filter(c => c.status === 'Won').length;
  const lostClients = clients.filter(c => c.status === 'Lost').length;
  
  const conversionRate = (wonClients + lostClients) > 0 
    ? Math.round((wonClients / (wonClients + lostClients)) * 100) 
    : 0;

  // Find clients needing attention (inactive for > 3 days)
  const ATTENTION_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
  const needingAttention = clients.filter(c => {
    if (['Won', 'Lost'].includes(c.status)) return false;
    const lastActive = new Date(c.updatedAt).getTime();
    return (Date.now() - lastActive) > ATTENTION_THRESHOLD_MS;
  });

  // Pipeline distribution for stage chart
  const stages = ['New Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  const getStageCount = (stage) => clients.filter(c => c.status === stage).length;
  const maxStageCount = Math.max(...stages.map(getStageCount), 1);

  // Recent interactions list
  const recentInteractions = [...clients]
    .filter(c => c.messages.length > 0 || c.notes.length > 0)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h2>CRM Overview</h2>
          <p>Real-time analytics and client acquisition tracking</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={24} />
          </div>
          <div className="metric-info">
            <h3>{totalClients}</h3>
            <p>Total Database Contacts</p>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <MessageSquare size={24} />
          </div>
          <div className="metric-info">
            <h3>{activeLeads}</h3>
            <p>Active Pipeline Leads</p>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle size={24} />
          </div>
          <div className="metric-info">
            <h3>{wonClients}</h3>
            <p>Deals Closed (Won)</p>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <TrendingUp size={24} />
          </div>
          <div className="metric-info">
            <h3>{conversionRate}%</h3>
            <p>Closed-Won Conversion</p>
          </div>
        </div>
      </div>

      {/* Dashboard Sections */}
      <div className="dashboard-sections">
        {/* Left Section: Pipeline breakdown and recent activities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Pipeline stage bar visualization */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '20px', color: 'white' }}>Deal Pipeline Flow</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {stages.map(stage => {
                const count = getStageCount(stage);
                const percent = Math.max((count / totalClients) * 100, 0) || 0;
                
                let barColor = 'var(--accent-blue)';
                if (stage === 'Contacted') barColor = 'var(--accent-purple)';
                if (stage === 'Proposal') barColor = 'var(--accent-yellow)';
                if (stage === 'Negotiation') barColor = '#ec4899';
                if (stage === 'Won') barColor = 'var(--brand-color)';
                if (stage === 'Lost') barColor = 'var(--accent-red)';

                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ width: '110px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                      {stage}
                    </span>
                    <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '5px', boxShadow: `0 0 10px ${barColor}30`, transition: 'width 0.8s ease' }}></div>
                    </div>
                    <span style={{ width: '30px', fontSize: '13px', fontWeight: '600', textAlign: 'right', color: 'white' }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'white' }}>Recent Client Interactions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentInteractions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>No recent interaction logs available.</p>
              ) : (
                recentInteractions.map(client => {
                  const lastMsg = client.messages[client.messages.length - 1];
                  const lastNote = client.notes[0];
                  
                  // Determine most recent event
                  let isMessageEvent = true;
                  let eventTime = client.updatedAt;
                  let eventDesc = '';

                  if (lastMsg && lastNote) {
                    if (new Date(lastNote.createdAt) > new Date(lastMsg.timestamp)) {
                      isMessageEvent = false;
                      eventTime = lastNote.createdAt;
                      eventDesc = `Note: ${lastNote.content}`;
                    } else {
                      eventDesc = `Message: "${lastMsg.body}"`;
                    }
                  } else if (lastMsg) {
                    eventDesc = `Message: "${lastMsg.body}"`;
                  } else if (lastNote) {
                    isMessageEvent = false;
                    eventTime = lastNote.createdAt;
                    eventDesc = `Note: ${lastNote.content}`;
                  }

                  return (
                    <div key={client.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '75%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '600', fontSize: '14px', color: 'white' }}>{client.name}</span>
                          <span className={`badge badge-${client.status.toLowerCase().replace(' ', '')}`}>{client.status}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {eventDesc}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(eventTime).toLocaleDateString()}
                        </span>
                        <button 
                          style={{ background: 'transparent', border: 'none', color: 'var(--brand-color)', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                          onClick={() => {
                            if (isMessageEvent) {
                              onNavigate('inbox');
                            } else {
                              onNavigate('clients');
                            }
                          }}
                        >
                          Details <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Follow-up alerts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={20} style={{ color: 'var(--accent-yellow)' }} />
            <h3 style={{ fontSize: '18px', color: 'white' }}>Needs Attention</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4, marginBottom: '16px' }}>
            Leads in pipeline with no message activity or notes logged for 3+ days:
          </p>

          <div className="followup-list">
            {needingAttention.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--brand-color)', fontSize: '13px', fontWeight: '500' }}>
                🎉 Amazing! All leads are active.
              </div>
            ) : (
              needingAttention.map(client => {
                const daysInactive = Math.floor((Date.now() - new Date(client.updatedAt).getTime()) / (24 * 3600 * 1000));
                return (
                  <div key={client.id} className="followup-item">
                    <div className="followup-client-info">
                      <h4>{client.name}</h4>
                      <p>Inactive {daysInactive} days</p>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => onNavigate('inbox')}
                    >
                      Chat <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
