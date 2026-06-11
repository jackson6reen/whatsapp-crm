import React, { useState } from 'react';
import { Settings, CheckCircle, Copy, Terminal, Server, HelpCircle, Save } from 'lucide-react';

function ConnectionCenter({ settings, setSettings }) {
  const [activeSubTab, setActiveSubTab] = useState('browser');
  const [copiedScript, setCopiedScript] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local config state matching settings
  const [incomingMode, setIncomingMode] = useState(settings.whatsappIncomingMode || 'manual');
  const [webhookToken, setWebhookToken] = useState(settings.whatsappWebhookToken || '');
  const [accessToken, setAccessToken] = useState(settings.whatsappAccessToken || '');
  const [phoneId, setPhoneId] = useState(settings.whatsappPhoneId || '');

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappIncomingMode: incomingMode,
          whatsappWebhookToken: webhookToken,
          whatsappAccessToken: accessToken,
          whatsappPhoneId: phoneId
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save CRM settings:", err);
    }
  };

  // Automated WhatsApp Web synchronization script
  const extensionScript = `/**
 * ClientFlow CRM Sync Script
 * Paste this script in the F12 Console while web.whatsapp.com is active.
 * Keep the tab open to run automated synchronization.
 */
(function() {
  const BACKEND_URL = 'http://localhost:5000';
  console.log('%c[ClientFlow CRM] Sync Engine Initializing...', 'color: #10b981; font-weight: bold; font-size: 14px;');

  // Poll for outbound messages to send
  async function pollOutbox() {
    try {
      const res = await fetch(\`\${BACKEND_URL}/api/whatsapp/pending-outbox\`);
      const outbox = await res.json();
      
      if (outbox.length > 0) {
        console.log(\`[ClientFlow] Found \${outbox.length} pending outbound messages.\`);
        for (const item of outbox) {
          const success = await sendWhatsAppMessage(item.phone, item.body);
          if (success) {
            await fetch(\`\${BACKEND_URL}/api/whatsapp/pending-outbox/sent\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: item.id })
            });
            console.log(\`[ClientFlow] Dispatched message to \${item.phone} successfully.\`);
          }
        }
      }
    } catch (err) {
      console.error('[ClientFlow] Outbox connection error:', err);
    }
    setTimeout(pollOutbox, 3000); // Poll every 3 seconds
  }

  // Simulate typing and sending message via WhatsApp Web UI
  async function sendWhatsAppMessage(phone, text) {
    const cleanPhone = phone.replace(/\\D/g, '');
    try {
      // Create element to trigger navigation
      const link = document.createElement('a');
      link.setAttribute('href', \`https://web.whatsapp.com/send?phone=\${cleanPhone}&text=\${encodeURIComponent(text)}\`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Wait for chat to load and text area to populate
      let attempts = 0;
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          attempts++;
          // Find send button (which becomes active after text loads)
          const sendBtn = document.querySelector('span[data-icon="send"]');
          if (sendBtn) {
            sendBtn.click();
            clearInterval(interval);
            resolve(true);
          } else if (attempts > 30) { // 15 seconds timeout
            console.warn('[ClientFlow] Send timeout. Make sure the page is loaded.');
            clearInterval(interval);
            resolve(false);
          }
        }, 500);
      });
    } catch (e) {
      console.error('[ClientFlow] UI injection failed:', e);
      return false;
    }
  }

  // Observe DOM for incoming messages in active conversation
  function setupIncomingObserver() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const callback = function(mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          // Look for incoming message text containers
          const incomingMessages = document.querySelectorAll('.message-in .selectable-text span');
          if (incomingMessages.length > 0) {
            const lastMsg = incomingMessages[incomingMessages.length - 1];
            const textContent = lastMsg.textContent;
            
            // Extract sender identity from active header
            const headerEl = document.querySelector('header span[dir="auto"]');
            const senderName = headerEl ? headerEl.textContent : 'WhatsApp Contact';
            
            // Since we can't extract the raw phone number easily from DOM directly 
            // without clicking contact info, we match active name and sync.
            // In CRM, if name matches, it appends.
            // Let's trigger a post to server
            if (textContent && window.lastSyncedMsg !== textContent) {
              window.lastSyncedMsg = textContent;
              
              // Find or guess contact ID
              const cleanName = senderName.replace(/\\s+/g, ' ');
              fetch(\`\${BACKEND_URL}/api/whatsapp/sync\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phone: cleanName, // Maps to name in sync endpoint
                  name: cleanName,
                  body: textContent,
                  type: 'inbound',
                  timestamp: new Date().toISOString()
                })
              }).then(r => r.json())
                .then(d => console.log('[ClientFlow] Synced incoming message from ' + cleanName))
                .catch(e => console.error('[ClientFlow] Sync failed:', e));
            }
          }
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    console.log('[ClientFlow] Mutation Observer listening for chat DOM events.');
  }

  // Launch handlers
  setTimeout(() => {
    pollOutbox();
    setupIncomingObserver();
  }, 5000);
})();`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(extensionScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h2>Connection Sync Hub</h2>
          <p>Configure how incoming WhatsApp messages are synchronized to your local CRM</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Connection Setup Guide */}
        <div className="card">
          <div className="connection-methods-tabs">
            <button 
              className={`conn-tab-btn ${activeSubTab === 'browser' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('browser')}
            >
              <Terminal size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Method A: Browser Console Sync
            </button>
            <button 
              className={`conn-tab-btn ${activeSubTab === 'api' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('api')}
            >
              <Server size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Method B: WhatsApp Cloud API
            </button>
          </div>

          <div style={{ marginTop: '24px' }}>
            {activeSubTab === 'browser' ? (
              <div>
                <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '12px' }}>Standard Browser Sync Script Setup</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
                  This method works by running a local listener script inside your web browser alongside your WhatsApp Web session. It requires **zero developer accounts**, is **100% free**, and syncs messages automatically in real-time as they arrive.
                </p>

                <div className="setup-step">
                  <div className="step-num">1</div>
                  <div className="step-details">
                    <h4>Open WhatsApp Web</h4>
                    <p>Open <a href="https://web.whatsapp.com" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-color)' }}>web.whatsapp.com</a> on Google Chrome or Microsoft Edge and scan the QR code to log in.</p>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">2</div>
                  <div className="step-details">
                    <h4>Open Developer Tools</h4>
                    <p>Right-click anywhere on the WhatsApp Web page, select <strong>Inspect</strong>, and navigate to the <strong>Console</strong> tab. (Or press <code>F12</code> or <code>Ctrl+Shift+I</code>).</p>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">3</div>
                  <div className="step-details">
                    <h4>Copy and Inject Script</h4>
                    <p>Copy the JavaScript snippet below, paste it into the console text area, and hit <strong>Enter</strong>.</p>
                    
                    <div className="code-block-wrapper">
                      <button className="copy-code-btn" onClick={handleCopyScript}>
                        {copiedScript ? 'Copied!' : <><Copy size={12} style={{ display: 'inline', marginRight: '4px' }} /> Copy Code</>}
                      </button>
                      <pre className="code-block">
                        {extensionScript}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">4</div>
                  <div className="step-details">
                    <h4>Keep the Tab Open</h4>
                    <p>The console will print status indicators. Keep the WhatsApp Web browser tab open. It will automatically sync new incoming text blocks and poll for outgoing replies to send from your dashboard!</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '12px' }}>Meta WhatsApp Business API Integration</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
                  The official Cloud API is suitable for high-volume corporate lines. Your first <strong>1,000 conversations each month are completely free</strong>.
                </p>

                <div className="setup-step">
                  <div className="step-num">1</div>
                  <div className="step-details">
                    <h4>Register Meta Developer App</h4>
                    <p>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-color)' }}>Meta Developers Console</a>. Click <strong>Create App</strong>, choose <strong>Business</strong>, and add the <strong>WhatsApp</strong> product to your app.</p>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">2</div>
                  <div className="step-details">
                    <h4>Acquire API Keys</h4>
                    <p>Under the WhatsApp Getting Started page, copy your <strong>Phone Number ID</strong> and <strong>Temporary Access Token</strong>. Paste them in the config form on the right.</p>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">3</div>
                  <div className="step-details">
                    <h4>Setup Local Tunnel (Webhook)</h4>
                    <p>Meta requires HTTPS for webhook callbacks. In your command line, run a free tunnel using <strong>ngrok</strong>:</p>
                    <pre className="code-block" style={{ margin: '8px 0', color: '#60a5fa' }}>
                      ngrok http 5000
                    </pre>
                    <p>Copy the HTTPS forwarding address (e.g., <code>https://ab12-34.ngrok-free.app</code>).</p>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">4</div>
                  <div className="step-details">
                    <h4>Configure Webhooks in Meta</h4>
                    <p>Go to Meta Webhook Configuration for WhatsApp. Paste your ngrok URL with the webhook path:</p>
                    <pre className="code-block" style={{ margin: '8px 0', color: '#f59e0b' }}>
                      https://YOUR_NGROK_ADDRESS/api/whatsapp/webhook
                    </pre>
                    <p>For the Verify Token, paste the verification token shown in your settings panel (default: <code>{webhookToken}</code>).</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Configurations Form Panel */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Settings size={20} style={{ color: 'var(--brand-color)' }} />
            <h3 style={{ color: 'white', fontSize: '18px' }}>CRM Integration Settings</h3>
          </div>

          <form onSubmit={handleSaveSettings}>
            {saveSuccess && (
              <div style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} /> Settings saved successfully!
              </div>
            )}

            <div className="form-group">
              <label>WhatsApp Integration Mode</label>
              <select 
                className="filter-select" 
                style={{ width: '100%' }}
                value={incomingMode}
                onChange={(e) => setIncomingMode(e.target.value)}
              >
                <option value="manual">Manual Mode & Smart Paste (No API)</option>
                <option value="extension">Browser Console Sync (Free Real-time)</option>
                <option value="api">Official WhatsApp Business API</option>
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Governs how messages are routed. In extension/api modes, outbound messages typed in CRM will automatically dispatch!
              </span>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '20px 0' }}></div>

            <h4 className="sidebar-section-title" style={{ marginBottom: '12px' }}>API Config parameters</h4>
            
            <div className="form-group">
              <label>Webhook Verify Token</label>
              <input 
                type="text" 
                className="form-control" 
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
                placeholder="whatsapp_crm_verify_token_2026"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Provide this verification token to Meta Developers to verify your webhook subscription.
              </span>
            </div>

            <div className="form-group">
              <label>Phone Number ID (Meta API)</label>
              <input 
                type="text" 
                className="form-control" 
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="e.g. 10484820129210"
                disabled={incomingMode !== 'api'}
                style={{ opacity: incomingMode === 'api' ? '1' : '0.5' }}
              />
            </div>

            <div className="form-group">
              <label>System Access Token (Meta API)</label>
              <input 
                type="password" 
                className="form-control" 
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAABw..."
                disabled={incomingMode !== 'api'}
                style={{ opacity: incomingMode === 'api' ? '1' : '0.5' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '20px' }}
            >
              <Save size={16} /> Save Configurations
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ConnectionCenter;
