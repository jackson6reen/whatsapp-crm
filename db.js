import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

const useMongo = !!process.env.MONGODB_URI;
let mongoClient = null;
let dbInstance = null;
let localDbCache = null;

// Mock data to seed empty databases
const getSeedData = () => ({
  clients: [
    {
      id: "c1",
      name: "Alex Rivera",
      phone: "15550199",
      email: "alex@riveradesign.co",
      company: "Rivera Design",
      status: "New Lead",
      budget: 2500,
      source: "Meta Ads",
      tags: ["Design", "High Priority"],
      notes: [
        { id: "n1", content: "Inquired about branding package. Prefers WhatsApp communication.", createdAt: new Date(Date.now() - 3600000 * 2).toISOString() }
      ],
      messages: [
        { id: "m1", sender: "client", body: "Hello! I saw your portfolio and wanted to ask about your branding packages. What are your rates?", timestamp: new Date(Date.now() - 3600000 * 2).toISOString() }
      ],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: "c2",
      name: "Sarah Jenkins",
      phone: "15550188",
      email: "sjenkins@apexcorp.com",
      company: "Apex Corp",
      status: "Contacted",
      budget: 8500,
      source: "Organic",
      tags: ["Enterprise"],
      notes: [
        { id: "n2", content: "Scheduled a quick demo call for next Tuesday.", createdAt: new Date(Date.now() - 3600000 * 12).toISOString() }
      ],
      messages: [
        { id: "m2", sender: "client", body: "Hi, thanks for reaching out. Let's schedule a call next week.", timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
        { id: "m3", sender: "user", body: "Great! Does Tuesday at 2 PM work for you?", timestamp: new Date(Date.now() - 3600000 * 23).toISOString() },
        { id: "m4", sender: "client", body: "Yes, that works perfectly. Talk to you then!", timestamp: new Date(Date.now() - 3600000 * 12).toISOString() }
      ],
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: "c3",
      name: "Marcus Chen",
      phone: "15550177",
      email: "marcus@chenmedia.io",
      company: "Chen Media",
      status: "Proposal",
      budget: 4800,
      source: "Meta Ads",
      tags: ["Video Production", "Retainer"],
      notes: [
        { id: "n3", content: "Sent retainer proposal. Waiting for review.", createdAt: new Date(Date.now() - 3600000 * 26).toISOString() }
      ],
      messages: [
        { id: "m5", sender: "client", body: "We need 4 video edits per month. Can you send a contract template?", timestamp: new Date(Date.now() - 3600000 * 48).toISOString() },
        { id: "m6", sender: "user", body: "Just sent the proposal to your email! Let me know if you have any questions.", timestamp: new Date(Date.now() - 3600000 * 26).toISOString() }
      ],
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 26).toISOString()
    }
  ],
  quickReplies: [
    { id: "q1", shortcut: "/intro", title: "Greeting & Info Request", body: "Hi there! Thanks for reaching out. To better understand your needs, could you share a bit about your project and your timeline?" },
    { id: "q2", shortcut: "/pricing", title: "Standard Pricing Catalog", body: "Here is our standard pricing catalog for this season. We offer customized plans to fit specific budgets as well! Let me know if you would like a custom quote." },
    { id: "q3", shortcut: "/thanks", title: "Closing Appreciation", body: "Thank you for your time today! I will update our records and follow up with you on the next steps shortly." }
  ],
  settings: {
    whatsappWebhookToken: "whatsapp_crm_verify_token_2026",
    whatsappAccessToken: "",
    whatsappPhoneId: "",
    whatsappIncomingMode: "manual"
  }
});

// Establish database connection
export const connectDB = async () => {
  if (useMongo) {
    if (!mongoClient) {
      console.log("🔌 Database Mode: MongoDB Atlas Serverless");
      mongoClient = new MongoClient(process.env.MONGODB_URI);
      await mongoClient.connect();
      dbInstance = mongoClient.db();
      console.log("✅ Successfully connected to MongoDB.");

      // Check if seeding is necessary
      const clientsColl = dbInstance.collection('clients');
      const clientCount = await clientsColl.countDocuments();
      if (clientCount === 0) {
        console.log("🌱 Seeding MongoDB collections with default profiles...");
        const seeds = getSeedData();
        await clientsColl.insertMany(seeds.clients);
        await dbInstance.collection('quickReplies').insertMany(seeds.quickReplies);
        await dbInstance.collection('settings').insertOne(seeds.settings);
        console.log("🌱 Database seeding complete.");
      }
    }
  } else {
    console.log("💾 Database Mode: Local JSON File db.json");
    if (!localDbCache) {
      if (!fs.existsSync(DB_PATH)) {
        const seed = getSeedData();
        fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
      }
      localDbCache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  }
};

const saveLocalDB = () => {
  if (!useMongo && localDbCache) {
    fs.writeFileSync(DB_PATH, JSON.stringify(localDbCache, null, 2));
  }
};

// API Methods for Clients

export const getClients = async () => {
  await connectDB();
  if (useMongo) {
    // Exclude MongoDB default _id from JSON representation to keep models 1:1
    return await dbInstance.collection('clients').find({}, { projection: { _id: 0 } }).toArray();
  } else {
    return localDbCache.clients;
  }
};

export const getClientById = async (id) => {
  await connectDB();
  if (useMongo) {
    return await dbInstance.collection('clients').findOne({ id }, { projection: { _id: 0 } });
  } else {
    return localDbCache.clients.find(c => c.id === id) || null;
  }
};

export const getClientByPhone = async (phone) => {
  await connectDB();
  const cleanPhone = phone.replace(/\D/g, '');
  if (useMongo) {
    // In Mongo, find where cleaned phone values match
    const clients = await dbInstance.collection('clients').find().toArray();
    return clients.find(c => c.phone.replace(/\D/g, '') === cleanPhone) || null;
  } else {
    return localDbCache.clients.find(c => c.phone.replace(/\D/g, '') === cleanPhone) || null;
  }
};

export const saveClient = async (client) => {
  await connectDB();
  client.updatedAt = new Date().toISOString();
  
  if (useMongo) {
    const filter = { id: client.id };
    const updateDoc = { $set: client };
    await dbInstance.collection('clients').updateOne(filter, updateDoc, { upsert: true });
    return client;
  } else {
    const idx = localDbCache.clients.findIndex(c => c.id === client.id);
    if (idx !== -1) {
      localDbCache.clients[idx] = client;
    } else {
      localDbCache.clients.push(client);
    }
    saveLocalDB();
    return client;
  }
};

export const deleteClient = async (id) => {
  await connectDB();
  if (useMongo) {
    const res = await dbInstance.collection('clients').deleteOne({ id });
    return res.deletedCount > 0;
  } else {
    const idx = localDbCache.clients.findIndex(c => c.id === id);
    if (idx !== -1) {
      localDbCache.clients.splice(idx, 1);
      saveLocalDB();
      return true;
    }
    return false;
  }
};

// API Methods for Quick Replies

export const getQuickReplies = async () => {
  await connectDB();
  if (useMongo) {
    return await dbInstance.collection('quickReplies').find({}, { projection: { _id: 0 } }).toArray();
  } else {
    return localDbCache.quickReplies;
  }
};

export const saveQuickReply = async (reply) => {
  await connectDB();
  if (useMongo) {
    await dbInstance.collection('quickReplies').updateOne({ id: reply.id }, { $set: reply }, { upsert: true });
    return reply;
  } else {
    const idx = localDbCache.quickReplies.findIndex(q => q.id === reply.id);
    if (idx !== -1) {
      localDbCache.quickReplies[idx] = reply;
    } else {
      localDbCache.quickReplies.push(reply);
    }
    saveLocalDB();
    return reply;
  }
};

export const deleteQuickReply = async (id) => {
  await connectDB();
  if (useMongo) {
    const res = await dbInstance.collection('quickReplies').deleteOne({ id });
    return res.deletedCount > 0;
  } else {
    const idx = localDbCache.quickReplies.findIndex(q => q.id === id);
    if (idx !== -1) {
      localDbCache.quickReplies.splice(idx, 1);
      saveLocalDB();
      return true;
    }
    return false;
  }
};

// API Methods for Settings

export const getSettings = async () => {
  await connectDB();
  if (useMongo) {
    const doc = await dbInstance.collection('settings').findOne({}, { projection: { _id: 0 } });
    return doc || {};
  } else {
    return localDbCache.settings;
  }
};

export const saveSettings = async (settings) => {
  await connectDB();
  if (useMongo) {
    // In Mongo, update the single settings doc
    const current = await dbInstance.collection('settings').findOne({});
    if (current) {
      await dbInstance.collection('settings').updateOne({ _id: current._id }, { $set: settings });
    } else {
      await dbInstance.collection('settings').insertOne(settings);
    }
    return settings;
  } else {
    localDbCache.settings = { ...localDbCache.settings, ...settings };
    saveLocalDB();
    return localDbCache.settings;
  }
};
