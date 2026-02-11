<<<<<<< HEAD
# ExpenseBudgetManager

## セットアップ

1) pnpm i

2) pnpm db:up

3) pnpm db:migrate

4) pnpm db:seed

5) pnpm dev
=======
# ExpenseBudgetManager API

## Setup
1. Copy `.env.example` to `.env` and adjust if needed.
2. Start Postgres:
   ```sh
   docker-compose up -d
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Start API:
   ```sh
   npm run dev
   ```

## Health check
```sh
curl -i http://localhost:3000/health
```
>>>>>>> origin/vk/d44f-t2-01-api
