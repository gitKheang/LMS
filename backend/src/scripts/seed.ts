import bcrypt from "bcryptjs";
import { database } from "../config/database";
import dotenv from "dotenv";

dotenv.config();

// Default admin credentials - change these after first login
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@library.edu";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_NAME = process.env.ADMIN_NAME || "Library Admin";

const users = [
  {
    _id: "1",
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    passwordHash: ADMIN_PASSWORD, // Will be hashed
    role: "ADMIN",
    status: "ACTIVE",
    needsPasswordReset: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const books: any[] = [];

const bookCopies: any[] = [];

const loans: any[] = [];

async function seedDatabase() {
  try {
    console.log("========================================");
    console.log("Backend Database Seeding");
    console.log("========================================\n");

    // Connect to database
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const dbName = process.env.DATABASE_NAME || "library";

    await database.connect(mongoUri, dbName);
    const db = database.getDb();

    console.log("Clearing existing data...");
    await db.collection("users").deleteMany({});
    await db.collection("books").deleteMany({});
    await db.collection("bookCopies").deleteMany({});
    await db.collection("loans").deleteMany({});
    console.log("✓ Existing data cleared\n");

    // Hash passwords for users
    console.log("Hashing user passwords...");
    const usersToInsert = await Promise.all(
      users.map(async (user) => ({
        ...user,
        passwordHash: await bcrypt.hash(user.passwordHash, 10),
      }))
    );
    console.log("✓ Passwords hashed\n");

    // Insert data
    console.log("Inserting users...");
    await db.collection("users").insertMany(usersToInsert as any);
    console.log(`✓ Inserted ${usersToInsert.length} users\n`);

    console.log("Inserting books...");
    if (books.length > 0) {
      await db.collection("books").insertMany(books as any);
    }
    console.log(`✓ Inserted ${books.length} books\n`);

    console.log("Inserting book copies...");
    if (bookCopies.length > 0) {
      await db.collection("bookCopies").insertMany(bookCopies as any);
    }
    console.log(`✓ Inserted ${bookCopies.length} book copies\n`);

    console.log("Inserting loans...");
    if (loans.length > 0) {
      await db.collection("loans").insertMany(loans as any);
    }
    console.log(`✓ Inserted ${loans.length} loans\n`);

    // Create indexes
    console.log("Creating indexes...");
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db
      .collection("users")
      .createIndex({ studentId: 1 }, { sparse: true });
    await db.collection("users").createIndex({ role: 1 });
    await db.collection("books").createIndex({ ISBN: 1 }, { unique: true });
    await db.collection("books").createIndex({ category: 1 });
    await db.collection("books").createIndex({ isActive: 1 });
    await db.collection("bookCopies").createIndex({ bookId: 1 });
    await db
      .collection("bookCopies")
      .createIndex({ copyCode: 1 }, { unique: true });
    await db.collection("bookCopies").createIndex({ status: 1 });
    await db.collection("bookCopies").createIndex({ bookId: 1, status: 1 });
    await db.collection("loans").createIndex({ userId: 1 });
    await db.collection("loans").createIndex({ bookId: 1 });
    await db.collection("loans").createIndex({ status: 1 });
    await db.collection("loans").createIndex({ borrowDate: -1 });
    console.log("✓ Indexes created\n");

    console.log("========================================");
    console.log("Database seeding completed successfully!");
    console.log("========================================\n");
    console.log("Admin credentials:");
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log("  Password: (as configured in environment or 'admin123')\n");
    console.log("IMPORTANT: Change your password after first login!\n");

    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    await database.disconnect();
    process.exit(1);
  }
}

seedDatabase();
