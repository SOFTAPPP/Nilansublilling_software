# Nilanshu Billing Software

Welcome to the Nilanshu Billing Software repository. This project is a desktop billing application built with **React** and **Tauri** for the frontend, and **Node.js, Express, and Prisma (PostgreSQL)** for the backend.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
1. **Node.js** (v18 or higher)
2. **PostgreSQL** (running locally or a remote database URL)
3. **Rust** (Required for Tauri to build the desktop app) - [Install Rust](https://www.rust-lang.org/tools/install)
4. **Git**

---

## Setup Instructions (After Git Clone)

Follow these steps to get the development environment running on your local machine.

### 1. Database & Backend Setup

The backend handles the API and database connections.

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` folder and add your database and secret keys:
   ```env
   # Example .env file
   PORT=3000
   DATABASE_URL="postgresql://username:password@localhost:5432/nilanshu_billing?schema=public"
   JWT_SECRET="your_super_secret_jwt_key"
   ```
   *(Make sure to replace `username`, `password`, and `nilanshu_billing` with your actual PostgreSQL credentials.)*
4. Run the Prisma migrations to set up your database schema:
   ```bash
   npx prisma migrate dev
   # OR if you just want to push the schema without migrations:
   # npx prisma db push
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend should now be running on `http://localhost:3000`.*

---

### 2. Frontend (Tauri Desktop App) Setup

The frontend is a React application bundled as a native desktop app using Tauri.

1. Open a **new** terminal window and navigate to the frontend directory:
   ```bash
   cd nilanshu-billing-app
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Tauri development environment:
   ```bash
   npm run tauri dev
   ```
   *Note: The first time you run this, it may take a few minutes as Rust compiles the native Tauri window. Once finished, the desktop app will launch automatically.*

---

## Useful Commands

- **Backend Start:** `npm run dev` (inside `/backend`)
- **Frontend Start:** `npm run tauri dev` (inside `/nilanshu-billing-app`)
- **Prisma Studio:** `npx prisma studio` (inside `/backend`) - Opens a web UI to view and edit your database.

