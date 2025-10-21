// db.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

// ✅ Crear solo una instancia del pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Manejo de errores de conexión
pool.on("error", (err) => {
  console.error("⚠️ Error inesperado en el pool:", err.message);
  console.log("♻️ Intentando reconectar...");
});

export default pool;
