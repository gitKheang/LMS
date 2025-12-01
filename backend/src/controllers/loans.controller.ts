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
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
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

    await loans.updateOne({ _id: id } as Filter<any>, {
      $set: {
        reminderSent: true,
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
