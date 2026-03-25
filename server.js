// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./db.js"; // ✅ Conexión PostgreSQL centralizada
import firebaseAdmin from "./config/firebase.js"; // ✅ Firebase Admin SDK
import usuariosRoutes from "./routes/usuarios.js";
import rolesRoutes from "./routes/roles.js";
import solicitudesRoutes from "./routes/solicitudes.js";
import podcastRoutes from "./routes/podcast.js";
dotenv.config();

const app = express();

// ===============================
// 🔹 Configuración de CORS
// ===============================

 // origin: [
    //"http://localhost:4200",           // 🔹 Desarrollo local Angular
    //"https://soundpodcastudec.web.app" // 🔹 Producción en Firebase Hosting
 // ],
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-uid"], // 🔥 AGREGA ESTE
  credentials: true,
}));

// ===============================
// 🔹 Middleware base
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Inyectar recursos globales
app.set("db", pool);
app.set("firebaseAdmin", firebaseAdmin);

// ===============================
// 🔹 Rutas principales
// ===============================
app.use("/usuarios", usuariosRoutes);
app.use("/roles", rolesRoutes);
app.use("/solicitudes", solicitudesRoutes);
app.use("/podcast", podcastRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API SoundPodcastUdeC funcionando correctamente...");
});

// ===============================
// 🔹 Middleware de autenticación
// ===============================
async function checkAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });

  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Error al verificar token:", err.message);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// ===============================
// 🔹 Endpoints de podcasts
// ===============================
app.get("/api/podcasts", checkAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM podcasts");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al obtener podcasts:", err.message);
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
    console.error("❌ Error al crear podcast:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/notificaciones', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vista_actividad ORDER BY fecha_hora DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al obtener notificaciones:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/notificaciones/marcar-leidas", async (req, res) => {
  try {
    // 🔹 Actualizar las solicitudes pendientes a "visto" o leído
    // Asegúrate de tener una columna tipo 'leido' o 'visto' en la tabla base
    const result = await pool.query(
      "DELETE FROM actividad_usuario WHERE leida = false"
    );

    res.json({ message: "Todas las notificaciones han sido marcadas como leídas" });
  } catch (error) {
    console.error("❌ Error marcando notificaciones como leídas:", error);
    res.status(500).json({ error: error.message });
  }
});
// ===============================
// 🔹 Servidor en marcha
// ===============================
const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`✅ Servidor corriendo en http://0.0.0.0:${PORT}`);
});
