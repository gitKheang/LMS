import { Request, Response } from "express";
import { Filter } from "mongodb";
import { database } from "../config/database";
import { AuthRequest } from "../middleware/auth";

// Get notifications for current user
export const getUserNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const db = database.getDb();
    const notifications = db.collection("notifications");

    const results = await notifications
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(results);
  } catch (error: any) {
    console.error("Get notifications error:", error);
    res
      .status(500)
      .json({ message: "Failed to get notifications", error: error.message });
  }
};

// Get unread notification count
export const getUnreadCount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const db = database.getDb();
    const notifications = db.collection("notifications");

    const count = await notifications.countDocuments({
      userId: req.user.userId,
      isRead: false,
    });

    res.json({ count });
  } catch (error: any) {
    console.error("Get unread count error:", error);
    res
      .status(500)
      .json({ message: "Failed to get count", error: error.message });
  }
};

// Mark notification as read
export const markAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { id } = req.params;
    const db = database.getDb();
    const notifications = db.collection("notifications");

    await notifications.updateOne(
      { _id: id, userId: req.user.userId } as Filter<any>,
      { $set: { isRead: true } }
    );

    res.status(204).send();
  } catch (error: any) {
    console.error("Mark as read error:", error);
    res
      .status(500)
      .json({ message: "Failed to mark as read", error: error.message });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const db = database.getDb();
    const notifications = db.collection("notifications");

    await notifications.updateMany(
      { userId: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(204).send();
  } catch (error: any) {
    console.error("Mark all as read error:", error);
    res
      .status(500)
      .json({ message: "Failed to mark all as read", error: error.message });
  }
};

// Delete a notification
export const deleteNotification = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { id } = req.params;
    const db = database.getDb();
    const notifications = db.collection("notifications");

    await notifications.deleteOne({
      _id: id,
      userId: req.user.userId,
    } as Filter<any>);

    res.status(204).send();
  } catch (error: any) {
    console.error("Delete notification error:", error);
    res
      .status(500)
      .json({ message: "Failed to delete notification", error: error.message });
  }
};
