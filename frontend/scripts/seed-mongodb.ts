/**
 * MongoDB Data Seeding Script
 *
 * This script seeds the MongoDB Atlas database with initial data from mock-data.ts
 *
 * PREREQUISITES:
 * 1. MongoDB Atlas App Services must be configured
 * 2. Atlas Functions must be deployed (especially 'hashPassword')
 * 3. realm.config.ts must have the correct App ID
 * 4. An admin user must exist (create via Atlas UI first)
 *
 * USAGE:
 *   npx ts-node scripts/seed-mongodb.ts
 *
 * NOTE: This will DELETE all existing data before seeding!
 */

import * as Realm from 'realm-web';
import { REALM_CONFIG } from '../src/app/core/config/realm.config';
import { users, books, bookCopies, loans } from '../src/app/core/data/mock-data';

const DATABASE_NAME = REALM_CONFIG.database;

async function seedDatabase() {
  console.log('========================================');
  console.log('MongoDB Atlas Database Seeding Script');
  console.log('========================================\n');

  console.log(`Connecting to MongoDB Atlas App Services...`);
  console.log(`App ID: ${REALM_CONFIG.appId}\n`);

  if (REALM_CONFIG.appId === 'YOUR_ATLAS_APP_ID_HERE') {
    console.error('ERROR: Please update realm.config.ts with your actual Atlas App ID!');
    console.error('Get it from: Atlas Console > App Services > Your App > Copy App ID');
    process.exit(1);
  }

  const app = new Realm.App({ id: REALM_CONFIG.appId });

  // Authenticate
  console.log('Authenticating...');
  console.log('IMPORTANT: You must have created an admin user in Atlas UI first!');
  console.log('Using default credentials: admin@library.edu / admin123\n');

  try {
    const credentials = Realm.Credentials.emailPassword('admin@library.edu', 'admin123');
    const user = await app.logIn(credentials);
    console.log('✓ Authentication successful!\n');

    const mongodb = user.mongoClient('mongodb-atlas');
    const db = mongodb.db(DATABASE_NAME);

    // Clear existing data
    console.log('Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('books').deleteMany({});
    await db.collection('bookCopies').deleteMany({});
    await db.collection('loans').deleteMany({});
    console.log('✓ Existing data cleared\n');

    // Seed users (hash passwords first)
    console.log('Seeding users...');
    const usersToInsert = [];

    for (const mockUser of users) {
      try {
        // Use Atlas Function to hash password
        const hashedPassword = await user.functions.hashPassword(mockUser.passwordHash);
        usersToInsert.push({
          ...mockUser,
          passwordHash: hashedPassword,
        });
      } catch (error: any) {
        console.error(`Failed to hash password for ${mockUser.email}:`, error.message);
        throw error;
      }
    }

    await db.collection('users').insertMany(usersToInsert);
    console.log(`✓ Inserted ${usersToInsert.length} users\n`);

    // Seed books
    console.log('Seeding books...');
    await db.collection('books').insertMany(books);
    console.log(`✓ Inserted ${books.length} books\n`);

    // Seed book copies
    console.log('Seeding book copies...');
    await db.collection('bookCopies').insertMany(bookCopies);
    console.log(`✓ Inserted ${bookCopies.length} book copies\n`);

    // Seed loans
    console.log('Seeding loans...');
    await db.collection('loans').insertMany(loans);
    console.log(`✓ Inserted ${loans.length} loans\n`);

    // Create indexes
    console.log('Creating indexes for optimal performance...');

    // Users indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ studentId: 1 }, { sparse: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ status: 1 });
    console.log('✓ Users indexes created');

    // Books indexes
    await db.collection('books').createIndex({ ISBN: 1 }, { unique: true });
    await db.collection('books').createIndex({ category: 1 });
    await db.collection('books').createIndex({ isActive: 1 });
    await db.collection('books').createIndex(
      { title: 'text', author: 'text', ISBN: 'text' },
      { name: 'book_search_text' }
    );
    console.log('✓ Books indexes created');

    // BookCopies indexes
    await db.collection('bookCopies').createIndex({ bookId: 1 });
    await db.collection('bookCopies').createIndex({ copyCode: 1 }, { unique: true });
    await db.collection('bookCopies').createIndex({ status: 1 });
    await db.collection('bookCopies').createIndex({ bookId: 1, status: 1 });
    console.log('✓ BookCopies indexes created');

    // Loans indexes
    await db.collection('loans').createIndex({ userId: 1 });
    await db.collection('loans').createIndex({ bookId: 1 });
    await db.collection('loans').createIndex({ status: 1 });
    await db.collection('loans').createIndex({ borrowDate: -1 });
    await db.collection('loans').createIndex({ userId: 1, status: 1 });
    console.log('✓ Loans indexes created\n');

    console.log('========================================');
    console.log('Database seeding completed successfully!');
    console.log('========================================\n');
    console.log('Summary:');
    console.log(`- ${usersToInsert.length} users`);
    console.log(`- ${books.length} books`);
    console.log(`- ${bookCopies.length} book copies`);
    console.log(`- ${loans.length} loans`);
    console.log('\nYou can now start the Angular application with: npm start');

    await user.logOut();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Seeding failed!');
    console.error('Error:', error.message);
    console.error('\nCommon issues:');
    console.error('1. Atlas App ID not configured in realm.config.ts');
    console.error('2. Admin user not created in Atlas UI');
    console.error('3. Atlas Functions not deployed');
    console.error('4. Network connectivity issues');
    console.error('\nPlease check the setup guide in ATLAS_FUNCTIONS.md');
    process.exit(1);
  }
}

seedDatabase();
