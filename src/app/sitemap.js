const BASE_URL = 'https://www.venoapp.com'

export default function sitemap() {
  const staticRoutes = [
    { url: `${BASE_URL}/`, priority: 1.0, changeFrequency: 'weekly' },
    { url: `${BASE_URL}/about`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/pricing`, priority: 0.9, changeFrequency: 'weekly' },
    { url: `${BASE_URL}/contact`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/help`, priority: 0.7, changeFrequency: 'weekly' },
    { url: `${BASE_URL}/privacy`, priority: 0.4, changeFrequency: 'yearly' },
    { url: `${BASE_URL}/terms`, priority: 0.4, changeFrequency: 'yearly' },
    { url: `${BASE_URL}/cookies`, priority: 0.3, changeFrequency: 'yearly' },

    // Services
    { url: `${BASE_URL}/services/qr-menu`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/services/table-ordering`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/services/reservations`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/services/staff-management`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/services/inventory`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/services/analytics`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/services/dashboard`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/services/branded-app`, priority: 0.8, changeFrequency: 'monthly' },
  ]

  return staticRoutes.map((route) => ({
    url: route.url,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
