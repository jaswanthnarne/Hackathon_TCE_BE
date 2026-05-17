const mongoose = require('mongoose');

// Global cache for serverless environments (Vercel / AWS Lambda)
// Prevents creating multiple connection pools across warm container invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    console.log('⚡ Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const maxRetries = 5;
    let retries = 0;

    const attemptConnect = async () => {
      while (retries < maxRetries) {
        try {
          console.log('🔄 Initiating new MongoDB connection...');
          const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Optimized for Serverless: small maxPoolSize prevents connection limit exhaustion
            // when Vercel spins up many concurrent serverless containers
            maxPoolSize: 2,
            minPoolSize: 0,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
          });
          console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

          mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
          });

          mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
          });

          return conn;
        } catch (error) {
          retries++;
          console.error(`❌ MongoDB connection attempt ${retries}/${maxRetries} failed:`, error.message);
          if (retries === maxRetries) {
            console.error('Max retries reached. Exiting...');
            if (process.env.NODE_ENV !== 'production') process.exit(1);
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    };

    cached.promise = attemptConnect();
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
};

module.exports = connectDB;
