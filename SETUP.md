# Project Setup & Authentication Guide

Follow these steps to set up the authentication system and local development environment for the Chadwick Q2C application.

## 1. Environment Configuration

1.  Create a `.env` file in the root directory. You can copy the template:
    ```bash
    cp .env.example .env
    ```
2.  **Required Variables**:
    - `DATABASE_URL`: Your PostgreSQL connection string.
    - `NEXTAUTH_SECRET`: A secure random string for signing JWT tokens. 
      - *Generate one using*: `openssl rand -base64 32`
    - `NEXTAUTH_URL`: Set to `http://localhost:3000` for local development.
3.  **Initial Admin credentials**:
    - `ADMIN_EMAIL`: The email for the first administrator account.
    - `ADMIN_PASSWORD`: The password for the first administrator account.

## 2. Database Initialization

Run the following commands to apply schema changes and generate the Prisma client:

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations to the database
npx prisma migrate dev --name init_auth
```

## 3. Seed Authentication Data

Create the default roles, permissions, and the initial Admin user defined in your `.env` file:

```bash
npm run db:seed:auth
```

> [!NOTE]
> The seed script will ONLY create the initial admin user if the `User` table is completely empty. It will not overwrite or duplicate existing users upon subsequent runs.

## 4. Run Development Server

Start the application:

```bash
npm run dev
```

## Troubleshooting

- **Redirect Loop / Too Many Redirects**: Ensure that you are using the latest `proxy.ts` file and that your `NEXTAUTH_URL` is set correctly in `.env`.
- **HTTP 431**: This is usually a side effect of a redirect loop. Fixing the loop will resolve this.
- **Server configuration error**: Check your terminal/server log for a red "❌ CRITICAL ERROR" message describing the missing environment variable.
- **Unauthorized (401/403)**: Ensure you have run `npm run db:seed:auth` to initialize your account and permissions.

## Public Quote Sharing
Shared quotes are accessible at `http://localhost:3000/shared-quote/[token]`. These links are publicly accessible (no login required) and read-only.
