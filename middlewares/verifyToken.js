import admin from "../config/firebase.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token requerido" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);

    // 🔹 Normalizamos el usuario para que siempre tenga uid_firebase y email
    req.user = {
      uid_firebase: decoded.uid,  // Firebase usa "uid"
      email: decoded.email || null,
    };

    next();
  } catch (error) {
    console.error("❌ Error verificando token:", error);
    res.status(401).json({ error: "Token inválido" });
  }
};
