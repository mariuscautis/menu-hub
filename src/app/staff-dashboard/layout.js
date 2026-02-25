export const metadata = {
  manifest: '/staff-manifest.json',
  title: 'Veno App - Staff Dashboard',
  description: 'Access your rota, shifts, and time-off requests',
  themeColor: '#8b5cf6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Veno App Staff',
  },
}

export default function StaffDashboardLayout({ children }) {
  return children
}
