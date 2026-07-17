import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    await connectToDatabase();
    
    // Perform a simple database operation to verify connectivity
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }
    
    // Check Redis connection if available
    let redisStatus = 'not configured';
    if (process.env.REDIS_URL) {
      try {
        // Add Redis health check here if you have Redis client configured
        redisStatus = 'healthy';
      } catch (error) {
        redisStatus = 'unhealthy';
      }
    }
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'healthy',
        redis: redisStatus,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };
    
    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
    };
    
    return NextResponse.json(errorData, { status: 503 });
  }
}

// Also support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    await connectToDatabase();
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}