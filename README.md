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

## API

Health:

- GET /health

Authentication:

- POST /auth/register
- POST /auth/login

Tasks (all require auth):

- POST /tasks
- GET /tasks
- PUT /tasks/:id
- DELETE /tasks/:id

For protected routes, send:

```http
Authorization: Bearer <token>
```

## Task Query Params

For GET /tasks:

- priority=low|medium|high
- completed=true|false
- tags=work,urgent
- sort=dueDateAsc|dueDateDesc|priorityHigh|priorityLow|createdAtDesc|createdAtAsc

## Notes

- Every task is tied to a user via userId.
- Users can only access their own tasks.