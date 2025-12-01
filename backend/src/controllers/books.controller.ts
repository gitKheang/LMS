import { Request, Response } from "express";
import { Filter } from "mongodb";
import { database } from "../config/database";

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

const generateCopyCode = (title: string, index: number): string => {
  const prefix = title
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  return `${prefix}-${String(index).padStart(3, "0")}`;
};

export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const db = database.getDb();
    const books = db.collection("books");

    const categories = await books
      .aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$category" } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    res.json(categories.map((doc) => doc._id));
  } catch (error: any) {
    console.error("Get categories error:", error);
    res
      .status(500)
      .json({ message: "Failed to get categories", error: error.message });
  }
};

export const getBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category } = req.query;
    const db = database.getDb();
    const books = db.collection("books");

    const matchCriteria: any = { isActive: true };

    if (search) {
      matchCriteria.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { ISBN: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "all") {
      matchCriteria.category = category;
    }

    const results = await books
      .aggregate([
        { $match: matchCriteria },
        {
          $lookup: {
            from: "bookCopies",
            localField: "_id",
            foreignField: "bookId",
            as: "copies",
          },
        },
        {
          $addFields: {
            totalCopies: { $size: "$copies" },
            availableCopies: {
              $size: {
                $filter: {
                  input: "$copies",
                  as: "copy",
                  cond: { $eq: ["$$copy.status", "AVAILABLE"] },
                },
              },
            },
          },
        },
        { $project: { copies: 0 } },
      ])
      .toArray();

    res.json(results);
  } catch (error: any) {
    console.error("Get books error:", error);
    res
      .status(500)
      .json({ message: "Failed to get books", error: error.message });
  }
};

export const getBookById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const db = database.getDb();
    const books = db.collection("books");

    const results = await books
      .aggregate([
        { $match: { _id: id } },
        {
          $lookup: {
            from: "bookCopies",
            localField: "_id",
            foreignField: "bookId",
            as: "copies",
          },
        },
        {
          $addFields: {
            totalCopies: { $size: "$copies" },
            availableCopies: {
              $size: {
                $filter: {
                  input: "$copies",
                  as: "copy",
                  cond: { $eq: ["$$copy.status", "AVAILABLE"] },
                },
              },
            },
          },
        },
        { $project: { copies: 0 } },
      ])
      .toArray();

    if (results.length === 0) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    res.json(results[0]);
  } catch (error: any) {
    console.error("Get book by ID error:", error);
    res
      .status(500)
      .json({ message: "Failed to get book", error: error.message });
  }
};

export const getAdminBooks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { search } = req.query;
    const db = database.getDb();
    const books = db.collection("books");

    const matchCriteria: any = {};

    if (search) {
      matchCriteria.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { ISBN: { $regex: search, $options: "i" } },
      ];
    }

    const results = await books
      .aggregate([
        { $match: matchCriteria },
        {
          $lookup: {
            from: "bookCopies",
            localField: "_id",
            foreignField: "bookId",
            as: "copies",
          },
        },
        {
          $addFields: {
            totalCopies: { $size: "$copies" },
            availableCopies: {
              $size: {
                $filter: {
                  input: "$copies",
                  as: "copy",
                  cond: { $eq: ["$$copy.status", "AVAILABLE"] },
                },
              },
            },
          },
        },
        { $project: { copies: 0 } },
      ])
      .toArray();

    res.json(results);
  } catch (error: any) {
    console.error("Get admin books error:", error);
    res
      .status(500)
      .json({ message: "Failed to get books", error: error.message });
  }
};

export const createBook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payload = req.body;
    const db = database.getDb();
    const books = db.collection("books");
    const copies = db.collection("bookCopies");

    const now = new Date();
    const bookId = generateId();

    const newBook = {
      _id: bookId,
      title: payload.title,
      author: payload.author,
      ISBN: payload.ISBN,
      description: payload.description,
      category: payload.category,
      publicationYear: payload.publicationYear,
      shelfLocation: payload.shelfLocation,
      isActive: true,
      imageUrl: payload.imageUrl?.trim() || undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await books.insertOne(newBook as any);

    // Create copies
    const copyDocs: any[] = [];
    for (let i = 0; i < payload.numberOfCopies; i++) {
      copyDocs.push({
        _id: generateId(),
        bookId: bookId,
        copyCode: generateCopyCode(payload.title, i + 1),
        status: "AVAILABLE",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    if (copyDocs.length > 0) {
      await copies.insertMany(copyDocs as any);
    }

    res.status(201).json({
      ...newBook,
      totalCopies: payload.numberOfCopies,
      availableCopies: payload.numberOfCopies,
    });
  } catch (error: any) {
    console.error("Create book error:", error);
    res
      .status(500)
      .json({ message: "Failed to create book", error: error.message });
  }
};

export const updateBook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const db = database.getDb();
    const books = db.collection("books");
    const copies = db.collection("bookCopies");

    const book = await books.findOne({ _id: id } as Filter<any>);
    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    // Update book details
    const { numberOfCopies, ...bookUpdates } = payload;
    const updateData: any = {
      ...bookUpdates,
      imageUrl: payload.imageUrl?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    await books.updateOne({ _id: id } as Filter<any>, { $set: updateData });

    // Handle copy count changes
    if (numberOfCopies !== undefined) {
      const existingCopies = await copies.find({ bookId: id }).toArray();
      const currentTotal = existingCopies.length;

      if (numberOfCopies > currentTotal) {
        const copiesToAdd = numberOfCopies - currentTotal;
        const newCopies: any[] = [];
        const now = new Date().toISOString();

        for (let i = 0; i < copiesToAdd; i++) {
          newCopies.push({
            _id: generateId(),
            bookId: id,
            copyCode: generateCopyCode(payload.title, currentTotal + i + 1),
            status: "AVAILABLE",
            createdAt: now,
            updatedAt: now,
          });
        }

        if (newCopies.length > 0) {
          await copies.insertMany(newCopies as any);
        }
      }
    }

    // Fetch updated book with availability
    const results = await books
      .aggregate([
        { $match: { _id: id } },
        {
          $lookup: {
            from: "bookCopies",
            localField: "_id",
            foreignField: "bookId",
            as: "copies",
          },
        },
        {
          $addFields: {
            totalCopies: { $size: "$copies" },
            availableCopies: {
              $size: {
                $filter: {
                  input: "$copies",
                  as: "copy",
                  cond: { $eq: ["$$copy.status", "AVAILABLE"] },
                },
              },
            },
          },
        },
        { $project: { copies: 0 } },
      ])
      .toArray();

    res.json(results[0]);
  } catch (error: any) {
    console.error("Update book error:", error);
    res
      .status(500)
      .json({ message: "Failed to update book", error: error.message });
  }
};

export const deleteBook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const db = database.getDb();
    const books = db.collection("books");
    const copies = db.collection("bookCopies");
    const loans = db.collection("loans");

    const result = await books.deleteOne({ _id: id } as Filter<any>);
    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    // Delete associated copies and loans
    await copies.deleteMany({ bookId: id });
    await loans.deleteMany({ bookId: id });

    res.status(204).send();
  } catch (error: any) {
    console.error("Delete book error:", error);
    res
      .status(500)
      .json({ message: "Failed to delete book", error: error.message });
  }
};

export const getAvailableBooksForLoans = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const db = database.getDb();
    const books = db.collection("books");

    const results = await books
      .aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "bookCopies",
            localField: "_id",
            foreignField: "bookId",
            as: "copies",
          },
        },
        {
          $addFields: {
            totalCopies: { $size: "$copies" },
            availableCopies: {
              $size: {
                $filter: {
                  input: "$copies",
                  as: "copy",
                  cond: { $eq: ["$$copy.status", "AVAILABLE"] },
                },
              },
            },
          },
        },
        { $match: { availableCopies: { $gt: 0 } } },
        { $project: { copies: 0 } },
      ])
      .toArray();

    res.json(results);
  } catch (error: any) {
    console.error("Get available books error:", error);
    res
      .status(500)
      .json({ message: "Failed to get available books", error: error.message });
  }
};
