import { Router } from "express";
import pool from "../db.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

/**
 * 🔹 Login / sincronización
 * El frontend envía el token en headers (Authorization: Bearer ...)
 * Si el usuario no existe en la DB -> se crea automáticamente (esto lo hace verifyToken)
 * Devuelve el usuario de la DB
 */
// 🔹 LOGIN -> valida token, si no existe el usuario en DB lo crea
router.post("/login", verifyToken, async (req, res) => {
  try {
    const { uid_firebase, email } = req.user; // viene del middleware verifyToken

    // Verificamos si ya existe en la base de datos
    let { rows } = await pool.query(
      "SELECT * FROM usuario WHERE uid = $1",
      [uid_firebase]
    );

    // Si no existe, lo creamos automáticamente
    if (rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO usuario (uid, email) VALUES ($1, $2) RETURNING *`,
        [uid_firebase, email]
      );
      rows = insert.rows;
    }

    res.json(rows[0]); // ✅ retornamos el usuario (nuevo o existente)
  } catch (error) {
    console.error("❌ Error en /login:", error);
    res.status(500).json({ error: "Error en login" });
  }
});

/**
 * 🔹 Actualizar perfil del usuario
 */
router.put("/me", verifyToken, async (req, res) => {
  try {
    const { nombre, apellidos, refresh_token } = req.body;

    const { rows } = await pool.query(
      `UPDATE usuario 
       SET nombre=$1, apellido=$2, refresh_token=$3 
       WHERE uid=$4 
       RETURNING *`,
      [
        nombre || null,
        apellidos || null,
        refresh_token || null,
        req.user.uid_firebase,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error en PUT /me:", error);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});
//register
router.post("/register", async (req, res) => {
  try {
    const { uid, email, nombre, apellido } = req.body;

    if (!uid || !email || !nombre) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Insertar usuario en Neon (Postgres)
    const insert = await pool.query(
      `INSERT INTO usuario (uid, email, nombre, apellido, id_rol) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [uid, email, nombre, apellido || null, 3] // 3 = rol estudiante por ejemplo
    );

    const usuario = insert.rows[0];

    res.status(201).json({
      message: "Usuario registrado correctamente",
      usuario,
    });
  } catch (error) {
    console.error("❌ Error en /register:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
