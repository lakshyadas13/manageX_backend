# ManageX Backend

Express and MongoDB REST API for ManageX with JWT authentication, multi-user collaboration, real-time activity history, task comments, and external service proxies.

[![Live API](https://img.shields.io/badge/LIVE%20API-MANAGEX-2F80B7?style=for-the-badge)](https://managex-backend.onrender.com)

---

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT (JSON Web Tokens) with `Bearer` scheme
- **Password Hashing:** `bcryptjs` (salt rounds: 10)
- **External Proxies:** WeatherAPI.com, ZenQuotes IO

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Configure the following variables:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/task_manager
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=7d
WEATHER_API_KEY=your-weatherapi-com-key
```

### 3. Run Server

**Development (with auto-reload via nodemon):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Base URL (default):
`http://localhost:5001`

---

## API Documentation

All protected routes require an `Authorization` header:
```http
Authorization: Bearer <your_jwt_token>
```

> **Note:** Task, Comment, and Activity routes are accessible under both `/` and `/api/` prefixes (e.g. `/tasks` or `/api/tasks`).

---

### 1. Health Check

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/health` | Server health status | No |

---

### 2. Authentication

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Register a new user (`name`, `email`, `password`) | No |
| `POST` | `/auth/login` | Login user and return JWT token | No |

---

### 3. Users & Account

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/api/users` | List all users (`_id`, `name`, `email`) for collaboration | Yes |
| `PATCH` | `/api/users/change-password` | Update password (`currentPassword`, `newPassword`) | Yes |

---

### 4. Tasks & Collaboration

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/tasks` | List tasks visible to user (owned, assigned, or collaborated) | Yes |
| `POST` | `/tasks` | Create task with optional multiple `collaborators` | Yes |
| `GET` | `/tasks/:id` | Get single task details with populated users | Yes |
| `PUT` | `/tasks/:id` | Update task details (creator: full; collaborator: status only) | Yes |
| `PATCH` | `/tasks/:id` | Partial task update | Yes |
| `PATCH` | `/tasks/:id/collaborators` | Update collaborator list (creator only) | Yes |
| `DELETE` | `/tasks/:id` | Delete task & cascade clean comments/activity (creator only) | Yes |

#### Query Parameters for `GET /tasks`:
- `priority`: `low` | `medium` | `high`
- `completed`: `true` | `false`
- `tags`: comma-separated tag list (e.g. `work,urgent`)
- `sort`: `dueDateAsc` (default) | `dueDateDesc` | `priorityHigh` | `priorityLow` | `createdAtDesc` | `createdAtAsc`

#### Multi-Collaborator Request Example (`POST /tasks`):
```json
{
  "title": "Design Database Schema",
  "priority": "high",
  "dueDate": "2026-09-20",
  "dueTime": "14:00",
  "notes": "Discuss MongoDB collections and indexes",
  "tags": ["database", "architecture"],
  "collaborators": ["65f1a2b3c4d5e6f7a8b9c0d1", "65f1a2b3c4d5e6f7a8b9c0d2"]
}
```

---

### 5. Task Comments

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/tasks/:taskId/comments` | List comments for a task (chronological order) | Yes |
| `POST` | `/tasks/:taskId/comments` | Post a comment on a task (records activity) | Yes |
| `PATCH` | `/comments/:commentId` | Edit comment (author only) | Yes |
| `DELETE` | `/comments/:commentId` | Delete comment (author only) | Yes |

---

### 6. Task Activity History

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/tasks/:taskId/activity` | List timeline events for a task (reverse chronological) | Yes |

**Tracked Events:**
- Task creation (`created this task`)
- Status toggle (`marked the task as completed` / `marked the task as incomplete`)
- Priority changes (`changed priority from Medium to High`)
- Due date changes (`changed due date to ...`)
- Collaborators added/removed (`added John as a collaborator`)
- Comments added (`added a comment`)

---

### 7. External Integrations (Proxies)

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/api/weather` | Current weather by coordinates (`?lat=...&lon=...`) or city (`?city=...`) | No |
| `GET` | `/api/quotes/random` | Daily motivational quote with built-in fallbacks | No |

---

## Role-Based Access Control (RBAC)

- **Task Creator (`userId`):** Full control. Can edit task metadata, assign or remove collaborators, delete the task, view activity, and participate in comments.
- **Collaborators (`collaborators` / `assignedTo`):** Can view the task, toggle task completion status, view activity history, and post comments. Non-creators cannot modify titles, change priorities, reassign members, or delete tasks.
- **Comment Author:** Only the original author can edit (`PATCH`) or delete (`DELETE`) their own comment. Unauthorized attempts return `403 Forbidden`.
- **Private Data Protection:** Passwords and sensitive user fields are strictly excluded from populated queries.

---

## License

MIT
