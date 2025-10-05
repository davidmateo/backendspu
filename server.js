// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Pool } from "pg";
import admin from "firebase-admin";

import usuariosRoutes from "./routes/usuarios.js";
import rolesRoutes from "./routes/roles.js";
import pool from "./db.js";              // 🔹 Conexión PostgreSQL
import firebaseAdmin from "./config/firebase.js"; // 🔹 Firebase

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    "http://localhost:4200",           // 🔹 Angular local
    "https://soundpodcastudec.web.app" // 🔹 Deploy Firebase Hosting
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// Hacemos que pool y admin estén disponibles en las rutas
app.set("db", pool);
app.set("firebaseAdmin", firebaseAdmin);

// ===============================
// 🔹 Rutas
// ===============================
app.use("/usuarios", usuariosRoutes);
app.use("/roles", rolesRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API SoundPodcastUdeC funcionando...");
});

// Middleware de autenticación con Firebase
async function checkAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });

  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// 🔹 Rutas de podcasts
app.get("/api/podcasts", checkAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM podcasts");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/podcasts", checkAuth, async (req, res) => {
  const { titulo, descripcion, url } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO podcasts (titulo, descripcion, url) VALUES ($1, $2, $3) RETURNING *",
      [titulo, descripcion, url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 🔹 Iniciar servidor
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
