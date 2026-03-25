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
 * 🔹 Login del administrador
 *   Solo permite iniciar sesión a usuarios EXISTENTES con id_rol = 1.
 *   No crea usuarios nuevos.
 */
/**
 * 🔹 Login del administrador
 *   Solo permite iniciar sesión a usuarios EXISTENTES con id_rol = 1.
 *   No crea usuarios nuevos.
 */
console.log("🧩 Montando ruta /login-admin");
console.log("🧩 Montando ruta /login-admin");

router.post("/login-admin", async (req, res) => {
  const { uid, nombre, email } = req.body;

  if (!uid || !nombre || !email) {
    return res
      .status(400)
      .json({ error: "Faltan campos obligatorios (uid, nombre, email)" });
  }

  try {
    // 🔍 Buscar el usuario en la base de datos
    const { rows } = await pool.query(
      "SELECT * FROM usuario WHERE uid = $1 AND email = $2",
      [uid, email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Usuario no encontrado en la base de datos.",
      });
    }

    const user = rows[0];

    // ⚠️ Normalizar nombres para evitar errores de mayúsculas/minúsculas
    const nombreBD = user.nombre.trim().toLowerCase();
    const nombreReq = nombre.trim().toLowerCase();

    if (nombreBD !== nombreReq) {
      return res.status(403).json({
        error: "El nombre ingresado no coincide con el registrado.",
      });
    }

    // 🚫 Verificar que el rol sea administrador
    if (user.id_rol !== 1) {
      // En lugar de bloquear completamente, podemos retornar info mínima para debug
      return res.status(403).json({
        error: "Acceso denegado. Solo los administradores pueden iniciar sesión.",
        usuario: {
          uid: user.uid,
          email: user.email,
          id_rol: user.id_rol,
          nombre: user.nombre,
        },
      });
    }

    // ✅ Login correcto
    res.status(200).json({
      message: "Login exitoso",
      usuario: user,
    });

  } catch (error) {
    console.error("❌ Error en /login-admin:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
/** 
 *login creador
**/
console.log("🧩 Montando ruta /login-creador");
router.post("/login-creador", async (req, res) => {
  const { uid, email } = req.body;

  if (!uid  || !email) {
    return res
      .status(400)
      .json({ error: "Faltan campos obligatorios (uid y  email)" });
  }

  try {
    // 🔍 Buscar el usuario en la base de datos (usa la tabla correcta)
    const { rows } = await pool.query(
      "SELECT * FROM usuario WHERE uid = $1 AND email = $2",
      [uid, email]
    );

    // ⚠️ Si no hay usuario o el nombre no coincide exactamente
    if (rows.length === 0 || rows[0].email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(404).json({
        error:
          "Usuario no encontrado o los datos ingresados no coinciden con ningún administrador.",
      });
    }

    const user = rows[0];

    // 🚫 Verificar que el rol sea administrador
    if (user.id_rol !== 4) {
      return res.status(403).json({
        error: "Acceso denegado. Solo los administradores pueden iniciar sesión.",
      });
    }

    // ✅ Login correcto
    res.status(200).json({
      message: "Login exitoso",
      usuario: user,
    });
  } catch (error) {
    console.error("❌ Error en /login-creador:", error);
    res.status(500).json({ error: "Error interno del servidor" });
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

    // 1️⃣ Insertar usuario en Neon (Postgres)
    const insert = await pool.query(
      `INSERT INTO usuario (uid, email, nombre, apellido, id_rol) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [uid, email, nombre, apellido || null, 3] // 3 = rol estudiante
    );

    const usuario = insert.rows[0];

    // 2️⃣ 🔔 Insertar actividad para notificaciones
    await pool.query(
      `INSERT INTO actividad_usuario (usuario_id, tipo_accion)
       VALUES ($1, $2)`,
      [uid, 'Se registró en la plataforma']
    );

    res.status(201).json({
      message: "Usuario registrado correctamente",
      usuario,
    });
  } catch (error) {
    console.error("❌ Error en /register:", error);
    res.status(500).json({ error: error.message });
  }
});
//estadisiticas de usuarios
router.get("/estadisticas", async (req, res) => {
  try {
    const uid = req.headers["x-admin-uid"];

    if (!uid) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const user = await pool.query(
      "SELECT id_rol FROM usuario WHERE uid = $1",
      [uid]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // 🔐 CONDICIONAL CLAVE
    if (user.rows[0].id_rol !== 1) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    // 📊 estadísticas
    const total = await pool.query(`SELECT COUNT(*) FROM usuario`);

    const nuevos = await pool.query(`
      SELECT COUNT(*) FROM usuario
      WHERE fecha_registro >= NOW() - INTERVAL '7 days'
    `);

    const porDia = await pool.query(`
      SELECT DATE(fecha_registro) AS fecha, COUNT(*) AS cantidad
      FROM usuario
      GROUP BY fecha
      ORDER BY fecha ASC
    `);

    const porRol = await pool.query(`
      SELECT r.nombre_rol AS rol, COUNT(u.uid) AS cantidad
      FROM usuario u
      JOIN rol r ON u.id_rol = r.id_rol
      GROUP BY r.nombre_rol
    `);

    res.json({
      total: parseInt(total.rows[0].count),
      nuevos: parseInt(nuevos.rows[0].count),
      porDia: porDia.rows,
      porRol: porRol.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en estadísticas" });
  }
});
// ===============================
// 🔹 CRUD USUARIOS (ADMIN)
// ===============================

// 🔸 Obtener todos
router.get("/admin/usuarios", async (req, res) => {
  try {
    const uid = req.headers["x-admin-uid"];

    if (!uid) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const user = await pool.query(
      "SELECT id_rol FROM usuario WHERE uid = $1",
      [uid]
    );

    if (user.rows.length === 0 || user.rows[0].id_rol !== 1) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const { rows } = await pool.query("SELECT * FROM usuario");
    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔸 Crear
router.post("/admin/usuarios", async (req, res) => {
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

    const { uid, email, nombre, apellido, id_rol } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO usuario (uid, email, nombre, apellido, id_rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uid, email, nombre, apellido || null, id_rol || 3]
    );

    res.status(201).json(rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔸 Actualizar
router.put("/admin/usuarios/:uid", async (req, res) => {
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

    const { nombre, apellido, email, id_rol } = req.body;

    const result = await pool.query(
      `UPDATE usuario 
       SET nombre=$1, apellido=$2, email=$3, id_rol=$4
       WHERE uid=$5
       RETURNING *`,
      [nombre, apellido, email, id_rol, req.params.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("❌ ERROR REAL UPDATE:", error); // 🔥 IMPORTANTE
    res.status(500).json({ error: error.message });
  }
});

// 🔸 Eliminar
router.delete("/admin/usuarios/:uid", async (req, res) => {
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

    const result = await pool.query(
      "DELETE FROM usuario WHERE uid = $1 RETURNING *",
      [req.params.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado", usuario: result.rows[0] });

  } catch (error) {
    console.error("❌ ERROR DELETE:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
