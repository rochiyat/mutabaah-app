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

Update `.env` with your configuration (see `.env.example`). `JWT_SECRET` is required; the server
refuses to start without it, and refuses to start in production with a placeholder or short secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Generate Prisma client:
```bash
npm run prisma:generate
```

6. Create the first superadmin (set `SEED_SUPERADMIN_PASSWORD` in `.env` first):
```bash
npm run prisma:seed
```

## Roles

| Role | Access |
|------|--------|
| `superadmin` | Everything, including granting/revoking `superadmin` |
| `admin` | Manage all users (except superadmins) and all groups |
| `murabbi` | Create groups and manage the groups they lead |
| `user` | Personal activities plus the activities of every halaqoh they belong to |

### Halaqoh (groups)

A user can join several halaqoh. Inside a halaqoh each member is either `murabbi` or `mutarabbi`:

- The **penanggung jawab** (`Group.adminId`) is always a murabbi member. Only they, or a superadmin/admin, can delete the halaqoh or hand the role to another member.
- Any **murabbi member** (even with account role `user`) can edit the halaqoh, manage members and activities, and search users to add.
- **Mutarabbi** see the halaqoh and its activities, and can leave on their own.

Role and active status are read from the database on every request, so changes apply immediately.

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
- `GET /api/auth/me` - Current user

### Activities
- `GET /api/activities` - Get user's activities
- `POST /api/activities` - Create new activity
- `PATCH /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity

### Records
- `GET /api/records` - Get activity records
- `POST /api/records` - Create new record
- `PATCH /api/records/:id` - Update record
- `DELETE /api/records/:id` - Delete record

### Statistics
- `GET /api/stats/dashboard` - Today's progress, streak, activity count
- `GET /api/stats/weekly` - Per-activity data for the current week (Monday start)
- `GET /api/stats/monthly` - Per-activity totals for the current month, target counted up to today

### Groups
- `GET|POST /api/groups`, `GET|PATCH|DELETE /api/groups/:id` - fields: `name, description, level, schedule, location, isActive, adminId`
- `GET|POST /api/groups/:groupId/members` - POST takes `{ userId, role? }`
- `PATCH|DELETE /api/groups/:groupId/members/:userId` - PATCH takes `{ role }`; members may DELETE themselves
- `GET|POST /api/groups/:groupId/activities` - POST takes `{ activityId }` or `{ name, category, target, unit }` for a new group activity
- `PATCH|DELETE /api/groups/:groupId/activities/:activityId`

### Users (superadmin/admin; murabbi and halaqoh murabbi members can list)
- `GET /api/users?search=` - List users
- `PATCH /api/users/:id/role` - `{ role }`
- `PATCH /api/users/:id/status` - `{ isActive }`

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
| JWT_SECRET | Secret key for JWT token signing (required, 32+ chars) | output of the command above |
| SEED_SUPERADMIN_EMAIL | Email for the seeded superadmin | superadmin@mutabaah.com |
| SEED_SUPERADMIN_PASSWORD | Password for the seeded superadmin (seed only) | (8+ chars) |
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
