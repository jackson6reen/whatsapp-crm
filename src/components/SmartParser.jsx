import React, { useState } from 'react';
import { Clipboard, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

function SmartParser({ onParseSuccess }) {
  const [pasteText, setPasteText] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleParse = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!pasteText.trim()) {
      setErrorMsg('Please paste some chat text to parse.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/whatsapp/parse-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: pasteText,
          clientName: clientName,
          clientPhone: clientPhone
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to parse chat log. Make sure it contains messages in the correct format.');
      } else {
        setSuccessMsg(`Successfully parsed and imported ${data.client.messages.length} messages for ${data.client.name}!`);
        setPasteText('');
        setClientName('');
        setClientPhone('');
        
        // Callback to navigate or focus on client
        if (onParseSuccess) {
          setTimeout(() => {
            onParseSuccess(data.client);
          }, 1500);
        }
      }
    } catch (err) {
      setErrorMsg('Server connection failed. Could not process text parser.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    const sampleText = 
`[10:15 AM, 6/11/2026] +1 555-0199: Hi there! I'm interested in booking a consultation for my team. Do you have slots open next Friday?
[10:18 AM, 6/11/2026] My Company: Hello! Yes, we have slots open at 10 AM and 2 PM next Friday. What is your team size?
[10:20 AM, 6/11/2026] +1 555-0199: We have 8 developers. The name is John. Can we book the 2 PM slot?`;
    
    setPasteText(sampleText);
    setClientName('John Developer');
    setClientPhone('+1 555-0199');
  };

  return (
    <div className="parser-layout">
      {/* Paste Area Form */}
      <div>
        <form onSubmit={handleParse} style={{ display: 'flex', flexString: '0', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div style={{ color: '#f87171', background: 'rgba(239, 44, 44, 0.1)', border: '1px solid rgba(239, 44, 44, 0.2)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label>Override Client Name (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. John Miller" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label>Override Phone Number (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. +1 555-1234" 
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0' }}>
            <label>Paste Raw WhatsApp Conversation *</label>
            <textarea
              className="parser-textarea"
              placeholder="Copy messages from WhatsApp (web or phone) and paste them directly here...
Example format:
Name: Hello!
Me: Hi, how are you?
Or standard WhatsApp exported transcripts."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              required
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Analyzing Content...' : 'Parse & Import Chat Log'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleLoadSample}
            >
              Load Format Sample
            </button>
          </div>
        </form>
      </div>

      {/* Parser Instructions / Format details */}
      <div className="card parser-instruction-card">
        <h4 style={{ fontSize: '14px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} style={{ color: 'var(--brand-color)' }} /> 
          How to use Smart Paste
        </h4>
        <ul className="parser-instruction-list">
          <li>
            <strong>Step 1:</strong> Go to WhatsApp Web or WhatsApp Desktop.
          </li>
          <li>
            <strong>Step 2:</strong> Highlight a block of messages, right-click, and select <strong>Copy</strong>. Alternatively, export a chat log from your phone as a text file.
          </li>
          <li>
            <strong>Step 3:</strong> Paste the text block into the container on the left.
          </li>
          <li>
            <strong>Step 4:</strong> Optional: Provide the client's name and phone number to guarantee accurate profiling.
          </li>
          <li>
            <strong>Step 5:</strong> Click <strong>Parse & Import</strong>. The CRM will automatically map sender titles to roles (User vs Client), record messages, and update status logs.
          </li>
        </ul>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          💡 <strong>Tip:</strong> This is a 100% client-side safe parser. It does not interface with WhatsApp's servers, which ensures zero possibility of account restrictions or billing fees.
        </div>
      </div>
    </div>
  );
}

export default SmartParser;
