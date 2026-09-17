# 🚀 TOMT Productivity Platform

TOMT is a full-stack productivity and career management platform built to help students manage learning, placement preparation, internships, applications, schedules, targets, notes, documents, and other important activities in one place.

## ✨ Features

- 📊 Dashboard
- 🎓 Education & Learning Progress
- 💼 Placement Management
- 🚀 Internship / Application Tracker
- 🔗 Multiple Application Links
- 💬 Multiple Application Messages
- 🖼️ Multiple Application Images
- 📝 Important Log
- ❌ Mistake Analysis
- 📅 Schedule
- 🎯 Targets
- 🔔 Notifications
- 📄 Document Management
- 👨‍💻 Coding Profiles
- 🔐 JWT Authentication
- 🗄️ MongoDB Persistence
- 📦 MongoDB GridFS File Storage
- 📱 Responsive Mobile UI

## 💼 Internship / Application Tracker

Track internship and job applications with:

- Company
- Role
- Application date
- Status
- Multiple links
- Multiple messages
- Multiple images
- Mistake analysis

Supported statuses:

- Need To Apply
- Applied
- Interview
- Offer
- Rejected
- Success
- Failed

The **Tracks** section provides quick access to:

- Links
- Messages
- Images

All application data is stored in MongoDB and persists across refresh, logout/login, and backend restarts.

## 🎓 Education / Learning Progress

Track daily learning activities including:

- Courses
- Topics studied
- Study dates
- Topic links
- Key takeaways
- Photos
- PDFs
- Progress history

Learning records can be viewed, edited, and deleted.

## 📝 Important Log

Placement Important Log allows users to store important placement-related notes.

Notes are stored in MongoDB and protected by user ownership.

## 🗄️ Storage

MongoDB is used for persistent application data.

MongoDB GridFS is used for binary files such as images and PDFs.

The application does not depend on localStorage for primary data persistence.

## 🔐 Security

- JWT authentication
- Protected API routes
- User ownership validation
- Authenticated file access
- MongoDB-based persistence
- GridFS file protection
- Environment variables for secrets

Never commit `.env` files, API keys, passwords, or other secrets.

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS
- Axios
- React Router

### Backend
- Node.js
- Express.js
- JWT
- Multer
- REST APIs

### Database & Storage
- MongoDB
- Mongoose
- MongoDB GridFS
- MongoDB Atlas

### Deployment
- Vercel
- Render
- MongoDB Atlas

## 📁 Project Structure

```text
TOMT-Productivity-Platform/
│
├── tomt-frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   └── utils/
│   └── package.json
│
└── tomt-backend/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── models/
    │   ├── routes/
    │   ├── middleware/
    │   ├── services/
    │   └── utils/
    ├── server.js
    └── package.json
