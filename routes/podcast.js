import { Router } from "express";
import pool from "../db.js";

const router = Router();


// ===============================
// 🔹 CREAR PODCAST
// ===============================
router.post("/", async (req, res) => {
  try {
    const { titulo, description, url_audio, uid, imagen } = req.body;

    if (!titulo || !url_audio || !uid || !imagen || !description) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const { rows } = await pool.query(
      `INSERT INTO podcast 
      (titulo, description, url_audio, uid, imagen, estado_id, fecha_subida)
      VALUES ($1, $2, $3, $4, $5, 1, NOW())
      RETURNING *`,
      [titulo, description, url_audio, uid, imagen]
    );

    res.status(201).json(rows[0]);

  } catch (error) {
    console.error("❌ Error creando podcast:", error);
    res.status(500).json({ error: error.message });
  }
});


// ===============================
// 🔹 VER TODOS (ADMIN)
// ===============================
router.get("/admin", async (req, res) => {
  try {
    const uidAdmin = req.headers["x-admin-uid"];

    if (!uidAdmin) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const admin = await pool.query(
      "SELECT id_rol FROM usuario WHERE uid = $1",
      [uidAdmin]
    );

    if (admin.rows.length === 0 || admin.rows[0].id_rol !== 1) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const { rows } = await pool.query(`
      SELECT p.*, e.nombre AS estado
      FROM podcast p
      LEFT JOIN estado e ON p.estado_id = e.id
      ORDER BY p.fecha_subida DESC
    `);

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo podcasts" });
  }
});


// ===============================
// 🔹 VER MIS PODCASTS
// ===============================
router.get("/mis-podcasts/:uid", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, e.nombre AS estado
       FROM podcast p
       LEFT JOIN estado e ON p.estado_id = e.id
       WHERE p.uid = $1
       ORDER BY p.fecha_subida DESC`,
      [req.params.uid]
    );

    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ===============================
// 🔹 APROBAR / DENEGAR (ADMIN)
// ===============================
router.put("/estado/:id", async (req, res) => {
  try {
    const uidAdmin = req.headers["x-admin-uid"];
    const { estado_id } = req.body;

    if (!uidAdmin) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (![2, 3].includes(estado_id)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    await pool.query(
      "UPDATE podcast SET estado_id = $1 WHERE id_podcast = $2",
      [estado_id, req.params.id]
    );

    res.json({ message: "Estado actualizado" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ===============================
// 🔹 EDITAR (SOLO SI ES DEL USUARIO Y PENDIENTE)
// ===============================
router.put("/:id", async (req, res) => {
  try {
    const { titulo, description, url_audio, imagen, uid } = req.body;

    const { rowCount } = await pool.query(
      `UPDATE podcast 
       SET titulo=$1, description=$2, url_audio=$3, imagen=$4
       WHERE id_podcast=$5 AND estado_id=1 AND uid=$6`,
      [titulo, description, url_audio, imagen, req.params.id, uid]
    );

    if (rowCount === 0) {
      return res.status(403).json({
        error: "No autorizado o el podcast no está pendiente"
      });
    }

    res.json({ message: "Podcast actualizado" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ===============================
// 🔹 ELIMINAR (SOLO SI ES DEL USUARIO)
// ===============================
router.delete("/:id", async (req, res) => {
  try {
    const { uid } = req.body;

    const result = await pool.query(
      `DELETE FROM podcast 
       WHERE id_podcast = $1 AND uid = $2`,
      [req.params.id, uid]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({
        error: "No autorizado o no existe"
      });
    }

    res.json({ message: "Podcast eliminado" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ===============================
// 🔹 VER APROBADOS (APP)
// ===============================
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM podcast
      WHERE estado_id = 2
      ORDER BY fecha_subida DESC
    `);

    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: "Error obteniendo podcasts" });
  }
});


export default router;