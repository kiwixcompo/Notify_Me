# WWR Notify Me Frontend

This is the Next.js (React) frontend for the WWR Notify Me application. It provides user registration, login, job preference management, and a dashboard for matched jobs.

## Features
- User registration and login (JWT)
- Job preference management (multi-select dropdown)
- Dashboard for matched jobs (with Apply links)
- API integration with backend
- Tailwind CSS for modern styling

## Setup Instructions

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Configure environment variables
Copy `.env.local.example` to `.env.local` and fill in your values:
```bash
cp .env.local.example .env.local
```
- `NEXT_PUBLIC_API_URL`: Backend API base URL (default: http://localhost:4000)

### 3. Start the frontend
```bash
npm run dev
```

## Folder Structure
- `pages/` - Main app pages (Next.js routing)
- `components/` - Reusable UI components
- `styles/` - Global styles (Tailwind)

## License
MIT 