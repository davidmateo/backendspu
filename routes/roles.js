import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// Listar todos los roles (sin token)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rol ORDER BY id_rol ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en GET /roles:", err);
    res.status(500).json({ error: "Error al obtener roles" });
  }
});

// Obtener rol por ID (requiere token)
router.get("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM rol WHERE id_rol = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Rol no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error en GET /roles/:id:", err);
    res.status(500).json({ error: "Error al obtener el rol" });
  }
});

// Crear, actualizar y eliminar roles requieren token
router.post("/", verifyToken, async (req, res) => {
  const { nombre_rol } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO rol (nombre_rol) VALUES ($1) RETURNING *",
      [nombre_rol]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error en POST /roles:", err);
    res.status(500).json({ error: "Error al crear rol" });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { nombre_rol } = req.body;
  try {
    const result = await pool.query(
      "UPDATE rol SET nombre_rol = $1 WHERE id_rol = $2 RETURNING *",
      [nombre_rol, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Rol no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error en PUT /roles/:id:", err);
    res.status(500).json({ error: "Error al actualizar rol" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM rol WHERE id_rol = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Rol no encontrado" });
    }
    res.json({ message: "Rol eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error en DELETE /roles/:id:", err);
    res.status(500).json({ error: "Error al eliminar rol" });
  }
});

export default router;
