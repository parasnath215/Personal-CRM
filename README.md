# Personal CRM (WhatsApp CRM)

A full-stack Personal CRM application designed to manage contacts, tasks, goals, hotel guest check-ins, and expenses. Built with a Node.js/Express + TypeScript backend using Prisma, and a Vite + React frontend.

## Project Structure

```
├── backend/            # Express.js Server (TypeScript, Prisma)
├── frontend/           # React Client (Vite, TailwindCSS)
└── README.md           # This deployment & hosting guide
```

---

## Local Development Quickstart

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables by copying `.env.example` or creating `.env`:
   ```ini
   DATABASE_URL="file:./dev.db"
   PORT=3000
   JWT_SECRET="your_jwt_secret"
   ```
4. Run migrations to initialize the database:
   ```bash
   npx prisma migrate dev
   ```
5. Seed the initial database (creates admin and accountant users, etc.):
   ```bash
   npm run seed
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## Render Deployment Guide

This project is fully structured for easy hosting on [Render](https://render.com). 

We recommend hosting the **backend as a Web Service** and the **frontend as a Static Site**.

---

### Phase 1: Deploying the Backend (Web Service)

Since the backend uses a local SQLite database (`dev.db`), standard server instances on Render will reset the database daily due to ephemeral filesystems. To keep your data safe, we suggest either mounting a **Persistent Disk** on Render or switching to a **PostgreSQL Database**.

#### Option A: Hosting with SQLite and Render Persistent Disk (Free/Low Cost)
1. **Create Web Service**:
   - Go to your Render Dashboard and create a new **Web Service**.
   - Connect your GitHub repository.
2. **Configure Settings**:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
3. **Mount Persistent Disk**:
   - Scroll down to the **Disks** section and click **Add Disk**.
   - **Name**: `sqlite_db`
   - **Mount Path**: `/data`
   - **Size**: `1 GiB` (minimum, sufficient for millions of rows)
4. **Environment Variables**:
   - Add the following variables under the **Env Groups / Environment Variables** section:
     - `PORT`: `3000` (or leave empty, Render will auto-assign a port)
     - `DATABASE_URL`: `file:/data/dev.db` (points to the mounted disk)
     - `JWT_SECRET`: a secure random string (e.g. `your_production_secret`)
     - `NODE_ENV`: `production`

#### Option B: Deploying with PostgreSQL (Highly Recommended for Production)
If you prefer not to use SQLite persistent disks, you can deploy a managed database on Render:
1. **Create Database**:
   - Go to Render Dashboard -> **New** -> **PostgreSQL**.
   - Retrieve the **Internal/External Database URL**.
2. **Update Prisma Provider**:
   - Open `backend/prisma/schema.prisma` and change the database provider to `postgresql`:
     ```prisma
     datasource db {
       provider = "postgresql"
       url      = env("DATABASE_URL")
     }
     ```
3. **Create Web Service**:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npx prisma migrate deploy && npm start`
4. **Environment Variables**:
   - Set `DATABASE_URL` to your Render PostgreSQL connection string.
   - Set `JWT_SECRET` and other variables as mentioned above.

---

### Phase 2: Deploying the Frontend (Static Site)

The frontend is a Vite React application that can be served as a Static Site.

1. **Create Static Site**:
   - Go to Render Dashboard and click **New** -> **Static Site**.
   - Connect your GitHub repository.
2. **Configure Settings**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. **Configure Environment Variables**:
   - Add a environment variable:
     - `VITE_API_URL`: The URL of your live backend Web Service (e.g., `https://personal-crm-backend.onrender.com` - do **not** add a trailing slash `/`).
4. **Setup Single Page Application (SPA) Routing Rewrite Rule**:
   - Because the React app uses client-side routing, page refreshes on subpages (like `/contacts` or `/tasks`) will return a 404 error unless rewrite rules are configured.
   - Go to the **Redirects/Rewrites** tab of your Static Site dashboard on Render.
   - Click **Add Rule** and enter:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`
