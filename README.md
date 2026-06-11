# ClientFlow — WhatsApp CRM Platform

ClientFlow is a free, lightweight, and modern dark-mode Customer Relationship Management (CRM) platform specifically designed to track clients, pipeline stages, and communication histories using WhatsApp. 

It is designed to run completely for **$0 cost** and supports zero-friction updates by deploying directly as a serverless monorepo on **Vercel** connected to a **MongoDB Atlas** database.

---

## ✨ Features
1. **Sales Pipeline (Kanban Board)**: Drag-and-drop columns (`New Lead`, `Contacted`, `Proposal`, `Negotiation`, `Won`, `Lost`) to progress your leads.
2. **Chat Inbox Clone**: A full WhatsApp-style inbox interface to view active chat threads, read message logs, set client stages/tags, and log interaction notes.
3. **Smart Paste Parser (100% Safe)**: A manual parser where you copy chat bubbles from WhatsApp Web and paste them inside to instantly extract sender names, phones, and message histories. (No API limits or ban risks!).
4. **Quick Reply Templates**: Canned response manager (e.g. `/intro`, `/pricing`) that lets you copy messages or send them immediately in one click.
5. **Real-time Sync Extensions**: A Chrome Extension (located in the `/extension` directory) or browser script that runs in the console of `web.whatsapp.com` to scrape incoming messages and automatically dispatch outbound replies.
6. **Official Webhook Integration**: Full support for Meta's official WhatsApp Business Cloud API webhook.

---

## 🛠️ Tech Stack
* **Frontend**: React (Vite), Vanilla CSS, Lucide icons
* **Backend**: Node.js, Express, Server-Sent Events (SSE)
* **Database**: MongoDB Atlas (Cloud) / Local `db.json` (Local fallback)
* **Hosting**: Vercel Serverless

---

## 🚀 How to Run Locally

### Prerequisites
Make sure you have Node.js (v18+) and npm installed.

### Setup and Install
1. Clone the project.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open **[http://localhost:5173/](http://localhost:5173/)** in your browser. The app will automatically run on local file storage (`db.json`) in your root directory.

---

## 🌐 Deploying to Vercel ($0 Cloud Hosting)

Deploying to Vercel allows you to access your CRM database from anywhere and guarantees that updates are automatically built whenever you commit code.

### Step 1: Push to GitHub
1. Create a new **private** repository on [GitHub](https://github.com/).
2. Push your local repository to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Set Up MongoDB Atlas ($0 Database)
1. Register a free account on [MongoDB Atlas](https://www.mongodb.com/).
2. Create a shared database using the **M0 Shared Free Tier**.
3. Under **Network Access**, set the IP whitelist to **Allow Access From Anywhere** (`0.0.0.0/0`) so Vercel can connect.
4. Under **Database Access**, create a user (e.g., `crmuser`) with a password.
5. Click **Connect** -> **Connect your application**, and copy your connection string:
   ```
   mongodb+srv://crmuser:<password>@cluster0.xxxx.mongodb.net/clientflow?retryWrites=true&w=majority
   ```

### Step 3: Link to Vercel
1. Log in to [Vercel](https://vercel.com/) with your GitHub account.
2. Click **Add New...** -> **Project**, and import your repository.
3. Expand **Environment Variables** and add:
   - **Name**: `MONGODB_URI`
   - **Value**: `YOUR_MONGODB_ATLAS_CONNECTION_STRING`
4. Click **Deploy**. Vercel will build your static files and compile serverless endpoints, serving your CRM at a public `.vercel.app` domain.

### 🔄 Modifying and Upgrading Features
Vercel is linked to your GitHub repository for continuous deployment. When you want to add new tabs or upgrade dashboard widgets:
1. Make code modifications locally.
2. Push them to your GitHub:
   ```bash
   git add .
   git commit -m "Update dashboard metrics UI"
   git push
   ```
3. Vercel will automatically build the changes and update your live web app in less than a minute!
