# TOMT Productivity Platform

A full-stack MERN (MongoDB, Express, React, Node.js) productivity platform featuring Diary, Task Management, Coding Tracker, Internship/Placement Management, Routine Trackers, Document Hub, Notes, and more.

## Architecture

- **`tomt-backend/`**: Node.js + Express REST API with MongoDB Atlas, Mongoose, JWT authentication, and GridFS media storage.
- **`tomt-frontend/`**: Vite + React 18 single-page application with responsive layouts and real-time state management.
- **`migration/`**: Data migration tools and validation scripts for migrating legacy local storage to MongoDB.

## Getting Started

### 1. Backend Setup
```bash
cd tomt-backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd tomt-frontend
cp .env.example .env
# Edit .env with your VITE_API_URL (defaults to http://localhost:5000/api)
npm install
npm run dev
```

## Security & Secrets
- Never commit `.env` or configuration files containing real credentials.
- Copy `.env.example` templates to set up local environment variables.
