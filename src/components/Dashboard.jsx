import React from 'react';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  ChevronRight,
  ArrowUpRight,
  DollarSign,
  PieChart
} from 'lucide-react';

function Dashboard({ clients, onNavigate }) {
  // Calculations
  const totalClients = clients.length;
  const activeLeads = clients.filter(c => !['Won', 'Lost'].includes(c.status)).length;
  const wonClientsCount = clients.filter(c => c.status === 'Won').length;
  const lostClientsCount = clients.filter(c => c.status === 'Lost').length;
  
  const conversionRate = (wonClientsCount + lostClientsCount) > 0 
    ? Math.round((wonClientsCount / (wonClientsCount + lostClientsCount)) * 100) 
    : 0;

  // Financial Metrics
  const totalPipelineValue = clients
    .filter(c => !['Won', 'Lost'].includes(c.status))
    .reduce((sum, c) => sum + (Number(c.budget) || 0), 0);

  const totalWonRevenue = clients
    .filter(c => c.status === 'Won')
    .reduce((sum, c) => sum + (Number(c.budget) || 0), 0);

  // Currency Formatter
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

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

  // Source breakdown counts
  const sources = ['Meta Ads', 'Instagram', 'Organic', 'WhatsApp Link', 'Manual'];
  const getSourceCount = (sourceName) => clients.filter(c => (c.source || 'Manual') === sourceName).length;

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
          <h2>Luxury CRM Overview</h2>
          <p>Real-time analytics, pipeline valuation, and Meta campaign tracking</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#ffffff', border: '1px solid var(--border-color)' }}>
            <Users size={22} />
          </div>
          <div className="metric-info">
            <h3>{totalClients}</h3>
            <p>Database Contacts</p>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-icon" style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            <MessageSquare size={22} />
          </div>
          <div className="metric-info">
            <h3>{activeLeads}</h3>
            <p>Active Leads</p>
          </div>
        </div>

        <div className="card metric-card" style={{ borderColor: 'rgba(212, 175, 55, 0.25)', boxShadow: '0 0 15px rgba(212, 175, 55, 0.05)' }}>
          <div className="metric-icon" style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--brand-color)', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
            <DollarSign size={22} />
          </div>
          <div className="metric-info">
            <h3 style={{ color: 'var(--brand-color)' }}>{formatCurrency(totalPipelineValue)}</h3>
            <p style={{ color: 'var(--brand-color)', fontWeight: 'bold' }}>Pipeline Value</p>
          </div>
        </div>

        <div className="card metric-card" style={{ borderColor: 'rgba(212, 175, 55, 0.25)', boxShadow: '0 0 15px rgba(212, 175, 55, 0.05)' }}>
          <div className="metric-icon" style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--brand-color)', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="metric-info">
            <h3 style={{ color: 'var(--brand-color)' }}>{formatCurrency(totalWonRevenue)}</h3>
            <p style={{ color: 'var(--brand-color)', fontWeight: 'bold' }}>Revenue Generated</p>
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
                    <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '4px', boxShadow: `0 0 10px ${barColor}30`, transition: 'width 0.8s ease' }}></div>
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

        {/* Right Section: Follow-ups and Sourcing Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Campaign sourcing breakdown */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <PieChart size={20} style={{ color: 'var(--brand-color)' }} />
              <h3 style={{ fontSize: '18px', color: 'white' }}>Campaign Channels</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {sources.map(src => {
                const count = getSourceCount(src);
                const pct = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;
                
                let dotColor = '#9ca3af';
                if (src === 'Meta Ads') dotColor = 'var(--brand-color)';
                if (src === 'Instagram') dotColor = '#ec4899';
                if (src === 'WhatsApp Link') dotColor = '#10b981';
                if (src === 'Organic') dotColor = '#3b82f6';

                return (
                  <div key={src} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '500' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block' }}></span>
                        {src}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{count} leads ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.02)', borderRadius: '2.5px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: dotColor, borderRadius: '2.5px' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attention warnings */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertTriangle size={20} style={{ color: 'var(--accent-yellow)' }} />
              <h3 style={{ fontSize: '18px', color: 'white' }}>Needs Attention</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4, marginBottom: '16px' }}>
              Active pipeline clients with no logged contact for 3+ days:
            </p>

            <div className="followup-list">
              {needingAttention.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--brand-color)', fontSize: '13px', fontWeight: '500' }}>
                  🏆 Excellent work! All leads are active.
                </div>
              ) : (
                needingAttention.slice(0, 3).map(client => {
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
    </div>
  );
}

export default Dashboard;
