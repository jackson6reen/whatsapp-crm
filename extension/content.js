/**
 * ClientFlow Chrome Extension Content Script
 * Automatically syncs web.whatsapp.com conversations with local CRM on port 5000.
 */

const BACKEND_URL = 'http://localhost:5000';
console.log('%c[ClientFlow CRM Extension] Active!', 'color: #10b981; font-weight: bold; font-size: 14px;');

// Poll for outbound messages to send
async function pollOutbox() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/whatsapp/pending-outbox`);
    const outbox = await res.json();
    
    if (outbox && outbox.length > 0) {
      console.log(`[ClientFlow] Found ${outbox.length} pending outbound messages.`);
      for (const item of outbox) {
        const success = await sendWhatsAppMessage(item.phone, item.body);
        if (success) {
          await fetch(`${BACKEND_URL}/api/whatsapp/pending-outbox/sent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id })
          });
          console.log(`[ClientFlow] Dispatched message to ${item.phone} successfully.`);
        }
      }
    }
  } catch (err) {
    // Silently ignore if server is temporarily down
  }
  setTimeout(pollOutbox, 3000); // Poll every 3 seconds
}

// Simulate typing and sending message via WhatsApp Web UI
async function sendWhatsAppMessage(phone, text) {
  const cleanPhone = phone.replace(/\D/g, '');
  try {
    // Create element to trigger navigation
    const link = document.createElement('a');
    link.setAttribute('href', `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`);
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
          
          if (textContent && window.lastSyncedMsg !== textContent) {
            window.lastSyncedMsg = textContent;
            
            // Clean up name string whitespace
            const cleanName = senderName.replace(/\s+/g, ' ');
            fetch(`${BACKEND_URL}/api/whatsapp/sync`, {
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
