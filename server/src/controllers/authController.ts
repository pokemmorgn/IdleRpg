import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Player from "../models/Player";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    // Vérifie si le joueur existe déjà
    const exists = await Player.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const hashedPw = await bcrypt.hash(password, 10);

    const player = await Player.create({
      username,
      email,
      password: hashedPw,
      level: 1,
      xp: 0,
      gold: 0
    });

    const token = jwt.sign(
      { playerId: player._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Account created",
      token,
      playerId: player._id
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const player = await Player.findOne({ username });
    if (!player) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, player.password);
    if (!valid) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { playerId: player._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      playerId: player._id
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
