import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The API base URL is read on the server only (see src/lib/api/config.ts).
  // Nothing about the backend is shipped to the browser.
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
