// middlewares/auth.js
import admin from "../config/firebase.js";
import pool from "../db.js";

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });

  try {
    // ✅ Verifica token en Firebase
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid, email } = decoded;

    // ✅ Busca o crea el usuario en la DB
    let { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE uid_firebase = $1",
      [uid]
    );

    if (rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO usuarios (uid_firebase, email) VALUES ($1, $2) RETURNING *`,
        [uid, email || null]
      );
      rows = insert.rows;
    }

    req.user = rows[0];
    next();
  } catch (error) {
    console.error("❌ Error verificando token:", error);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

