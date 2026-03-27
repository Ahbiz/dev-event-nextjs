import mongoose from 'mongoose';

// Ensure the MongoDB URI environment variable is provided
const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env (or .env.local)'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage and Next.js fast refresh.
 */

// Define the shape of our cached connection object
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the NodeJS global object to include our custom mongoose caching property
declare global {
  // eslint-disable-next-line no-var
  var mongooseDbConnect: MongooseCache | undefined;
}

// Retrieve the existing cached connection or initialize it if it doesn't exist
let cached = global.mongooseDbConnect;

if (!cached) {
  cached = global.mongooseDbConnect = { conn: null, promise: null };
}

/**
 * Establishes a cached connection to MongoDB using Mongoose.
 * @returns {Promise<typeof mongoose>} The Mongoose connection object
 */
async function dbConnect(): Promise<typeof mongoose> {
  // 1. If we already have an active database connection, return it immediately
  // Note: cached is guaranteed to be initialized because of the check above
  if (cached!.conn) {
    return cached!.conn;
  }

  // 2. If a connection is not already in progress, start one and store the promise
  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    // 3. Wait for the connection to establish and store the active connection
    cached!.conn = await cached!.promise;
  } catch (error) {
    // 4. If the connection fails, clear the cached promise so we can attempt to reconnect later
    cached!.promise = null;
    throw error;
  }

  return cached!.conn;
}

export default dbConnect;
