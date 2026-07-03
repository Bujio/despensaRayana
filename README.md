# Despensa Rayana

REST API for a local-products online store from the comarca of Valencia de Alcántara.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Authentication & Roles](#authentication--roles)
- [Response Formats](#response-formats)
- [Security](#security)
- [Scripts](#scripts)
- [Author](#author)

## Features

- JWT authentication with access + refresh token rotation and reuse-attack detection.
- Role-based access control (`user`, `supplier`, `admin`).
- Email verification flow on registration with resend support (24 h token TTL).
- Product catalogue with categories, pagination, full-text search, price range and stock filters.
- Per-user shopping cart with atomic SKU-based operations.
- Order workflow with a strict state machine and atomic stock decrement (no negative stock under concurrent orders).
- Image upload to Cloudinary (up to 5 per product).
- Supplier onboarding, admin review workflow, supplier-owned product management and supplier-only reports.
- Transactional emails on registration, order creation and status changes.
- OpenAPI (Swagger UI) docs served at `/api/docs`.
- Integration test suite (Jest + mongodb-memory-server + supertest).
- Fail-fast startup: required env vars are validated before the server boots.
- Graceful shutdown on `SIGTERM` / `SIGINT`.

## Tech Stack

- **Runtime**: Node.js with ES Modules (`"type": "module"`)
- **Framework**: Express 5
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + bcryptjs
- **Validation**: Zod v4
- **Image upload**: Cloudinary + Multer
- **Emails**: Nodemailer (SMTP)
- **Security**: Helmet, CORS, express-rate-limit
- **Code quality**: ESLint, Prettier, Husky, lint-staged, commitlint

## Project Structure

```
despensa-rayana/
├── index.js                          # Entry point (env validation, DB, graceful shutdown)
├── app.js                            # Express app (middleware, routing, error handler)
├── .env.example                      # Environment variables reference
├── tests/                            # Integration tests (Jest + mongodb-memory-server)
│   ├── auth.test.js
│   ├── products.test.js
│   ├── cart.test.js
│   ├── orders.test.js
│   └── helpers/setup.js              # In-memory DB lifecycle + test helpers
└── src/
    ├── db/
    │   ├── init.js                   # MongoDB connection
│   └── models/
│       ├── user.model.js
│       ├── supplier.model.js
│       ├── product.model.js
    │       ├── order.model.js        # Includes VALID_TRANSITIONS state machine
    │       ├── cart.model.js
    │       ├── category.model.js
    │       └── refresh-token.model.js
    ├── controllers/                  # HTTP layer (req/res)
    ├── services/                     # Business logic and DB access
│   ├── auth.js                   # register / login / refresh / logout / email verify
│   ├── users.js
│   ├── suppliers.js               # supplier onboarding and review
│   ├── supplier-reports.js         # supplier-only sales/orders/product reports
│   ├── products.js
    │   ├── orders.js                 # Atomic stock decrement + rollback
    │   ├── cart.js
    │   ├── categories.js
    │   └── email.js                  # Nodemailer transactional emails
    ├── routes/
    │   ├── index.js                  # Central router mounted at /api
    │   ├── auth.routes.js
    │   ├── users.routes.js
    │   ├── products.routes.js
    │   ├── suppliers.routes.js
    │   ├── supplier.routes.js
    │   ├── orders.routes.js
    │   ├── cart.routes.js
    │   └── categories.routes.js
    ├── middlewares/
    │   ├── auth.middleware.js        # JWT verification
    │   ├── role.middleware.js        # Role-based access control
    │   ├── validate.middleware.js    # Zod body validation
    │   ├── objectid.middleware.js    # Validates :id params as ObjectId
    │   ├── upload.middleware.js      # Cloudinary/Multer upload
    │   └── ratelimit.middleware.js   # writeLimiter (30 req / 15 min per IP)
    ├── schemas/                      # Zod validation schemas
    ├── docs/                         # OpenAPI / Swagger definitions
    └── utils/
        ├── env.js                    # Fail-fast env var validation
        ├── http-error.js             # HttpError helper
        ├── tokens.js                 # generateRandomToken / hashToken
        ├── logger.js
        └── pagination.js
```

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url>
cd despensa-rayana

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your credentials in .env

# 4. Start in development mode (node --watch)
npm run dev
```

The server will not start if any required environment variable is missing — it will exit with a clear message listing the missing keys.

## Environment Variables

Copy `.env.example` to `.env` and fill in each value. Variables marked **required** are validated on startup.

| Variable                | Required | Description                                                                                              |
| ----------------------- | :------: | -------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              |          | `development` or `production` (affects morgan format)                                                    |
| `PORT`                  |          | Server port (default: `3000`)                                                                            |
| `HOST`                  |          | Server host (default: `localhost`)                                                                       |
| `CORS_ORIGIN`           |          | Allowed frontend origin (e.g. `http://localhost:5173`). If unset, CORS blocks all cross-origin requests. |
| `MONGODB_URI2`          |    ✅    | MongoDB connection URI                                                                                   |
| `JWT_SECRET`            |    ✅    | Secret used to sign JWT tokens                                                                           |
| `EMAIL_HOST`            |    ✅    | SMTP host (Mailtrap, SendGrid, Resend…)                                                                  |
| `EMAIL_PORT`            |    ✅    | SMTP port (`587` or `465`)                                                                               |
| `EMAIL_USER`            |    ✅    | SMTP username                                                                                            |
| `EMAIL_PASS`            |    ✅    | SMTP password or API key                                                                                 |
| `EMAIL_FROM`            |    ✅    | Sender email address                                                                                     |
| `CLOUDINARY_CLOUD_NAME` |    ✅    | Cloudinary cloud name                                                                                    |
| `CLOUDINARY_API_KEY`    |    ✅    | Cloudinary API key                                                                                       |
| `CLOUDINARY_API_SECRET` |    ✅    | Cloudinary API secret                                                                                    |

### Recommended SMTP providers

| Provider | Host                       | Port | Environment |
| -------- | -------------------------- | ---- | ----------- |
| Mailtrap | `sandbox.smtp.mailtrap.io` | 587  | Development |
| SendGrid | `smtp.sendgrid.net`        | 587  | Production  |
| Resend   | `smtp.resend.com`          | 465  | Production  |

## API Reference

All routes are prefixed with `/api`.

### Authentication — `/api/auth`

| Method | Route                  | Description                                   | Access | Rate limit      |
| ------ | ---------------------- | --------------------------------------------- | ------ | --------------- |
| POST   | `/register`            | Create an account and send verification email | Public | 5/hour per IP   |
| POST   | `/login`               | Sign in — returns access + refresh token      | Public | 10/15min per IP |
| POST   | `/refresh`             | Rotate refresh token, issue new pair          | Public |                 |
| POST   | `/logout`              | Revoke a refresh token (single-device logout) | Public |                 |
| GET    | `/verify/:token`       | Confirm email from the verification link      | Public |                 |
| POST   | `/resend-verification` | Re-send the verification email                | Public | 3/hour per IP   |

**Register body:**

```json
{
    "name": "María García",
    "email": "maria@example.com",
    "password": "Password1",
    "phone": "612345678",
    "address": {
        "country": "España",
        "street": "Calle Mayor 1",
        "codePostal": "10900"
    }
}
```

Password must be at least 6 characters and include at least one uppercase letter and one digit.

**Login body:**

```json
{ "email": "maria@example.com", "password": "Password1" }
```

**Login response:**

```json
{
    "accessToken": "<jwt>",
    "refreshToken": "<opaque-token>",
    "user": {
        "id": "...",
        "name": "María García",
        "email": "maria@example.com",
        "role": "user"
    }
}
```

The access token expires in **15 minutes**. Use `POST /refresh` with the refresh token (valid for **7 days**) to get a new pair silently. Each refresh rotates the token — reusing a revoked refresh token triggers a reuse-attack response that immediately revokes all active sessions for that user.

---

### Supplier onboarding and review

Suppliers are first-class users with role `supplier`. A supplier registration creates:

- a `User` with role `supplier`
- a `Supplier` profile linked by `userId`
- a unique 6-character `supplierCode`
- initial supplier status `pending_review`

Supplier statuses:

| Status           | Meaning                                                 |
| ---------------- | ------------------------------------------------------- |
| `draft`          | Profile not ready                                       |
| `pending_review` | Waiting for admin review; supplier can prepare products |
| `active`         | Approved supplier                                       |
| `inactive`       | Temporarily disabled; cannot create products            |
| `rejected`       | Rejected supplier; cannot create products               |

Supplier profile fields include business identity, origin, contact, fiscal data, logo, main image, gallery and certifications. Suppliers cannot edit `supplierCode`, `status`, `featured`, `internalNotes`, `reviewedAt`, `reviewedBy` or `rejectionReason`.

| Method | Route                           | Description                              | Access   |
| ------ | ------------------------------- | ---------------------------------------- | -------- |
| POST   | `/suppliers/register`           | Register supplier request                | Public   |
| GET    | `/suppliers/me`                 | Read own supplier profile                | Supplier |
| PATCH  | `/suppliers/me`                 | Update allowed own supplier profile data | Supplier |
| POST   | `/suppliers/me/logo`            | Upload supplier logo                     | Supplier |
| POST   | `/suppliers/me/images`          | Upload supplier gallery images           | Supplier |
| GET    | `/suppliers`                    | List suppliers                           | Admin    |
| GET    | `/suppliers/:id`                | Supplier detail with products            | Admin    |
| PATCH  | `/suppliers/:id/approve`        | Approve supplier                         | Admin    |
| PATCH  | `/suppliers/:id/reject`         | Reject supplier                          | Admin    |
| PATCH  | `/suppliers/:id/deactivate`     | Deactivate supplier                      | Admin    |
| PATCH  | `/suppliers/:id/reactivate`     | Reactivate supplier                      | Admin    |
| PATCH  | `/suppliers/:id/featured`       | Mark supplier as featured                | Admin    |
| PATCH  | `/suppliers/:id/internal-notes` | Save internal admin notes                | Admin    |

### Supplier products and reports

Suppliers can only manage products linked to their own `supplierRef`. New supplier products can be `draft` or `pending_review`; suppliers cannot publish directly and cannot change `supplierRef`.

| Method | Route                           | Description                              | Access   |
| ------ | ------------------------------- | ---------------------------------------- | -------- |
| GET    | `/products/supplier/my`         | List own products                        | Supplier |
| POST   | `/products/supplier`            | Create own product                       | Supplier |
| PATCH  | `/products/supplier/:id`        | Update own product                       | Supplier |
| DELETE | `/products/supplier/:id`        | Soft-delete own product                  | Supplier |
| POST   | `/products/supplier/:id/images` | Upload images for own product            | Supplier |
| GET    | `/supplier/reports/sales`       | Supplier-only sales summary              | Supplier |
| GET    | `/supplier/reports/products`    | Supplier-only product performance report | Supplier |
| GET    | `/supplier/orders`              | Orders containing supplier products only | Supplier |

Supplier reports never expose global store revenue or other suppliers' sales. For mixed orders, only the supplier's own order lines are returned.

---

### Users — `/api/users`

| Method | Route  | Description    | Access            |
| ------ | ------ | -------------- | ----------------- |
| GET    | `/`    | List all users | Admin             |
| GET    | `/:id` | Get user       | Own user or admin |
| PATCH  | `/:id` | Update user    | Own user or admin |
| DELETE | `/:id` | Delete user    | Admin             |

---

### Products — `/api/products`

| Method | Route                  | Description                                                  | Access   | Rate limit |
| ------ | ---------------------- | ------------------------------------------------------------ | -------- | ---------- |
| GET    | `/`                    | List products (paginated)                                    | Public   |            |
| GET    | `/:id`                 | Get product                                                  | Public   |            |
| POST   | `/`                    | Create product                                               | Admin    | 30/15min   |
| PATCH  | `/:id`                 | Update product                                               | Admin    | 30/15min   |
| DELETE | `/:id`                 | Delete product                                               | Admin    | 30/15min   |
| POST   | `/:id/images`          | Upload images (`multipart/form-data`, field `images`, max 5) | Admin    | 30/15min   |
| GET    | `/supplier/my`         | List own supplier products                                   | Supplier | 30/15min   |
| POST   | `/supplier`            | Create own supplier product                                  | Supplier | 30/15min   |
| PATCH  | `/supplier/:id`        | Update own supplier product                                  | Supplier | 30/15min   |
| DELETE | `/supplier/:id`        | Delete own supplier product                                  | Supplier | 30/15min   |
| POST   | `/supplier/:id/images` | Upload images for own supplier product                       | Supplier | 30/15min   |

**Query params for listing:**

| Param        | Type     | Description                                                  |
| ------------ | -------- | ------------------------------------------------------------ |
| `page`       | number   | Page number (default: `1`)                                   |
| `limit`      | number   | Items per page (default: `10`, max: `100`)                   |
| `categoryId` | ObjectId | Filter by category                                           |
| `search`     | string   | Full-text search over name and description (uses text index) |
| `inStock`    | boolean  | `true` hides out-of-stock products (`stock = 0`)             |
| `minPrice`   | number   | Minimum price (inclusive)                                    |
| `maxPrice`   | number   | Maximum price (inclusive)                                    |
| `sort`       | string   | Field to sort by: `name`, `price`, `stock`, `createdAt`      |
| `order`      | string   | `asc` (default) or `desc`                                    |

**Create product body:**

```json
{
    "name": "Extra virgin olive oil",
    "sku": "AOV-001",
    "price": 12.5,
    "description": "Home harvest, cornicabra variety.",
    "stock": 100,
    "categoryId": "<category-id>",
    "supplier": {
        "id": 1,
        "name": "Cooperativa San Isidro"
    }
}
```

> SKUs are normalized to uppercase on create/update so lookups stay case-insensitive.

---

### Orders — `/api/orders`

| Method | Route            | Description                   | Access            | Rate limit |
| ------ | ---------------- | ----------------------------- | ----------------- | ---------- |
| GET    | `/`              | List all orders (paginated)   | Admin             |            |
| GET    | `/client/:email` | Orders for a customer         | Own user or admin |            |
| GET    | `/:id`           | Get order                     | Own user or admin |            |
| POST   | `/`              | Create order                  | Authenticated     | 30/15min   |
| PATCH  | `/:id`           | Update order                  | Authenticated     |            |
| PATCH  | `/:id/status`    | Update order status           | Admin             |            |
| DELETE | `/:id`           | Delete order (restores stock) | Admin             |            |

**Create order body:**

```json
{
    "email": "maria@example.com",
    "products": [
        { "sku": "AOV-001", "count": 2, "price": 12.5 },
        { "sku": "MIEL-RAW", "count": 1, "price": 8.0, "discount": 10 }
    ]
}
```

Creating an order atomically decrements stock for each line. If any SKU is out of stock, all prior decrements in the same request are rolled back and the call fails with `400`.

**Allowed status transitions:**

```
pending   → processing, cancelled
processing → shipped, cancelled
shipped    → delivered
delivered  → (terminal)
cancelled  → (terminal)
```

Status changes are validated in the service layer; invalid transitions return `400`. Customers receive an email when the order is created and when its status changes.

---

### Cart — `/api/cart`

All cart endpoints require authentication. Each user has exactly one cart (unique index on `userId`).

| Method | Route         | Description                  |
| ------ | ------------- | ---------------------------- |
| GET    | `/`           | Get the current user's cart  |
| POST   | `/items`      | Add an item to the cart      |
| PATCH  | `/items/:sku` | Update item quantity         |
| DELETE | `/items/:sku` | Remove an item from the cart |
| DELETE | `/`           | Clear the cart               |

**Add item body:**

```json
{ "sku": "AOV-001", "quantity": 2 }
```

**Update item body:**

```json
{ "quantity": 3 }
```

---

### Categories — `/api/categories`

| Method | Route  | Description     | Access | Rate limit |
| ------ | ------ | --------------- | ------ | ---------- |
| GET    | `/`    | List categories | Public |            |
| GET    | `/:id` | Get category    | Public |            |
| POST   | `/`    | Create category | Admin  | 30/15min   |
| PATCH  | `/:id` | Update category | Admin  | 30/15min   |
| DELETE | `/:id` | Delete category | Admin  | 30/15min   |

The `slug` field is auto-generated from `name` (accent normalization + kebab-case) on save.

## Authentication & Roles

Protected routes require the **access token** in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

The access token is issued by `POST /api/auth/login` and contains `{ id, role, email }` in its payload. It expires in **15 minutes** — use `POST /api/auth/refresh` to renew it silently using the companion refresh token (valid 7 days, stored server-side and rotated on each use).

| Role    | Description                                                     |
| ------- | --------------------------------------------------------------- |
| `user`  | Registered user. Can access their own orders, cart and profile. |
| `admin` | Full access: products, categories, all orders and all users.    |

New accounts are always created with role `user`. Promote a user to `admin` directly in the database.

## Response Formats

**Validation error (`400`):**

```json
{
    "errors": [
        { "field": "email", "message": "Invalid email format" },
        {
            "field": "password",
            "message": "Password must contain at least one uppercase letter"
        }
    ]
}
```

**Generic error (`4xx` / `5xx`):**

```json
{ "message": "Invalid credentials" }
```

Internal errors (`500`) always return `{ "message": "Internal server error" }` to avoid leaking implementation details.

**Paginated response:**

```json
{
    "data": [],
    "pagination": {
        "total": 48,
        "page": 2,
        "limit": 10,
        "totalPages": 5
    }
}
```

## Security

- **Helmet** sets secure HTTP headers on every response.
- **CORS** is locked to the origin in `CORS_ORIGIN`; unset means all cross-origin requests are blocked.
- **Rate limiting**:
    - `POST /auth/register` — 5 / hour per IP.
    - `POST /auth/login` — 10 / 15 min per IP (brute-force protection).
    - `POST /auth/resend-verification` — 3 / hour per IP (anti-spam).
    - All write endpoints on products and orders — 30 / 15 min per IP.
- **Password storage**: bcrypt hashes (`saltRounds = 10`); passwords are never returned in responses.
- **User enumeration**: login returns the same `401` whether the email exists or not.
- **ObjectId validation** runs before `:id` route handlers to prevent 500s from malformed IDs.
- **Refresh token rotation**: every use issues a new refresh token and invalidates the previous one. Presenting a revoked refresh token is treated as a reuse attack — all active sessions for the user are immediately revoked.
- **Email verification tokens**: stored as a SHA-256 hash in the database; the plain token is only sent by email and never persisted.
- **Atomic stock decrement** prevents overselling under concurrent orders and rolls back partial decrements if any SKU fails.
- **Soft deletes** on users and products: records are flagged with `deletedAt` and excluded from normal queries without losing referential integrity.
- **Fail-fast startup**: missing env vars abort boot with a clear message.
- **Graceful shutdown** closes the HTTP server and the Mongoose connection on `SIGTERM` / `SIGINT`, with a 10 s hard timeout.

## Scripts

```bash
npm run dev          # Start server with hot-reload (node --watch)
npm test             # Run the full integration test suite (Jest)
npm run test:watch   # Run tests in watch mode
npm run prepare      # Install Husky git hooks (runs automatically after npm install)
```

The test suite spins up an in-memory MongoDB instance via `mongodb-memory-server` and exercises real HTTP calls with `supertest` — no external services needed.

Commits are linted by commitlint (conventional commits) and staged files are formatted with Prettier and ESLint via lint-staged.

## Author

**Javier Vivas**
