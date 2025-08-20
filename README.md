# Notify Me - Remote Job Alerts

Get instant alerts for new remote jobs from your favorite sources. Manage feeds, filter by category, and never miss an opportunity!

## Features
- User-managed RSS feeds (add, edit, delete, with optional API backup)
- Fetches jobs from multiple remote job sources
- Modern dashboard with category filtering, source grouping, and search
- PWA: Installable, offline support, and background sync for failed requests
- Mobile-friendly, responsive, and production-ready
- Profile management and settings

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (local or cloud)

### Backend Setup
```sh
cd backend
npm install
# Create a .env file with MONGODB_URI, JWT_SECRET, and PORT
npm start
```

### Frontend Setup
```sh
cd frontend
npm install
# Create a .env.local file with NEXT_PUBLIC_API_URL (e.g., http://localhost:4000)
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

## PWA & Production
- The app is a Progressive Web App (PWA) with offline support and installability.
- For production, build the frontend with `npm run build` and use a process manager (e.g., PM2) for the backend.

## Contribution
Pull requests are welcome! Please open an issue first to discuss major changes.

## License
MIT

---
Maintained by [kiwixcompo](https://github.com/kiwixcompo) "# Backend successfully running on port 4000 with MongoDB connected" 
