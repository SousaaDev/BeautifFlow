# BeautyFlow Backend

Backend API for the BeautyFlow SaaS application, built with Node.js, Express, TypeScript, and a traditional MVC-like structure.

## Features

- Multi-tenant architecture
- JWT authentication
- Zod validation
- PostgreSQL database
- Redis caching
- Traditional API structure (Models, Controllers, Services, Routes)

## Installation

1. Clone the repository
2. Navigate to the backend directory: `cd backend`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and fill in your configuration
5. Run database migrations: `npm run init-db`
6. Start the development server: `npm run dev`

## Scripts

- `npm run dev`: Start the development server with hot reload
- `npm run build`: Build the project
- `npm run start`: Start the production server
- `npm run init-db`: Initialize database tables
- `npm test`: Run tests
- `npm run lint`: Lint the code
- `npm run format`: Format the code

## Project Structure

```
src/
├── controllers/     # 🎮 Request handlers and response formatting
├── models/          # 🏛️ Database models and data access
├── services/        # 🧠 Business logic and use cases
├── routes/          # 🛣️ API route definitions
├── middlewares/     # 🛡️ Authentication, validation, etc.
├── database/        # 🗄️ Database connection and configuration
└── index.ts         # 🚀 Application entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Tenants (Beauty Shops)
- `POST /api/tenants` - Create new beauty shop
- `GET /api/tenants/:id` - Get beauty shop details
- `PUT /api/tenants/:id` - Update beauty shop

See the full documentation in the main BeautyFlow document for all endpoints.