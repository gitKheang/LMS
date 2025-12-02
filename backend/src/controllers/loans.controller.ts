import { Request, Response } from "express";
import { Filter } from "mongodb";
import { database } from "../config/database";
import { AuthRequest } from "../middleware/auth";

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

const enrichLoansWithStatus = (loans: any[]): any[] => {
  const now = new Date();
  return loans.map((loan) => {
    if (loan.returnDate) {
      return loan;
    }
    if (new Date(loan.dueDate) < now) {
      loan.status = "OVERDUE";
    } else {
      loan.status = "BORROWED";
    }
    return loan;
  });
};

export const getLoansForUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    // Authorization check: users can only view their own loans unless admin/staff
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const isOwnLoans = req.user.userId === userId;
    const isAdminOrStaff =
      req.user.role === "ADMIN" || req.user.role === "STAFF";

    if (!isOwnLoans && !isAdminOrStaff) {
      res.status(403).json({ message: "You can only view your own loans" });
      return;
    }

    const db = database.getDb();
    const loans = db.collection("loans");

    const results = await loans
      .aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: "books",
            localField: "bookId",
            foreignField: "_id",
            as: "book",
          },
        },
        {
          $lookup: {
            from: "bookCopies",
            localField: "copyId",
            foreignField: "_id",
            as: "copy",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$book" },
        { $unwind: "$copy" },
        { $unwind: "$user" },
        { $project: { "user.passwordHash": 0 } },
      ])
      .toArray();

    res.json(enrichLoansWithStatus(results));
  } catch (error: any) {
    console.error("Get loans for user error:", error);
    res
      .status(500)
      .json({ message: "Failed to get loans", error: error.message });
  }
};

export const getAdminLoans = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const db = database.getDb();
    const loans = db.collection("loans");

    const results = await loans
      .aggregate([
        {
          $lookup: {
            from: "books",
            localField: "bookId",
            foreignField: "_id",
            as: "book",
          },
        },
        {
          $lookup: {
            from: "bookCopies",
            localField: "copyId",
            foreignField: "_id",
            as: "copy",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$book" },
        { $unwind: "$copy" },
        { $unwind: "$user" },
        { $project: { "user.passwordHash": 0 } },
      ])
      .toArray();

    res.json(enrichLoansWithStatus(results));
  } catch (error: any) {
    console.error("Get admin loans error:", error);
    res
      .status(500)
      .json({ message: "Failed to get loans", error: error.message });
  }
};

export const createLoan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, bookId, dueDate } = req.body;
    const db = database.getDb();
    const copies = db.collection("bookCopies");
    const loans = db.collection("loans");
    const books = db.collection("books");
    const notifications = db.collection("notifications");

    // Find and update available copy
    const availableCopy = await copies.findOneAndUpdate(
      { bookId, status: "AVAILABLE" },
      {
        $set: {
          status: "BORROWED",
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" }
    );

    if (!availableCopy) {
      res.status(400).json({ message: "No copies available for this book" });
      return;
    }

    // Get book details for notification
    const book = await books.findOne({ _id: bookId } as any);

    // Create loan
    const now = new Date();
    const newLoan = {
      _id: generateId(),
      userId,
      bookId,
      copyId: availableCopy._id,
      borrowDate: now.toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      returnDate: null,
      status: "BORROWED",
      reminderSent: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await loans.insertOne(newLoan as any);

    // Create notification for the user about the new loan
    if (book) {
      const notification = {
        _id: generateId(),
        userId: userId,
        loanId: newLoan._id,
        bookId: bookId,
        type: "LOAN_CREATED",
        title: "Book Borrowed Successfully",
        message: `You have borrowed "${book.title}" by ${book.author}. Please return it by ${new Date(dueDate).toLocaleDateString()}.`,
        bookTitle: book.title,
        bookAuthor: book.author,
        dueDate: new Date(dueDate).toISOString(),
        isRead: false,
        createdAt: now.toISOString(),
      };
      await notifications.insertOne(notification as any);
    }

    // Fetch with relations
    const enriched = await loans
      .aggregate([
        { $match: { _id: newLoan._id } },
        {
          $lookup: {
            from: "books",
            localField: "bookId",
            foreignField: "_id",
            as: "book",
          },
        },
        {
          $lookup: {
            from: "bookCopies",
            localField: "copyId",
            foreignField: "_id",
            as: "copy",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$book" },
        { $unwind: "$copy" },
        { $unwind: "$user" },
        { $project: { "user.passwordHash": 0 } },
      ])
      .toArray();

    res.status(201).json(enriched[0]);
  } catch (error: any) {
    console.error("Create loan error:", error);
    res
      .status(500)
      .json({ message: "Failed to create loan", error: error.message });
  }
};

export const returnLoan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const db = database.getDb();
    const loans = db.collection("loans");
    const copies = db.collection("bookCopies");

    const loan = await loans.findOne({ _id: id } as Filter<any>);
    if (!loan) {
      res.status(404).json({ message: "Loan not found" });
      return;
    }

    if (loan.returnDate !== null) {
      res.status(400).json({ message: "Loan already returned" });
      return;
    }

    // Update loan
    await loans.updateOne({ _id: id } as Filter<any>, {
      $set: {
        returnDate: new Date().toISOString(),
        status: "RETURNED",
        updatedAt: new Date().toISOString(),
      },
    });

    // Update copy status
    await copies.updateOne(
      { _id: loan.copyId },
      {
        $set: {
          status: "AVAILABLE",
          updatedAt: new Date().toISOString(),
        },
      }
    );

    res.status(204).send();
  } catch (error: any) {
    console.error("Return loan error:", error);
    res
      .status(500)
      .json({ message: "Failed to return loan", error: error.message });
  }
};

export const sendOverdueReminder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const db = database.getDb();
    const loans = db.collection("loans");
    const users = db.collection("users");
    const books = db.collection("books");
    const notifications = db.collection("notifications");

    const loan = await loans.findOne({ _id: id } as Filter<any>);
    if (!loan) {
      res.status(404).json({ message: "Loan not found" });
      return;
    }

    const isOverdue =
      loan.returnDate === null && new Date(loan.dueDate) < new Date();

    if (!isOverdue) {
      res
        .status(400)
        .json({ message: "Only overdue loans can receive reminders" });
      return;
    }

    // Get user and book details for the notification
    const user = await users.findOne({ _id: loan.userId } as Filter<any>);
    const book = await books.findOne({ _id: loan.bookId } as Filter<any>);

    if (!user || !book) {
      res.status(404).json({ message: "User or book not found" });
      return;
    }

    // Create in-app notification for the user
    const notification = {
      _id: generateId(),
      userId: loan.userId,
      loanId: loan._id,
      bookId: loan.bookId,
      type: "OVERDUE_REMINDER",
      title: "Book Return Reminder",
      message: `Please return "${book.title}" by ${
        book.author
      }. This book was due on ${new Date(
        loan.dueDate
      ).toLocaleDateString()}. Please return it to the library as soon as possible.`,
      bookTitle: book.title,
      bookAuthor: book.author,
      dueDate: loan.dueDate,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    await notifications.insertOne(notification as any);

    // Increment reminder count (allow multiple reminders)
    const currentCount = loan.reminderCount || 0;
    await loans.updateOne({ _id: id } as Filter<any>, {
      $set: {
        reminderSent: true,
        reminderCount: currentCount + 1,
        lastReminderAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Send reminder error:", error);
    res
      .status(500)
      .json({ message: "Failed to send reminder", error: error.message });
  }
};

export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const db = database.getDb();
    const books = db.collection("books");
    const users = db.collection("users");
    const loans = db.collection("loans");

    const [activeBooks, totalUsers, allLoans] = await Promise.all([
      books.countDocuments({ isActive: true }),
      users.countDocuments({}),
      loans.find({}).toArray(),
    ]);

    const now = new Date();
    let activeLoans = 0;
    let overdueLoans = 0;

    for (const loan of allLoans) {
      if (loan.returnDate === null) {
        if (new Date(loan.dueDate) < now) {
          overdueLoans++;
        } else {
          activeLoans++;
        }
      }
    }

    // Get recent loans
    const recentLoansData = await loans
      .aggregate([
        { $sort: { borrowDate: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "books",
            localField: "bookId",
            foreignField: "_id",
            as: "book",
          },
        },
        {
          $lookup: {
            from: "bookCopies",
            localField: "copyId",
            foreignField: "_id",
            as: "copy",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$book" },
        { $unwind: "$copy" },
        { $unwind: "$user" },
        { $project: { "user.passwordHash": 0 } },
      ])
      .toArray();

    res.json({
      activeBooks,
      totalUsers,
      activeLoans,
      overdueLoans,
      recentLoans: recentLoansData,
    });
  } catch (error: any) {
    console.error("Get dashboard stats error:", error);
    res
      .status(500)
      .json({ message: "Failed to get stats", error: error.message });
  }
};
