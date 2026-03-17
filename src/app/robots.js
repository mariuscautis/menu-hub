export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/staff-dashboard', '/auth/callback'],
    },
  }
}
