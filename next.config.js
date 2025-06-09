/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'api.microlink.io', 
      'res.cloudinary.com', 
      'images.unsplash.com',
      'ui-avatars.com',
    ],
  },
  // Add environment variables with defaults for backup system
  env: {
    BACKUP_DIR: process.env.BACKUP_DIR || './backups',
    MONGODB_TOOLS_PATH: process.env.MONGODB_TOOLS_PATH || '',
    // Add new environment variables for backup settings
    MONGODB_DIRECT_RESTORE: process.env.MONGODB_DIRECT_RESTORE || 'true',
    BACKUP_TEMP_DIR: process.env.BACKUP_TEMP_DIR || '',
    // Enable JSON backup support
    ENABLE_JSON_BACKUP: process.env.ENABLE_JSON_BACKUP || 'true',
  },
};

module.exports = nextConfig;
