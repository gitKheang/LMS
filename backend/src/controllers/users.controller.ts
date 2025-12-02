import { Request, Response } from "express";
import { Filter } from "mongodb";
import bcrypt from "bcryptjs";
import { database } from "../config/database";
import { AuthRequest } from "../middleware/auth";

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

export const getAdminUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const db = database.getDb();
    const users = db.collection("users");

    const results = await users
      .find({}, { projection: { passwordHash: 0 } })
      .toArray();

    res.json(results);
  } catch (error: any) {
    console.error("Get admin users error:", error);
    res
      .status(500)
      .json({ message: "Failed to get users", error: error.message });
  }
};

export const createStaffMember = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password } = req.body;
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

    const now = new Date();
    const newStaff = {
      _id: generateId(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "STAFF",
      status: "ACTIVE",
      needsPasswordReset: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await users.insertOne(newStaff as any);

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = newStaff;

    res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    console.error("Create staff member error:", error);
    res
      .status(500)
      .json({ message: "Failed to create staff member", error: error.message });
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    const db = database.getDb();
    const users = db.collection("users");
    const loans = db.collection("loans");
    const copies = db.collection("bookCopies");
    const notifications = db.collection("notifications");

    const targetUser = await users.findOne({ _id: id } as Filter<any>);
    if (!targetUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (String(targetUser._id) === requesterId) {
      res.status(400).json({ message: "You cannot delete your own account" });
      return;
    }

    if (targetUser.role === "ADMIN" && requesterRole !== "ADMIN") {
      res
        .status(403)
        .json({ message: "Only administrators can remove another admin" });
      return;
    }

    if (targetUser.role === "STAFF" && requesterRole !== "ADMIN") {
      res
        .status(403)
        .json({ message: "Only administrators can remove staff members" });
      return;
    }

    // Free any borrowed copies
    const userLoans = await loans
      .find({ userId: id, status: { $in: ["BORROWED", "OVERDUE"] } })
      .toArray();

    for (const loan of userLoans) {
      await copies.updateOne(
        { _id: loan.copyId },
        { $set: { status: "AVAILABLE", updatedAt: new Date().toISOString() } }
      );
    }

    // Delete user's loans
    await loans.deleteMany({ userId: id });

    // Delete notifications for this user (notifications they received)
    await notifications.deleteMany({ userId: id });

    // Delete notifications about this user (e.g., password reset requests)
    // These are notifications sent to admins that contain this user's email
    await notifications.deleteMany({
      type: "PASSWORD_RESET_REQUEST",
      message: { $regex: targetUser.email, $options: "i" },
    });

    // Delete user
    await users.deleteOne({ _id: id } as Filter<any>);

    res.status(204).send();
  } catch (error: any) {
    console.error("Delete user error:", error);
    res
      .status(500)
      .json({ message: "Failed to delete user", error: error.message });
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const db = database.getDb();
    const users = db.collection("users");
    const notifications = db.collection("notifications");

    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.role !== "USER") {
      res.status(400).json({
        message: "Only student accounts can request a reset through this form",
      });
      return;
    }

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          needsPasswordReset: true,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // Create notifications for all admins and staff
    const adminUsers = await users
      .find({ role: { $in: ["ADMIN", "STAFF"] } })
      .toArray();

    const now = new Date().toISOString();
    const notificationDocs = adminUsers.map((admin) => ({
      _id: generateId(),
      userId: admin._id,
      title: "Password Reset Request",
      message: `User ${user.name} (${user.email}) has requested a password reset.`,
      type: "PASSWORD_RESET_REQUEST",
      isRead: false,
      createdAt: now,
    }));

    if (notificationDocs.length > 0) {
      await notifications.insertMany(notificationDocs as any);
    }

    res.status(204).send();
  } catch (error: any) {
    console.error("Request password reset error:", error);
    res.status(500).json({
      message: "Failed to request password reset",
      error: error.message,
    });
  }
};

export const resetUserPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const db = database.getDb();
    const users = db.collection("users");

    const user = await users.findOne({ _id: id } as Filter<any>);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await users.updateOne({ _id: id } as Filter<any>, {
      $set: {
        passwordHash,
        needsPasswordReset: false,
        updatedAt: new Date().toISOString(),
      },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Reset user password error:", error);
    res
      .status(500)
      .json({ message: "Failed to reset password", error: error.message });
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Current password and new password are required" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: "New password must be at least 6 characters" });
      return;
    }

    const db = database.getDb();
    const users = db.collection("users");

    const user = await users.findOne({ _id: userId } as Filter<any>);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(400).json({ message: "Current password is incorrect" });
      return;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await users.updateOne({ _id: userId } as Filter<any>, {
      $set: {
        passwordHash,
        updatedAt: new Date().toISOString(),
      },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Change password error:", error);
    res
      .status(500)
      .json({ message: "Failed to change password", error: error.message });
  }
};
