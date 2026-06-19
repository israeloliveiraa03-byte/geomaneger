import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Informe nome, e-mail e senha" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "A senha precisa ter pelo menos 8 caracteres" });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount) {
    return res.status(409).json({ error: "E-mail já cadastrado" });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, plan",
    [email, hash, name]
  );

  const user = result.rows[0];
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
  res.status(201).json({ token, user });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Informe e-mail e senha" });
  }

  const result = await pool.query(
    "SELECT id, email, name, plan, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
  delete user.password_hash;
  res.json({ token, user });
});
