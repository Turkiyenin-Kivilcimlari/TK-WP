// MongoDB initialization script for development
db = db.getSiblingDB('topluluk_dev');

// Create application user
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'topluluk_dev'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.articles.createIndex({ "slug": 1 }, { unique: true });
db.articles.createIndex({ "author": 1 });
db.articles.createIndex({ "createdAt": -1 });
db.articles.createIndex({ "status": 1 });
db.events.createIndex({ "slug": 1 }, { unique: true });
db.events.createIndex({ "date": 1 });
db.comments.createIndex({ "articleId": 1 });
db.comments.createIndex({ "authorId": 1 });

print('Development database initialized successfully');