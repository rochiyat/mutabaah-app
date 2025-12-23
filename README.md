# Mutabaah App

A full-stack activity tracking application built with React, Express, and MySQL. Track daily activities, monitor progress, and view comprehensive statistics.

## Features

- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Activity Management**: Create, update, and manage daily activities with custom targets and units
- **Activity Tracking**: Record daily activity completion with notes
- **Statistics Dashboard**: View activity statistics and progress tracking
- **Responsive UI**: Built with React and modern web technologies

## Tech Stack

### Frontend
- React 18
- React Router DOM
- Axios for HTTP requests
- Vite for build tooling
- TypeScript

### Backend
- Express.js
- Prisma ORM
- MySQL database
- JWT authentication
- bcryptjs for password hashing

### Tools & Libraries
- date-fns for date manipulation
- Zod for schema validation
- CORS for cross-origin requests

## Prerequisites

- Node.js (v18 or higher)
- MySQL database
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mutabaah-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Update `.env` with your configuration:
```env
DATABASE_URL="mysql://user:password@host:port/database"
JWT_SECRET="your-super-secret-jwt-key"
NODE_ENV="development"
PORT=3000
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Generate Prisma client:
```bash
npm run prisma:generate
```

## Development

Start the development server:
```bash
npm run dev
```

This will start both the Express backend (port 3000) and Vite dev server.

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build frontend and backend for production
- `npm run build:server` - Build backend only
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:studio` - Open Prisma Studio for database management

## Project Structure

```
mutabaah-app/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── context/           # React context for state management
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API service calls
│   ├── types/             # TypeScript type definitions
│   └── main.tsx           # React entry point
├── server/                # Backend Express application
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── index.ts           # Express server entry point
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Prisma schema definition
│   └── migrations/        # Database migration files
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Activities
- `GET /api/activities` - Get user's activities
- `POST /api/activities` - Create new activity
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity

### Records
- `GET /api/records` - Get activity records
- `POST /api/records` - Create new record
- `PUT /api/records/:id` - Update record
- `DELETE /api/records/:id` - Delete record

### Statistics
- `GET /api/stats` - Get activity statistics

## Database Schema

### User
- id (Primary Key)
- email (Unique)
- name
- password (hashed)
- createdAt
- updatedAt

### Activity
- id (Primary Key)
- name
- category
- target
- unit
- isActive
- userId (Foreign Key)
- createdAt
- updatedAt

### Record
- id (Primary Key)
- date
- completed
- notes
- activityId (Foreign Key)
- userId (Foreign Key)
- createdAt
- updatedAt

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | MySQL database connection string | mysql://user:pass@host:port/db |
| JWT_SECRET | Secret key for JWT token signing | your-secret-key |
| NODE_ENV | Environment mode | development, production |
| PORT | Server port | 3000 |

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@mutabaah-app.com or open an issue in the repository.
