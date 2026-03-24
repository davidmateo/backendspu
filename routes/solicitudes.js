import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    console.log("📦 Datos recibidos:", req.body);
    const { uid_firebase, nombre, correo, nuevo_uid } = req.body;

    if (!uid_firebase || !nombre || !correo || !nuevo_uid) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Verificar si ya hay una solicitud pendiente
    const { rows: pendientes } = await pool.query(
      `SELECT * FROM solicitudes_creador WHERE uid_firebase = $1 AND estado_id = 1`,
      [uid_firebase]
    );

    if (pendientes.length > 0) {
      return res.status(400).json({ error: "Ya tienes una solicitud pendiente" });
    }

    // Crear solicitud
    const { rows } = await pool.query(
      `INSERT INTO solicitudes_creador (uid_firebase, nombre, correo, nuevo_uid, estado_id)
       VALUES ($1, $2, $3, $4, 1)
       RETURNING *`,
      [uid_firebase, nombre, correo, nuevo_uid]
    );

    res.status(201).json({
      mensaje: "Solicitud enviada correctamente.",
      solicitud: rows[0]
    });
  } catch (error) {
    console.error("❌ Error en solicitud:", error);
    res.status(500).json({ error: "Error interno al enviar solicitud" });
  }
});
/*
get all solicitudes cambio de rol
*/ 
router.get("/all", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, e.nombre AS estado
       FROM solicitudes_creador s
       LEFT JOIN estado e ON s.estado_id = e.id
       ORDER BY s.id DESC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Error al obtener solicitudes:", error);
    res.status(500).json({ error: "Error interno al obtener solicitudes" });
  }
});

export default router;
