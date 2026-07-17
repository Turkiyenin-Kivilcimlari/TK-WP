// MongoDB initialization script for production
db = db.getSiblingDB('topluluk_prod');

// Create application user with limited privileges
db.createUser({
  user: process.env.MONGO_APP_USERNAME || 'topluluk_user',
  pwd: process.env.MONGO_APP_PASSWORD || 'secure_password_123',
  roles: [
    {
      role: 'readWrite',
      db: 'topluluk_prod'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "isVerified": 1 });

db.articles.createIndex({ "slug": 1 }, { unique: true });
db.articles.createIndex({ "author": 1 });
db.articles.createIndex({ "createdAt": -1 });
db.articles.createIndex({ "status": 1 });
db.articles.createIndex({ "tags": 1 });
db.articles.createIndex({ "title": "text", "content": "text" });

db.events.createIndex({ "slug": 1 }, { unique: true });
db.events.createIndex({ "date": 1 });
db.events.createIndex({ "status": 1 });
db.events.createIndex({ "organizer": 1 });

db.comments.createIndex({ "articleId": 1 });
db.comments.createIndex({ "authorId": 1 });
db.comments.createIndex({ "createdAt": -1 });
db.comments.createIndex({ "status": 1 });

print('Production database initialized successfully');