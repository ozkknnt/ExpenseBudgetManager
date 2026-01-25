const express = require("express");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).type("text/plain").send("ok");
  } catch (error) {
    console.error("health check failed:", error);
    res.status(500).type("text/plain").send("ng");
  }
});

app.listen(port, () => {
  console.log(`api server listening on port ${port}`);
});
