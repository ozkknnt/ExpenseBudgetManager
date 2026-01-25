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
