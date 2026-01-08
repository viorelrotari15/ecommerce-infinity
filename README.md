# E-commerce Infinity

A production-ready, scalable e-commerce monorepo platform built with Next.js, NestJS, and PostgreSQL. Designed for easy rebranding, SEO optimization, and local development.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development without Docker)

### One-Command Startup

**Development Mode (Hot Reload):**
```bash
# Quick setup
./scripts/setup-local-env.sh

# Start with hot reload
docker compose -f docker compose.yml -f docker compose.dev.yml up
```

**Production Mode (Optimized):**
```bash
# Create .env file
cp docs/env-templates/.env.example .env
# Edit .env with local values

# Build and start
docker compose up --build -d
```

**Or use the build script:**
```bash
./scripts/build-local.sh
```

This will:
- Start PostgreSQL database
- Start NestJS backend API (port 3000)
- Start Next.js frontend (port 3001)
- Start MinIO object storage (ports 9000/9001)
- Run database migrations
- Seed the database with demo data

The application will be available at:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **API Documentation**: http://localhost:3000/api/docs
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)

### Environment Variables

For Docker Compose, create `.env` in the project root:

```bash
cp .env.example .env
```

For local development (without Docker), create `.env.local` files:
- `apps/backend/.env.local` - Backend configuration
- `apps/frontend/.env.local` - Frontend configuration

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for fully local setup, or [docs/ENVIRONMENT_SETUPS.md](docs/ENVIRONMENT_SETUPS.md) for all configuration options.

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_APP_URL`: Frontend URL

## 📁 Project Structure

```
ecommerce-infinity/
├── apps/
│   ├── frontend/          # Next.js SSR application
│   │   ├── src/
│   │   │   ├── app/       # App Router pages
│   │   │   ├── components/ # React components
│   │   │   └── lib/       # Utilities and API client
│   │   └── package.json
│   │
│   └── backend/           # NestJS API
│       ├── src/
│       │   ├── auth/      # Authentication module
│       │   ├── users/     # User management
│       │   ├── products/  # Product CRUD
│       │   ├── brands/    # Brand management
│       │   ├── categories/ # Category management
│       │   ├── orders/    # Order processing
│       │   └── payments/  # Payment handling
│       ├── prisma/        # Database schema & migrations
│       └── package.json
│
├── packages/
│   ├── shared/            # Shared TypeScript types
│   └── ui/                # Shared UI theme config
│
├── docker compose.yml     # Docker orchestration
└── README.md
```

## 🗄️ Database

### Schema Overview

The database uses a flexible, future-proof design:

- **Product**: Generic product entity (not perfume-specific)
- **ProductType**: Defines product categories (perfume, cosmetic, etc.)
- **Attribute**: Dynamic attributes per product type
- **ProductAttribute**: Stores attribute values
- **ProductVariant**: Price, stock, and variant-specific data
- **Category**: Hierarchical category system
- **Brand**: Brand information
- **User**: User accounts with role-based access
- **Order**: Order management
- **Payment**: Payment processing

### Migrations

Migrations are handled automatically by Prisma in Docker. For manual migration:

```bash
cd apps/backend
npx prisma migrate dev
```

### Seeding

The database is automatically seeded on first startup. To manually seed:

```bash
cd apps/backend
npm run prisma:seed
```

**Demo Accounts:**
- Admin: `admin@example.com` / `admin123`
- User: `user@example.com` / `user123`

## 🎨 Theming & Rebranding

The frontend uses a CSS variable-based theme system for easy rebranding.

### Changing Colors

Edit `apps/frontend/src/app/globals.css`:

```css
:root {
  --primary: 221 83% 53%;        /* Change to your brand color */
  --primary-foreground: 210 40% 98%;
  --secondary: 262 83% 58%;      /* Secondary color */
  --accent: 142 76% 36%;          /* Accent color */
}
```

Use an HSL color picker (e.g., https://hslpicker.com/) to find your brand colors.

### Changing Typography

Update the font in `apps/frontend/src/app/layout.tsx`:

```tsx
import { YourFont } from 'next/font/google';

const yourFont = YourFont({ subsets: ['latin'] });
```

### Theme Variables

All theme variables are defined in `globals.css`:
- `--primary` / `--primary-foreground`
- `--secondary` / `--secondary-foreground`
- `--accent` / `--accent-foreground`
- `--background` / `--foreground`
- `--border`, `--input`, `--ring`
- `--radius` (border radius)

## 🔍 SEO & SSR Strategy

### Server-Side Rendering

- All pages use Next.js App Router with Server Components by default
- Data fetching happens on the server
- Static generation where possible (ISR for product pages)
- Dynamic rendering for user-specific content

### SEO Features

- **Metadata API**: Dynamic metadata per page
- **Open Graph**: Social media sharing tags
- **Twitter Cards**: Twitter sharing optimization
- **Sitemap**: Auto-generated at `/sitemap.xml`
- **Robots.txt**: Available at `/robots.txt`
- **Clean URLs**: SEO-friendly slugs for products, categories, brands
- **Image Optimization**: Next.js Image component with automatic optimization

### Example: Product Page Metadata

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription,
    openGraph: {
      title: product.name,
      images: [product.images[0]],
    },
  };
}
```

## 🛠️ Development

### Development Experience

The project is configured for an excellent development experience with **hot reloading** and **live code updates**.

#### Hot Reloading (Already Configured)

**Frontend:**
- ✅ Volume mount: `./apps/frontend:/app` (excludes `node_modules` and `.next`)
- ✅ Command: `npm run dev` (Next.js dev server with hot reload)
- ✅ Changes to React/Next.js files reload automatically in the browser

**Backend:**
- ✅ Volume mount: `./apps/backend:/app` (excludes `node_modules`)
- ✅ Command: `npm run start:dev` (NestJS watch mode)
- ✅ Changes to TypeScript files trigger automatic rebuild and restart

#### How to Develop

1. **Start containers:**
   ```bash
   docker compose up
   ```

2. **Edit code locally:**
   - Edit files in `apps/frontend/src/` or `apps/backend/src/`
   - Changes are reflected automatically (no container restart needed)
   - Frontend changes appear instantly in the browser
   - Backend changes trigger automatic rebuild

3. **View logs:**
   ```bash
   # All services
   docker compose logs -f
   
   # Specific service
   docker compose logs -f frontend
   docker compose logs -f backend
   docker compose logs -f postgres
   ```

### Local Development (Without Docker)

For faster iteration during active development, you can run services locally:

#### Option 1: Database Only in Docker

```bash
# Terminal 1: Start only database
docker compose up postgres -d

# Terminal 2: Backend (local)
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev

# Terminal 3: Frontend (local)
cd apps/frontend
npm install
npm run dev
```

#### Option 2: Full Local Development

```bash
# Install PostgreSQL locally, then:

# Terminal 1: Backend
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev

# Terminal 2: Frontend
cd apps/frontend
npm install
npm run dev
```

### Debugging

#### Console Debugging

**Backend:**
- Use `console.log()`, `console.error()`, etc.
- View logs: `docker compose logs -f backend`
- Or check terminal if running locally

**Frontend:**
- Use browser DevTools (F12)
- Console logs appear in browser console
- React DevTools for component inspection

#### VS Code Debugger Setup

The project includes a VS Code debug configuration (`.vscode/launch.json`). To enable debugging:

1. **Start with debug ports:**

```bash
# Use the debug compose file
docker compose -f docker compose.yml -f docker compose.debug.yml up
```

Or manually add debug ports to `docker compose.yml`:

```yaml
backend:
  ports:
    - "3001:3001"
    - "9229:9229"  # Node.js debug port
  command: sh -c "npm install && npx prisma generate && (npx prisma migrate deploy || npx prisma migrate dev --name init) && npx ts-node -r tsconfig-paths/register prisma/seed.ts && npm run start:debug"
```

2. **VS Code debug configuration (already included in `.vscode/launch.json`):**
   - "Debug Backend" - Attaches to backend on port 9229
   - "Debug Frontend" - Attaches to frontend on port 9228

3. **Start debugging:**
   - Set breakpoints in your code
   - Start containers: `docker compose up`
   - Press F5 or use "Run and Debug" panel
   - Select "Debug Backend" or "Debug Frontend"

#### Database Access

```bash
# Connect to database from host (port 5433)
psql -h localhost -p 5433 -U postgres -d ecommerce

# Or via Docker
docker compose exec postgres psql -U postgres -d ecommerce

# Common queries
SELECT * FROM products;
SELECT * FROM users;
```

### Docker Commands

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (clean database)
docker compose down -v

# Rebuild containers
docker compose build

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Restart a specific service
docker compose restart backend
docker compose restart frontend

# Execute command in container
docker compose exec backend npm run lint
docker compose exec frontend npm run lint
```

### Development Tips

1. **Recommended Workflow:**
   - Use Docker for database: `docker compose up postgres -d`
   - Run frontend/backend locally for faster feedback
   - Use full Docker Compose for integration testing

2. **First Time Setup:**
   - First `docker compose up` may take 5-10 minutes (installing dependencies)
   - Subsequent starts are much faster

3. **Clearing Cache:**
   ```bash
   # Clear Next.js cache
   rm -rf apps/frontend/.next
   
   # Clear node_modules (if issues)
   docker compose down
   docker compose build --no-cache
   ```

4. **TypeScript Errors:**
   - Check container logs: `docker compose logs backend`
   - Or run locally: `cd apps/backend && npm run build`

5. **Prisma Changes:**
   ```bash
   # After schema changes
   docker compose exec backend npx prisma migrate dev
   docker compose exec backend npx prisma generate
   ```

6. **Environment Variables:**
   - Changes to `.env` require container restart
   - Use `docker compose restart backend` or `docker compose restart frontend`

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:3001/api/docs

### Authentication

Most endpoints require JWT authentication:

1. Register or login at `/api/auth/login`
2. Receive `access_token`
3. Include in requests: `Authorization: Bearer <token>`

### Example API Calls

```bash
# Get all products
curl http://localhost:3001/api/products

# Get product by slug
curl http://localhost:3001/api/products/elegance-classic

# Get categories
curl http://localhost:3001/api/categories

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"user123"}'
```

## 🧩 Technology Stack

### Frontend
- **Next.js 14**: App Router, Server Components, SSR
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **TanStack Query**: Data fetching and caching
- **Zustand**: State management (cart, UI state)
- **React Hook Form**: Form handling
- **Yup**: Schema validation

### Backend
- **NestJS**: Progressive Node.js framework
- **TypeScript**: Type safety
- **PostgreSQL**: Relational database
- **Prisma**: ORM and database toolkit
- **JWT**: Authentication
- **bcrypt**: Password hashing
- **Swagger**: API documentation
- **class-validator**: DTO validation

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **PostgreSQL**: Database container

## 🎯 Key Features

### Product System
- ✅ Generic product model (not perfume-specific)
- ✅ Product types (perfume, cosmetic, etc.)
- ✅ Dynamic attributes per product type
- ✅ Multiple variants per product
- ✅ Hierarchical categories
- ✅ Brand management
- ✅ Stock management
- ✅ Featured products

### User System
- ✅ User registration and authentication
- ✅ JWT-based auth
- ✅ Role-based access control (USER, ADMIN)
- ✅ User profiles

### Order System
- ✅ Order creation
- ✅ Order status tracking
- ✅ Order history
- ✅ Payment integration (mocked)

### Frontend Features
- ✅ Server-side rendering
- ✅ SEO optimization
- ✅ Responsive design
- ✅ Product listing and filtering
- ✅ Product detail pages
- ✅ Shopping cart (ready for implementation)
- ✅ Checkout flow (ready for implementation)
- ✅ User authentication pages

## 🚧 Future Enhancements

- [ ] Shopping cart implementation with Zustand
- [ ] Checkout flow with payment gateway integration
- [ ] User account dashboard
- [ ] Admin dashboard for product management
- [ ] Product search and advanced filtering
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Email notifications
- [ ] Order tracking
- [ ] Multi-language support
- [ ] Dark mode toggle

## 📝 Code Quality

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Clean architecture principles
- Modular code organization
- Comprehensive error handling

## 🔒 Security

- Password hashing with bcrypt
- JWT token authentication
- Input validation with class-validator
- SQL injection prevention (Prisma)
- CORS configuration
- Environment variable management

## 🚀 Deployment

### Oracle Cloud Deployment

This project is configured for deployment to Oracle Cloud Infrastructure (OCI) Always Free tier using Docker Compose.

**Quick Setup:**
1. Create Oracle VM instance (Always Free tier)
2. Install Docker and Docker Compose on VM
3. Clone repository and configure `.env` file
4. Deploy with `docker compose up -d --build`

**Features:**
- ✅ Production-ready Dockerfiles (multi-stage builds)
- ✅ Automated CI/CD from GitHub Actions
- ✅ Health check endpoints
- ✅ Database migrations on deploy
- ✅ Multiple environment configurations
- ✅ Local development flexibility
- ✅ Swagger API documentation

**Port Configuration:**
- Backend API: `3000`
- Swagger Docs: `3000/api/docs`
- Frontend: `3001`
- MinIO API: `9000`
- MinIO Console: `9001`

**Documentation:**
- [Oracle Cloud Deployment Guide](docs/ORACLE_CLOUD_DEPLOYMENT.md) - Complete deployment instructions
- [Deployment Quick Start](docs/DEPLOYMENT_QUICK_START.md) - 5-minute setup guide
- [Fully Local Development](docs/LOCAL_DEVELOPMENT.md) - Run everything locally
- [Environment Setups](docs/ENVIRONMENT_SETUPS.md) - All configuration scenarios

## 📄 License

This project is proprietary. All rights reserved.

## 🤝 Contributing

This is a commercial project. For questions or support, please contact the development team.

---

**Built with ❤️ for scalable e-commerce**

