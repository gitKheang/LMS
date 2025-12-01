import { Collection, Db, Document } from "mongodb";

/**
 * Custom document interface that allows string _id
 * This project uses string IDs generated with Date.now().toString(36)
 */
export interface LibraryDocument extends Document {
  _id: string;
}

export interface UserDocument extends LibraryDocument {
  name: string;
  email: string;
  passwordHash: string;
  studentId?: string;
  role: "USER" | "STAFF" | "ADMIN";
  status: "ACTIVE" | "BLOCKED";
  needsPasswordReset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookDocument extends LibraryDocument {
  title: string;
  author: string;
  ISBN: string;
  description?: string;
  category: string;
  publicationYear?: number;
  shelfLocation?: string;
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookCopyDocument extends LibraryDocument {
  bookId: string;
  copyCode: string;
  status: "AVAILABLE" | "BORROWED" | "MAINTENANCE";
  createdAt: string;
  updatedAt: string;
}

export interface LoanDocument extends LibraryDocument {
  userId: string;
  bookId: string;
  copyId: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  status: "BORROWED" | "RETURNED" | "OVERDUE";
  reminderSent: boolean;
  reminderCount?: number;
  lastReminderAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Type helper for collections with string _id
 */
export type TypedCollection<T extends LibraryDocument> = Collection<T>;

/**
 * Get typed collections from database
 */
export const getCollections = (db: Db) => ({
  users: db.collection("users") as unknown as TypedCollection<UserDocument>,
  books: db.collection("books") as unknown as TypedCollection<BookDocument>,
  bookCopies: db.collection(
    "bookCopies"
  ) as unknown as TypedCollection<BookCopyDocument>,
  loans: db.collection("loans") as unknown as TypedCollection<LoanDocument>,
});
