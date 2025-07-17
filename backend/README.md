# WWR Notify Me Backend

This is the backend API for the WWR Notify Me application. It provides user authentication, job preference management, job data APIs, and background job processing for fetching remote jobs and sending notifications.

## Features
- User registration and login (JWT, bcrypt)
- Job preference management
- RESTful API for frontend
- MongoDB for data storage
- Agenda for background job scheduling
- SendGrid for email notifications
- Security best practices (rate limiting, input validation, CORS, helmet)

## Setup Instructions

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT signing
- `SENDGRID_API_KEY`: Your SendGrid API key
- `EMAIL_FROM`: Sender email address
- `FRONTEND_URL`: Frontend base URL (for CORS and email links)
- `PORT`: Port for backend server (default: 4000)

### 3. Start the backend server
```bash
npm run dev
# or
npm start
```

### 4. Start the background worker
```bash
npm run worker
```

## Folder Structure
- `src/` - Main API source code
- `worker/` - Background job processor (Agenda)

## API Endpoints
- `/api/auth/register` - Register a new user
- `/api/auth/login` - Login and receive JWT
- `/api/user/preferences` - Get/update job preferences
- `/api/jobs` - Get recent matched jobs for user

## License
MIT 