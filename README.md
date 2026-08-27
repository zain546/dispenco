# Dispenco Pharmacy Management Software

Dispenco is a modern, premium multi-tenant SaaS for pharmacy and inventory management, built with NestJS, Next.js, and PostgreSQL.

## Development Environment Setup

We use Docker Compose to run the local development services (Postgres, Redis, Meilisearch).

### Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop/) installed and running.
- [pnpm](https://pnpm.io/) installed globally.

### Running Infrastructure Stack

Start the database, queue, and search containers:
```bash
docker compose up -d
```

Stop the running containers:
```bash
docker compose down
```

Check the status of the containers:
```bash
docker compose ps
```

### Credentials & Ports

| Service | Port | Default Credentials |
| :--- | :--- | :--- |
| **PostgreSQL 16** | `5432` | User: `dispenco_user`, Pass: `dispenco_password`, DB: `dispenco_db` |
| **Redis 7** | `6379` | (No password) |
| **Meilisearch** | `7700` | Master Key: `dispenco_master_key_must_be_at_least_16_bytes` |

---

## Running Applications

Initialize packages and run development servers:

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run dev servers (Turbo)**:
   ```bash
   pnpm dev
   ```

   - **Backend API**: `http://localhost:4000/api/v1`
   - **Frontend App**: `http://localhost:3000`
