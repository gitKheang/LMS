import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { database } from "../config/database";
import { generateToken } from "../utils/jwt";
import { AuthRequest } from "../middleware/auth";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, studentId } = req.body;

    const db = database.getDb();
    const users = db.collection("users");

    // Check if email exists
    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId =
      Date.now().toString(36) + Math.random().toString(36).substr(2);
    const now = new Date();

    const newUser = {
      _id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      studentId: studentId || undefined,
      role: "USER",
      status: "ACTIVE",
      needsPasswordReset: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await users.insertOne(newUser as any);

    // Generate JWT
    const token = generateToken({
      userId: newUser._id,
      email: newUser.email,
      role: newUser.role,
    });

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      token,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const db = database.getDb();
    const users = db.collection("users");

    // Find user
    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Check if blocked
    if (user.status === "BLOCKED") {
      res.status(403).json({ message: "Account is blocked" });
      return;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Generate JWT
    const token = generateToken({
      userId: user._id as unknown as string,
      email: user.email,
      role: user.role,
    });

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const db = database.getDb();
    const users = db.collection("users");

    const user = await users.findOne({ _id: req.user.userId } as any, {
      projection: { passwordHash: 0 },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error: any) {
    console.error("Get current user error:", error);
    res
      .status(500)
      .json({ message: "Failed to get user", error: error.message });
  }
};
