'use client'

import { useState } from 'react'
import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'

export default function ContactPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    enquiryType: 'Join',
    firstName: '',
    lastName: '',
    businessName: '',
    businessType: '',
    location: '',
    phone: '',
    email: '',
    message: '',
  })

  const enquiryTypes = [
    { value: 'Join', label: 'Join Veno App' },
    { value: 'General Enquiries', label: 'General Enquiries' },
    { value: 'Technical Support', label: 'Technical Support' },
    { value: 'Partnerships', label: 'Partnerships' },
    { value: 'Other', label: 'Other' },
  ]

  const businessTypes = [
    'Restaurant',
    'Cafe',
    'Bar / Pub',
    'Hotel',
    'Fast Food',
    'Food Truck',
    'Catering',
    'Other',
  ]

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create mailto link with form data
      const subject = encodeURIComponent(`[${formData.enquiryType}] New Contact Form Submission - ${formData.businessName}`)
      const body = encodeURIComponent(
        `Enquiry Type: ${formData.enquiryType}\n\n` +
        `Name: ${formData.firstName} ${formData.lastName}\n` +
        `Business Name: ${formData.businessName}\n` +
        `Business Type: ${formData.businessType}\n` +
        `Location: ${formData.location}\n` +
        `Phone: ${formData.phone}\n` +
        `Email: ${formData.email}\n\n` +
        `Message:\n${formData.message}`
      )

      // Open mailto link
      window.location.href = `mailto:marius.cautis@gmail.com?subject=${subject}&body=${body}`

      setSuccess(true)
      setFormData({
        enquiryType: 'Join',
        firstName: '',
        lastName: '',
        businessName: '',
        businessType: '',
        location: '',
        phone: '',
        email: '',
        message: '',
      })
    } catch (err) {
      setError('Something went wrong. Please try again or email us directly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ServicePageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6262bd]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 rounded-full text-[#6262bd] text-sm font-semibold mb-6">
              Contact Us
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Let's Start a Conversation
            </h1>

            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              Whether you're ready to join Veno App, have questions about our platform, or want to explore partnership opportunities, we'd love to hear from you.
            </p>
          </div>

          {/* Contact Form */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-6 sm:p-10">
              {success ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Thanks for reaching out!
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-8">
                    Your email client should have opened with your message. If it didn't, please email us directly at{' '}
                    <a href="mailto:marius.cautis@gmail.com" className="text-[#6262bd] hover:underline">
                      hello@venoapp.com
                    </a>
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="bg-[#6262bd] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-all"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Enquiry Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      What can we help you with?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {enquiryTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, enquiryType: type.value })}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            formData.enquiryType === type.value
                              ? 'bg-[#6262bd] text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name Fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] dark:focus:border-[#8585d0] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 transition-colors"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] dark:focus:border-[#8585d0] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 transition-colors"
                        placeholder="Smith"
                      />
                    </div>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      id="businessName"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] dark:focus:border-[#8585d0] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 transition-colors"
                      placeholder="Your Restaurant Name"
                    />
                  </div>

                  {/* Business Type & Location */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="businessType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Business Type *
                      </label>
                      <select
                        id="businessType"
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] dark:focus:border-[#8585d0] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 transition-colors"
                      >
                        <option value="">Select type...</option>
                        {businessTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Location *
                      </label>
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] dark:focus:border-[#8585d0] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 transition-colors"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>

                  {/* Phone & Email */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] dark:focus:border-[#8585d0] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 transition-colors"
                        placeholder="+1 234 567 890"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] dark:focus:border-[#8585d0] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 transition-colors"
                        placeholder="john@restaurant.com"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Message <span className="text-slate-400 dark:text-slate-500">(optional)</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] dark:focus:border-[#8585d0] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 transition-colors resize-none"
                      placeholder="Tell us more about your venue and how we can help..."
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#6262bd] text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#6262bd]/20"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Send Message'
                    )}
                  </button>

                  {/* Direct Email Note */}
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    Or email us directly at{' '}
                    <a href="mailto:marius.cautis@gmail.com" className="text-[#6262bd] hover:underline font-medium">
                      hello@venoapp.com
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Additional Info Section */}
      <section className="py-16 lg:py-20 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Email Us',
                description: 'Send us an email anytime. We aim to respond within 24 hours.',
                action: (
                  <a href="mailto:marius.cautis@gmail.com" className="text-[#6262bd] hover:underline font-medium">
                    hello@venoapp.com
                  </a>
                ),
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'FAQs',
                description: 'Find quick answers to common questions about our platform.',
                action: (
                  <Link href="/help" className="text-[#6262bd] hover:underline font-medium">
                    Visit Help Center
                  </Link>
                ),
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Response Time',
                description: 'We typically respond within 24 hours on business days.',
                action: (
                  <span className="text-slate-600 dark:text-slate-400">
                    Monday - Friday, 9am - 6pm
                  </span>
                ),
              },
            ].map((item, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700 text-center">
                <div className="w-14 h-14 rounded-xl bg-[#6262bd]/10 flex items-center justify-center text-[#6262bd] mx-auto mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{item.description}</p>
                {item.action}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-[#6262bd] to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Not Ready to Talk Yet?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            That's okay! Start your free trial and explore the platform at your own pace. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-white text-[#6262bd] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/about"
              className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
      </section>
    </ServicePageLayout>
  )
}
