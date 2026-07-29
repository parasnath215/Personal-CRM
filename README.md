# Personal CRM & Task Management System

A full-stack Personal CRM and Task Manager built with **Express.js**, **TypeScript**, **Prisma**, **React**, **Vite**, and **TailwindCSS**.

---

## 🏗️ Project Structure

```text
├── backend/            # Express.js API Server (TypeScript, Prisma, Node-Cron, WhatsApp)
├── frontend/           # React SPA Client (Vite, React Router, TailwindCSS)
├── render.yaml         # Render Blueprint configuration for 1-click deployment
└── README.md           # Documentation & Hosting Guide
```

---

## 🚀 Hosting on Render (Step-by-Step Guide)

You can host both the **Backend API** and **Frontend Static Web App** on [Render.com](https://render.com) using either the **1-Click Render Blueprint** (Recommended) or by setting up the two services manually.

---

### Option 1: 1-Click Render Blueprint (Recommended)

1. Push your repository to **GitHub**.
2. Log into your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** in the top right corner and select **Blueprint**.
4. Connect your GitHub repository (`Personal-CRM`).
5. Render will automatically detect `render.yaml` and configure:
   - **Backend Web Service** (`crm-backend`)
   - **Frontend Static Site** (`crm-frontend`)
6. Click **Apply**. Render will build and deploy both services!

---

### Option 2: Manual Setup on Render

If you prefer to configure each service manually in the Render dashboard:

#### Step 1: Deploy the Backend Service

1. On the Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `crm-backend`
   - **Region**: Select your preferred region (e.g., Singapore / Oregon / Frankfurt).
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Add **Environment Variables** under the **Environment** tab:
   | Key | Value / Instructions |
   | :--- | :--- |
   | `PORT` | `10000` |
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | Enter a secure random string (e.g. `secret_key_crm_99`) |
   | `DATABASE_URL` | `file:./dev.db` |
5. Click **Create Web Service**.
6. Once deployed, copy your backend URL (e.g., `https://crm-backend.onrender.com`).

---

#### Step 2: Deploy the Frontend Static Site

1. On the Render Dashboard, click **New +** → **Static Site**.
2. Connect your GitHub repository.
3. Configure the static site settings:
   - **Name**: `crm-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variables** under the **Environment** tab:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | Your Backend URL from Step 1 (e.g., `https://crm-backend.onrender.com`) |
5. Configure **Redirects / Rewrites** (Essential for React Router):
   - Go to **Redirects/Rewrites** tab in your static site dashboard.
   - Click **Add Rule**:
     - **Source**: `/*`
     - **Action**: `Rewrite`
     - **Destination**: `/index.html`
6. Click **Create Static Site**.

---

### 🗄️ Database Options on Render

#### Default SQLite (Built-in)
By default, the backend uses SQLite (`DATABASE_URL="file:./dev.db"`). 

*Note: Free tier Render instances restart periodically. If you want SQLite data to persist across restarts:*
- Add a **Render Persistent Disk** under your Backend service settings.
- Set Mount Path: `/var/data`
- Update Environment Variable: `DATABASE_URL="file:/var/data/dev.db"`

#### External PostgreSQL / Render PostgreSQL
To use PostgreSQL:
1. Create a free **PostgreSQL Database** on Render.
2. Update `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL` in your backend service environment variables to your PostgreSQL connection string.

---

### 🔑 Seeding Initial Data on Render

After your backend service is deployed:
1. Go to your Backend Service dashboard on Render.
2. Click the **Shell** tab.
3. Run the seed command to create default records:
   ```bash
   npm run seed
   ```
4. **Default Admin Login Credentials**:
   - **Email**: `admin@crm.com`
   - **Password**: `admin123`

---

## 💻 Local Development Quickstart

### 1. Backend Setup
```bash
cd backend
npm install
npm run build
npm run seed     # Seeds initial admin user & dummy data
npm run dev      # Starts Express dev server on port 3000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

---

## 📱 Features

- **Interactive Dashboard**: Real-time metric cards, interactive task calendar with day status indicators, today's schedule, and tomorrow's upcoming next-day tasks preview.
- **Task Management**: Create, edit, carry forward, and mark tasks done across custom dates.
- **Long-Term Goals**: Set target dates, financial/personal milestones, log monthly progress, and monitor percentage completion bars.
- **Contacts Directory**: Client profiles, family member records, tags, manual contact creation, and VCF import/export.
- **Hotel Guests Management**: Check-in guest management, room number assignments, and guest filter tracking.
- **Reports & Expenses**: Track operational expenses by category (Food, Utilities, Travel, etc.) with visual pie chart analytics.
- **WhatsApp Integration**: Session pairing and optional automated message notifications via `whatsapp-web.js`.
