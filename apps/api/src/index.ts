import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("ExpenseBudgetManager API is running."));

serve({
  fetch: app.fetch,
  port: 3001
});

console.log("API server listening on http://localhost:3001");
