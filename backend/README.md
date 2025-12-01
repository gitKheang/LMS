# Library Management System - Backend API

Express.js REST API server for the Library Management System with MongoDB database and JWT authentication.

## Tech Stack

- **Node.js** + **TypeScript**
- **Express.js** - Web framework
- **MongoDB** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers
- **Rate Limiting** - DDoS protection

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

The `.env` file is already created with MongoDB connection details. Review and update if needed:

```bash
# backend/.env
MONGODB_URI=mongodb+srv://admin:admin@library-db.hgo6dun.mongodb.net/?appName=library-db
DATABASE_NAME=library
JWT_SECRET=library-jwt-secret-change-this-in-production-2024
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:4200
```

**⚠️ IMPORTANT:** Change `JWT_SECRET` in production!

### 3. Seed the Database

Make sure MongoDB Atlas is accessible, then seed initial data:

```bash
npm run seed
```

This will populate the database with users, books, book copies, and loans.

### 4. Start the Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Books

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/books/categories` | Get all categories | No |
| GET | `/api/books` | Get active books | No |
| GET | `/api/books/:id` | Get book by ID | No |
| GET | `/api/books/available-for-loans` | Get books with available copies | Yes |
| GET | `/api/admin/books` | Get all books (admin) | Yes (ADMIN/STAFF) |
| POST | `/api/admin/books` | Create new book | Yes (ADMIN/STAFF) |
| PUT | `/api/admin/books/:id` | Update book | Yes (ADMIN/STAFF) |
| DELETE | `/api/admin/books/:id` | Delete book | Yes (ADMIN/STAFF) |

### Loans

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/loans/user/:userId` | Get user's loans | Yes |
| GET | `/api/admin/loans` | Get all loans | Yes (ADMIN/STAFF) |
| POST | `/api/admin/loans` | Create new loan | Yes (ADMIN/STAFF) |
| POST | `/api/admin/loans/:id/return` | Return a loan | Yes (ADMIN/STAFF) |
| POST | `/api/admin/loans/:id/remind` | Send overdue reminder | Yes (ADMIN/STAFF) |
| GET | `/api/admin/dashboard` | Get dashboard statistics | Yes (ADMIN/STAFF) |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/users` | Get all users | Yes (ADMIN/STAFF) |
| POST | `/api/admin/users/staff` | Create staff member | Yes (ADMIN) |
| DELETE | `/api/admin/users/:id` | Delete user | Yes (ADMIN/STAFF) |
| POST | `/api/users/request-password-reset` | Request password reset | No |
| POST | `/api/admin/users/:id/reset-password` | Reset user password | Yes (ADMIN/STAFF) |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

The Angular frontend handles this automatically.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.ts   # Authentication logic
│   │   ├── books.controller.ts  # Books CRUD
│   │   ├── loans.controller.ts  # Loans management
│   │   └── users.controller.ts  # User management
│   ├── middleware/
│   │   └── auth.ts              # JWT verification & role checking
│   ├── routes/
│   │   └── index.ts             # All API routes
│   ├── utils/
│   │   └── jwt.ts               # JWT token utilities
│   └── server.ts                # Express app setup
├── .env                         # Environment variables
├── .env.example                 # Example environment file
├── package.json
├── tsconfig.json
└── README.md
```

## Development Scripts

```bash
npm run dev      # Start development server with auto-reload
npm run build    # Build TypeScript to JavaScript
npm start        # Run production build
npm run seed     # Seed database with initial data
```

## Database Seeding

The seed script (`src/scripts/seed.ts`) will:

1. Connect to MongoDB Atlas
2. Clear existing data
3. Hash all passwords with bcrypt
4. Insert users, books, bookCopies, and loans
5. Create indexes for optimal performance

**Default Admin User:**
- Email: `admin@library.edu`
- Password: `admin123`

## Security Features

✅ **JWT Authentication** - Secure token-based auth
✅ **Password Hashing** - bcrypt with 10 salt rounds
✅ **CORS Protection** - Only allowed origins
✅ **Helmet** - Security headers
✅ **Rate Limiting** - 100 requests per 15 minutes
✅ **Role-Based Access** - ADMIN, STAFF, USER roles
✅ **Input Validation** - Via express-validator (can be extended)

## Error Handling

All endpoints return consistent error responses:

```json
{
  "message": "Error description"
}
```

HTTP status codes:
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | Required |
| `DATABASE_NAME` | Database name | `library` |
| `JWT_SECRET` | Secret for JWT signing | Required |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:4200` |

## Production Deployment

1. **Update Environment Variables:**
   - Change `JWT_SECRET` to a strong random string
   - Set `NODE_ENV=production`
   - Update `ALLOWED_ORIGINS` to your production domain

2. **Build the Application:**
   ```bash
   npm run build
   ```

3. **Start Production Server:**
   ```bash
   npm start
   ```

4. **Use Process Manager (PM2):**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name library-backend
   pm2 save
   pm2 startup
   ```

## Troubleshooting

### Connection Issues

**Problem:** Can't connect to MongoDB
- Verify MongoDB URI in `.env`
- Check network connectivity
- Ensure MongoDB Atlas allows your IP

**Problem:** CORS errors
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check that frontend is making requests to correct backend URL

### Authentication Issues

**Problem:** Token validation fails
- Ensure `JWT_SECRET` matches between environments
- Check token is being sent in `Authorization` header
- Verify token hasn't expired (default: 7 days)

### Database Issues

**Problem:** Seed script fails
- Check MongoDB connection
- Verify database exists in Atlas
- Ensure you have write permissions

## Support

For issues or questions:
- Check the main repository README
- Review API endpoint documentation above
- Check server logs for detailed error messages

## License

ISC
