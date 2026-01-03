export const metadata = {
  manifest: '/staff-manifest.json',
  title: 'Menu Hub - Staff Dashboard',
  description: 'Access your rota, shifts, and time-off requests',
  themeColor: '#8b5cf6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Menu Hub Staff',
  },
}

export default function StaffDashboardLayout({ children }) {
  return children
}
