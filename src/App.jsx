import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  KanbanSquare, 
  Users, 
  FileCode, 
  Settings, 
  Plus, 
  Wifi, 
  WifiOff, 
  X, 
  ChevronRight 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ChatInbox from './components/ChatInbox';
import KanbanBoard from './components/KanbanBoard';
import ClientsDirectory from './components/ClientsDirectory';
import QuickReplies from './components/QuickReplies';
import ConnectionCenter from './components/ConnectionCenter';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [settings, setSettings] = useState({
    whatsappWebhookToken: 'whatsapp_crm_verify_token_2026',
    whatsappAccessToken: '',
    whatsappPhoneId: '',
    whatsappIncomingMode: 'manual'
  });
  const [activeChatId, setActiveChatId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Client Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientTags, setNewClientTags] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    try {
      const clientsRes = await fetch('/api/clients');
      const clientsData = await clientsRes.json();
      setClients(clientsData);

      const repliesRes = await fetch('/api/quick-replies');
      const repliesData = await repliesRes.json();
      setQuickReplies(repliesData);

      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      setSettings(settingsData);
    } catch (err) {
      console.error("Error fetching CRM database:", err);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup SSE Connection for real-time updates
    const eventSource = new EventSource('/api/whatsapp/events');

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection failed:", err);
      setIsConnected(false);
    };

    eventSource.addEventListener('client_create', (event) => {
      const newClient = JSON.parse(event.data);
      setClients((prev) => {
        // Prevent duplicates
        if (prev.some(c => c.id === newClient.id)) return prev;
        return [...prev, newClient];
      });
    });

    eventSource.addEventListener('client_update', (event) => {
      const updatedClient = JSON.parse(event.data);
      setClients((prev) => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    });

    eventSource.addEventListener('client_delete', (event) => {
      const { id } = JSON.parse(event.data);
      setClients((prev) => prev.filter(c => c.id !== id));
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // Polling fallback when SSE is offline (essential for serverless platforms like Vercel)
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) {
          const latestClients = await res.json();
          setClients(latestClients);
        }
      } catch (err) {
        // Silently capture errors during brief network drops
      }
    }, 4000); // Check every 4 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!newClientName || !newClientPhone) {
      setErrorMessage('Name and phone number are required.');
      return;
    }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          phone: newClientPhone,
          email: newClientEmail,
          company: newClientCompany,
          tags: newClientTags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to create client.');
      } else {
        // Reset and close
        setNewClientName('');
        setNewClientPhone('');
        setNewClientEmail('');
        setNewClientCompany('');
        setNewClientTags('');
        setIsModalOpen(false);
        // Automatically switch to details or highlight
        setActiveTab('clients');
      }
    } catch (err) {
      setErrorMessage('Server connection error. Please try again.');
    }
  };

  const handleUpdateStatus = async (clientId, newStatus) => {
    try {
      await fetch(`/api/clients/${clientId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleAddNote = async (clientId, noteText) => {
    if (!noteText.trim()) return;
    try {
      await fetch(`/api/clients/${clientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText })
      });
    } catch (err) {
      console.error("Failed to add note:", err);
    }
  };

  const handleSendMessage = async (clientId, messageText) => {
    if (!messageText.trim()) return;
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, body: messageText })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Failed to send WhatsApp message:", err);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!confirm("Are you sure you want to delete this client? This will delete all chat history and logs.")) return;
    try {
      await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      });
      if (activeChatId === clientId) {
        setActiveChatId(null);
      }
    } catch (err) {
      console.error("Failed to delete client:", err);
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard clients={clients} onNavigate={setActiveTab} />;
      case 'inbox':
        return (
          <ChatInbox 
            clients={clients} 
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            onSendMessage={handleSendMessage}
            onAddNote={handleAddNote}
            onUpdateStatus={handleUpdateStatus}
            quickReplies={quickReplies}
          />
        );
      case 'kanban':
        return (
          <KanbanBoard 
            clients={clients} 
            onUpdateStatus={handleUpdateStatus} 
            onNavigate={(id) => {
              setActiveChatId(id);
              setActiveTab('inbox');
            }}
          />
        );
      case 'clients':
        return (
          <ClientsDirectory 
            clients={clients} 
            onUpdateStatus={handleUpdateStatus}
            onAddNote={handleAddNote}
            onSendMessage={handleSendMessage}
            onDeleteClient={handleDeleteClient}
            onOpenAddModal={() => setIsModalOpen(true)}
          />
        );
      case 'replies':
        return <QuickReplies quickReplies={quickReplies} setQuickReplies={setQuickReplies} />;
      case 'connection':
        return <ConnectionCenter settings={settings} setSettings={setSettings} />;
      default:
        return <Dashboard clients={clients} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 className="logo-text">ClientFlow</h1>
            <span style={{ fontSize: '10px', color: 'var(--brand-color)', fontWeight: 'bold' }}>WHATSAPP CRM</span>
          </div>
        </div>

        <ul className="sidebar-menu">
          <li className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <button onClick={() => setActiveTab('dashboard')}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'inbox' ? 'active' : ''}`}>
            <button onClick={() => setActiveTab('inbox')}>
              <MessageSquare size={18} />
              <span>Inbox Chat</span>
              {clients.filter(c => c.messages.some(m => m.sender === 'client' && !m.read)).length > 0 && (
                <span className="unread-badge" style={{ marginLeft: 'auto' }}>
                  {clients.filter(c => c.messages.some(m => m.sender === 'client' && !m.read)).length}
                </span>
              )}
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'kanban' ? 'active' : ''}`}>
            <button onClick={() => setActiveTab('kanban')}>
              <KanbanSquare size={18} />
              <span>Pipeline Board</span>
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'clients' ? 'active' : ''}`}>
            <button onClick={() => setActiveTab('clients')}>
              <Users size={18} />
              <span>Client Contacts</span>
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'replies' ? 'active' : ''}`}>
            <button onClick={() => setActiveTab('replies')}>
              <FileCode size={18} />
              <span>Quick Replies</span>
            </button>
          </li>
          <li className={`menu-item ${activeTab === 'connection' ? 'active' : ''}`}>
            <button onClick={() => setActiveTab('connection')}>
              <Settings size={18} />
              <span>Connection Sync</span>
            </button>
          </li>
        </ul>

        {/* Global Connection Health Status */}
        <div className="sidebar-footer">
          <div className={`status-indicator ${isConnected ? 'online' : ''}`}></div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', fontWeight: '600', display: 'block' }}>
              {isConnected ? 'Sync Server Online' : 'Sync Server Offline'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              {isConnected ? 'Real-time active' : 'Waiting for connection...'}
            </span>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ padding: '6px', borderRadius: '50%' }}
            onClick={() => setIsModalOpen(true)}
            title="Quick Add Client"
          >
            <Plus size={16} />
          </button>
        </div>
      </aside>

      {/* Main View Shell */}
      <main className="main-content">
        {renderActiveView()}
      </main>

      {/* Quick Add Client Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '20px', color: 'white' }}>Quick Add Client</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateClient}>
              {errorMessage && (
                <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', background: 'rgba(239,44,44,0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239,44,44,0.2)' }}>
                  {errorMessage}
                </div>
              )}
              <div className="form-group">
                <label>Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. John Doe" 
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>WhatsApp Phone Number *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. +1 555-0199 (numbers only)" 
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address (Optional)</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="e.g. john@company.com" 
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Company / Organization (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Cyberdyne Inc" 
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Tags (Comma separated, optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Hot Lead, Product VIP" 
                  value={newClientTags}
                  onChange={(e) => setNewClientTags(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
