/** @type {import('next').NextConfig} */
const nextConfig = {
  // Verification builds (`npm run build:check`) set NEXT_DIST_DIR so they
  // write to their own folder. A plain `next build` shares .next with
  // `next dev`, and the two write incompatible artifacts -- building while the
  // dev server is up leaves it serving chunks that no longer exist, which
  // surfaces as an Internal Server Error until .next is deleted.
  distDir: process.env.NEXT_DIST_DIR || '.next',
}

export default nextConfig
