import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import our new database adapter
import {
  connectDB,
  getClients,
  getClientById,
  getClientByPhone,
  saveClient,
  deleteClient,
  getQuickReplies,
  saveQuickReply,
  deleteQuickReply,
  getSettings,
  saveSettings
} from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database connection immediately
connectDB().catch(err => {
  console.error("Database connection failure on startup:", err);
});

// SSE (Server-Sent Events) clients (used for local push notifications)
let sseClients = [];

const broadcastSSE = (event, data) => {
  sseClients.forEach(client => {
    try {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      // Ignore write errors for closed connections
    }
  });
};

// Extension outbox queue for automated replies via browser tab
let pendingOutbox = [];

// REST API Endpoints

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await getClients();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch clients", details: err.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { id, name, phone, email, company, status, tags, budget, source } = req.body;
    
    if (id) {
      // Update existing client
      const client = await getClientById(id);
      if (client) {
        const updatedClient = {
          ...client,
          name: name || client.name,
          phone: phone || client.phone,
          email: email !== undefined ? email : client.email,
          company: company !== undefined ? company : client.company,
          status: status || client.status,
          tags: tags || client.tags,
          budget: budget !== undefined ? Number(budget) : (client.budget || 0),
          source: source !== undefined ? source : (client.source || 'Manual'),
          updatedAt: new Date().toISOString()
        };
        await saveClient(updatedClient);
        broadcastSSE('client_update', updatedClient);
        return res.json(updatedClient);
      }
      return res.status(404).json({ error: "Client not found" });
    } else {
      // Create new client
      if (!name || !phone) {
        return res.status(400).json({ error: "Name and Phone are required" });
      }
      
      const cleanPhone = phone.replace(/\D/g, '');
      const existing = await getClientByPhone(cleanPhone);
      if (existing) {
        return res.status(400).json({ error: "A client with this phone number already exists." });
      }

      const newClient = {
        id: 'c_' + Math.random().toString(36).substr(2, 9),
        name,
        phone,
        email: email || '',
        company: company || '',
        status: status || 'New Lead',
        tags: tags || [],
        budget: budget !== undefined ? Number(budget) : 0,
        source: source || 'Manual',
        notes: [],
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveClient(newClient);
      broadcastSSE('client_create', newClient);
      res.json(newClient);
    }
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.put('/api/clients/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const client = await getClientById(req.params.id);
    if (client) {
      client.status = status;
      client.updatedAt = new Date().toISOString();
      await saveClient(client);
      broadcastSSE('client_update', client);
      res.json(client);
    } else {
      res.status(404).json({ error: "Client not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.post('/api/clients/:id/notes', async (req, res) => {
  try {
    const { content } = req.body;
    const client = await getClientById(req.params.id);
    if (client) {
      const newNote = {
        id: 'n_' + Math.random().toString(36).substr(2, 9),
        content,
        createdAt: new Date().toISOString()
      };
      client.notes.unshift(newNote); // newest first
      client.updatedAt = new Date().toISOString();
      await saveClient(client);
      broadcastSSE('client_update', client);
      res.json(newNote);
    } else {
      res.status(404).json({ error: "Client not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const success = await deleteClient(req.params.id);
    if (success) {
      broadcastSSE('client_delete', { id: req.params.id });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Client not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Quick Replies Endpoints

app.get('/api/quick-replies', async (req, res) => {
  try {
    const replies = await getQuickReplies();
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch templates", details: err.message });
  }
});

app.post('/api/quick-replies', async (req, res) => {
  try {
    const { id, shortcut, title, body } = req.body;
    if (id) {
      const existing = await getQuickReplies();
      const qr = existing.find(q => q.id === id);
      if (qr) {
        const updatedQR = { id, shortcut, title, body };
        await saveQuickReply(updatedQR);
        res.json(updatedQR);
      } else {
        res.status(404).json({ error: "Quick reply not found" });
      }
    } else {
      const newQR = {
        id: 'q_' + Math.random().toString(36).substr(2, 9),
        shortcut,
        title,
        body
      };
      await saveQuickReply(newQR);
      res.json(newQR);
    }
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.delete('/api/quick-replies/:id', async (req, res) => {
  try {
    const success = await deleteQuickReply(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Quick reply not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Settings Endpoints

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const current = await getSettings();
    const updated = await saveSettings({ ...current, ...req.body });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// SSE for Real-Time Client Dashboard Updates
app.get('/api/whatsapp/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Establish connection

  sseClients.push(res);
  console.log(`SSE Client connected. Active: ${sseClients.length}`);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
    console.log(`SSE Client disconnected. Active: ${sseClients.length}`);
  });
});

// WhatsApp Integration APIs

// 1. Browser Sync Endpoint (Extension pushes new messages here)
app.post('/api/whatsapp/sync', async (req, res) => {
  try {
    const { phone, name, body, type, timestamp } = req.body;
    if (!phone || !body) {
      return res.status(400).json({ error: "phone and body are required" });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    let client = await getClientByPhone(cleanPhone);

    const newMessage = {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      sender: type === 'outbound' ? 'user' : 'client',
      body,
      timestamp: timestamp || new Date().toISOString()
    };

    if (client) {
      // Prevent duplicate messages if sync triggers twice
      const isDuplicate = client.messages.some(m => m.body === body && Math.abs(new Date(m.timestamp) - new Date(newMessage.timestamp)) < 5000);
      if (!isDuplicate) {
        client.messages.push(newMessage);
        client.updatedAt = new Date().toISOString();
        await saveClient(client);
        broadcastSSE('client_update', client);
      }
    } else {
      // Auto-create client on incoming message
      client = {
        id: 'c_' + Math.random().toString(36).substr(2, 9),
        name: name || `WhatsApp Contact (${phone})`,
        phone: phone,
        email: '',
        company: '',
        status: 'New Lead',
        budget: 0,
        source: 'WhatsApp Sync',
        tags: ['WhatsApp Sync'],
        notes: [],
        messages: [newMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveClient(client);
      broadcastSSE('client_create', client);
    }

    res.json({ success: true, clientId: client.id });
  } catch (err) {
    res.status(500).json({ error: "Sync endpoint error", details: err.message });
  }
});

// 2. Browser Sync Outbound Queue polling
app.get('/api/whatsapp/pending-outbox', (req, res) => {
  res.json(pendingOutbox);
});

app.post('/api/whatsapp/pending-outbox/sent', (req, res) => {
  const { id } = req.body;
  pendingOutbox = pendingOutbox.filter(msg => msg.id !== id);
  res.json({ success: true });
});

// 3. Official WhatsApp Cloud API - Webhook verification
app.get('/api/whatsapp/webhook', async (req, res) => {
  try {
    const settings = await getSettings();
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === settings.whatsappWebhookToken) {
        console.log('Official WhatsApp Webhook verified successfully!');
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Forbidden');
    }
    res.status(400).send('Bad Request');
  } catch (err) {
    res.status(500).send('Webhook verify error');
  }
});

// 4. Official WhatsApp Cloud API - Webhook incoming event
app.post('/api/whatsapp/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
        const value = body.entry[0].changes[0].value;
        const message = value.messages[0];
        const from = message.from; 
        const contact = value.contacts ? value.contacts[0] : null;
        const name = contact ? contact.profile.name : `Contact (+${from})`;

        let textBody = '';
        if (message.type === 'text') {
          textBody = message.text.body;
        } else if (message.type === 'interactive') {
          textBody = message.interactive.button_reply ? message.interactive.button_reply.title : 'Interactive Message';
        } else {
          textBody = `[Received ${message.type} message]`;
        }

        const cleanPhone = from.replace(/\D/g, '');
        let client = await getClientByPhone(cleanPhone);

        const newMessage = {
          id: 'm_' + Math.random().toString(36).substr(2, 9),
          sender: 'client',
          body: textBody,
          timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
        };

        if (client) {
          client.messages.push(newMessage);
          client.updatedAt = new Date().toISOString();
          await saveClient(client);
          broadcastSSE('client_update', client);
        } else {
          client = {
            id: 'c_' + Math.random().toString(36).substr(2, 9),
            name: name,
            phone: `+${from}`,
            email: '',
            company: '',
            status: 'New Lead',
            budget: 0,
            source: 'Meta Ads',
            tags: ['Official API'],
            notes: [],
            messages: [newMessage],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await saveClient(client);
          broadcastSSE('client_create', client);
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    res.sendStatus(404);
  } catch (err) {
    res.status(500).send('Webhook handle error');
  }
});

// 5. Send message from CRM (Supports Official Cloud API OR queues for Browser Sync extension)
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { clientId, body } = req.body;
    if (!clientId || !body) {
      return res.status(400).json({ error: "clientId and body are required" });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const cleanPhone = client.phone.replace(/\D/g, '');
    const newMessage = {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      sender: 'user',
      body,
      timestamp: new Date().toISOString()
    };

    // Add message to database immediately
    client.messages.push(newMessage);
    client.updatedAt = new Date().toISOString();
    await saveClient(client);
    broadcastSSE('client_update', client);

    const settings = await getSettings();

    // Send message depending on configuration
    if (settings.whatsappIncomingMode === 'api' && settings.whatsappAccessToken && settings.whatsappPhoneId) {
      // Send via Official WhatsApp Cloud API
      try {
        const url = `https://graph.facebook.com/v17.0/${settings.whatsappPhoneId}/messages`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.whatsappAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "text",
            text: { preview_url: false, body: body }
          })
        });
        const data = await response.json();
        if (!response.ok) {
          console.error("Meta API error:", data);
          return res.status(502).json({ error: "WhatsApp API failed", details: data });
        }
        return res.json({ success: true, method: 'api', data });
      } catch (err) {
        console.error("Failed sending via Meta API:", err);
        return res.status(500).json({ error: "API connection error", details: err.message });
      }
    } else {
      // Queue for Browser Sync script to send
      const outboxItem = {
        id: newMessage.id,
        phone: client.phone,
        body: body
      };
      pendingOutbox.push(outboxItem);
      return res.json({ success: true, method: 'extension_queued', messageId: newMessage.id });
    }
  } catch (err) {
    res.status(500).json({ error: "Send endpoint error", details: err.message });
  }
});

// Parse custom copy-pasted WhatsApp chats
app.post('/api/whatsapp/parse-paste', async (req, res) => {
  try {
    const { text, clientName, clientPhone } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text content is required" });
    }

    const lines = text.split('\n');
    const parsedMessages = [];
    
    let phone = clientPhone || "";
    let name = clientName || "";

    const wppRegex = /^(?:\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[aApP][mM])?)\]?|(\d{1,2}:\d{2}(?:\s?[aApP][mM])?)[,\s]+(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}))\s*[-:]\s*([^:]+):\s*(.*)$/i;
    const simpleRegex = /^([^:\n]+):\s*(.+)$/;

    lines.forEach((line) => {
      const match = line.match(wppRegex);
      if (match) {
        const senderName = match[5].trim();
        const messageBody = match[6].trim();
        parsedMessages.push({
          sender: senderName,
          body: messageBody,
          timestamp: new Date().toISOString()
        });
      } else {
        const simpleMatch = line.match(simpleRegex);
        if (simpleMatch) {
          const senderName = simpleMatch[1].trim();
          const messageBody = simpleMatch[2].trim();
          if (senderName.toLowerCase() !== 'today' && senderName.toLowerCase() !== 'yesterday' && messageBody.length > 0) {
            parsedMessages.push({
              sender: senderName,
              body: messageBody,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    });

    if (parsedMessages.length === 0) {
      return res.status(400).json({ error: "Could not parse any messages from the text. Make sure it follows a 'Sender Name: Message' or WhatsApp export format." });
    }

    if (!phone) {
      const phoneMatch = text.match(/\+?\d[\d\s-]{8,14}\d/);
      phone = phoneMatch ? phoneMatch[0].trim() : `Temp_${Math.random().toString(36).substr(2, 5)}`;
    }

    const senders = [...new Set(parsedMessages.map(m => m.sender))];
    let clientSenderName = senders.find(s => s.toLowerCase() !== 'me' && s.toLowerCase() !== 'you' && !s.includes('Biz') && !s.includes('CRM')) || senders[0];
    
    if (!name) {
      name = clientSenderName;
    }

    const finalMessages = parsedMessages.map(m => ({
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      sender: m.sender.toLowerCase() === clientSenderName.toLowerCase() ? 'client' : 'user',
      body: m.body,
      timestamp: m.timestamp
    }));

    const cleanPhone = phone.replace(/\D/g, '');
    let client = await getClientByPhone(cleanPhone);

    if (client) {
      // Append messages
      client.messages = [...client.messages, ...finalMessages];
      client.updatedAt = new Date().toISOString();
      await saveClient(client);
      broadcastSSE('client_update', client);
    } else {
      // Create new
      client = {
        id: 'c_' + Math.random().toString(36).substr(2, 9),
        name: name,
        phone: phone,
        email: '',
        company: '',
        status: 'New Lead',
        tags: ['Smart Paste'],
        notes: [],
        messages: finalMessages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveClient(client);
      broadcastSSE('client_create', client);
    }

    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ error: "Parser endpoint failed", details: err.message });
  }
});

// Serves the client app when built (Production mode)
const buildPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Export the app for Vercel Serverless Function
export default app;

// Only spin up port listener if not running inside serverless contexts (Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`CRM Backend running on port ${PORT}`);
  });
}
