# Nexus Backend - Where everything flows together

NestJS backend API with PostgreSQL database and session-based authentication.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up PostgreSQL database:
   - Create a new database named `nexus`
   - Or use your existing PostgreSQL credentials

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nexus

PORT=3001
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

## Running the Application

### Development mode
```bash
npm run start:dev
```

The API will be available at `http://localhost:3001`

### Production mode
```bash
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe" // optional
  }
  ```

- `POST /auth/login` - Login user
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `GET /auth/me` - Get current user (requires authentication)

- `POST /auth/logout` - Logout user

## Database

The application uses TypeORM with PostgreSQL. The database schema will be automatically created on first run (in development mode).

### User Entity
- `id` (UUID)
- `email` (unique)
- `password` (hashed)
- `name` (optional)
- `createdAt`
- `updatedAt`

## Session Management

The application uses `express-session` for managing user sessions. Sessions are stored in memory (default). For production, consider using a session store like Redis or connect-pg-simple.

## Testing the API

You can test the API using curl, Postman, or any API client.

Example: Register a user
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

Example: Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -c cookies.txt
```

Example: Get current user (with session cookie)
```bash
curl http://localhost:3001/auth/me -b cookies.txt
```

## Project Structure

```
backend/
├── src/
│   ├── auth/
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── users/
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   ├── types/
│   │   └── session.d.ts
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json
```

## Security Notes

- Passwords are hashed using bcrypt
- Sessions use HTTP-only cookies
- CORS is enabled for the frontend (http://localhost:5173)
- Change `SESSION_SECRET` in production
- Set `NODE_ENV=production` in production
- Consider using a proper session store in production
