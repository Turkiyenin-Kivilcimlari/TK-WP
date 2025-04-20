/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.microlink.io', 'res.cloudinary.com', 'images.unsplash.com','ui-avatars.com'],
  },
};

module.exports = nextConfig;
