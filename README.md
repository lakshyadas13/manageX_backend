# ManageX Backend

Express and MongoDB API for ManageX with JWT authentication.

## Stack

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- bcryptjs password hashing

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Configure values in .env:

```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/task_manager
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=7d
WEATHER_API_KEY=your-weatherapi-com-key
```

## Run

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Base URL (default):

- http://localhost:5001

## API Documentation

### Health Check:
- `GET /health`

### Authentication:
- `POST /auth/register`
- `POST /auth/login`

### Tasks (Requires Auth):
- `POST /tasks`
- `GET /tasks`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`

For protected routes, send the auth token via header:
```http
Authorization: Bearer <token>
```

#### Task Query Params (`GET /tasks`):
- `priority=` low | medium | high
- `completed=` true | false
- `tags=` work,urgent
- `sort=` dueDateAsc | dueDateDesc | priorityHigh | priorityLow | createdAtDesc | createdAtAsc

### External App Integrations (Widget Proxies):
- `GET /api/weather?city={cityName}` - Fetches live weather conditions via WeatherAPI.com (requires `WEATHER_API_KEY` in `.env`).
- `GET /api/quotes/random` - Fetches motivational quotes from ZenQuotes IO. Includes built-in hardcoded fallbacks to handle strict API rate limits seamlessly. 

## Architecture Notes
- Every task is tightly scoped to its specific user via `userId`.
- Users cannot access, modify, or delete tasks belonging to others.
- External API calls are proxied through the backend rather than the frontend to protect API Keys (like the Weather API key) from being exposed in the browser.