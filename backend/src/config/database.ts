import { MongoClient, Db, Collection, Document } from "mongodb";

/**
 * Document type with string _id (this project uses generated string IDs)
 */
export interface StringIdDocument extends Document {
  _id: string;
}

class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(uri: string, dbName: string): Promise<void> {
    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(dbName);
      console.log(`✓ Connected to MongoDB database: ${dbName}`);
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  /**
   * Get a typed collection that accepts string _id
   */
  getCollection<T extends StringIdDocument>(name: string): Collection<T> {
    return this.getDb().collection(name) as unknown as Collection<T>;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log("✓ Disconnected from MongoDB");
    }
  }
}

export const database = new Database();
