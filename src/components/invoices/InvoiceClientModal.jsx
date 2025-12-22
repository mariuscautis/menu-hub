'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function InvoiceClientModal({ restaurant, onSubmit, onClose, isGenerating = false }) {
  const [mode, setMode] = useState(null) // null, 'existing', 'new', 'action'
  const [searchQuery, setSearchQuery] = useState('')
  const [clients, setClients] = useState([])
  const [filteredClients, setFilteredClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(false)
  const [clientDataForInvoice, setClientDataForInvoice] = useState(null)

  // New client form
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    vat_number: '',
    tax_id: '',
    notes: ''
  })

  // Fetch existing clients when modal opens
  useEffect(() => {
    if (restaurant) {
      fetchClients()
    }
  }, [restaurant])

  // Filter clients based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(query) ||
        (client.company && client.company.toLowerCase().includes(query)) ||
        (client.email && client.email.toLowerCase().includes(query))
      )
      setFilteredClients(filtered)
    } else {
      setFilteredClients(clients)
    }
  }, [searchQuery, clients])

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('invoice_clients')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setClients(data)
      setFilteredClients(data)
    }
  }

  const handleExistingClientSubmit = () => {
    if (!selectedClient) {
      alert('Please select a client')
      return
    }

    // Store client data and move to action selection
    setClientDataForInvoice({
      clientId: selectedClient.id,
      clientData: {
        name: selectedClient.name,
        company: selectedClient.company,
        email: selectedClient.email,
        phone: selectedClient.phone,
        address: selectedClient.address,
        city: selectedClient.city,
        postal_code: selectedClient.postal_code,
        country: selectedClient.country,
        vat_number: selectedClient.vat_number,
        tax_id: selectedClient.tax_id
      }
    })
    setMode('action')
  }

  const handleNewClientSubmit = async () => {
    if (!newClientForm.name.trim()) {
      alert('Client name is required')
      return
    }

    setLoading(true)

    // Create new client
    const { data: newClient, error } = await supabase
      .from('invoice_clients')
      .insert({
        restaurant_id: restaurant.id,
        ...newClientForm
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      console.error('Failed to create client:', error)

      // Handle duplicate email error
      if (error.code === '23505' && error.message.includes('invoice_clients_restaurant_id_email_key')) {
        const duplicateEmail = newClientForm.email
        if (confirm('A client with this email already exists. Would you like to search for them?')) {
          // Switch to existing client mode and search for the email
          setMode('existing')
          setSearchQuery(duplicateEmail)
          return
        }
        return
      }

      alert('Failed to create client: ' + error.message)
      return
    }

    // Store client data and move to action selection
    setClientDataForInvoice({
      clientId: newClient.id,
      clientData: {
        name: newClient.name,
        company: newClient.company,
        email: newClient.email,
        phone: newClient.phone,
        address: newClient.address,
        city: newClient.city,
        postal_code: newClient.postal_code,
        country: newClient.country,
        vat_number: newClient.vat_number,
        tax_id: newClient.tax_id
      }
    })
    setMode('action')
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-slate-100 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Generate Invoice</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Mode Selection */}
          {mode === null && (
            <div className="space-y-4">
              <p className="text-slate-600 mb-6">
                Choose whether to invoice an existing client or create a new one:
              </p>

              <button
                onClick={() => setMode('existing')}
                className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-[#6262bd] hover:bg-[#6262bd]/5 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#6262bd]/10 group-hover:bg-[#6262bd] rounded-xl flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6 text-[#6262bd] group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Existing Client</h3>
                    <p className="text-sm text-slate-500">Search and select from previous clients</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('new')}
                className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 group-hover:bg-green-500 rounded-xl flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">New Client</h3>
                    <p className="text-sm text-slate-500">Enter details for a first-time client</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Existing Client Mode */}
          {mode === 'existing' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode(null)}
                className="text-sm text-[#6262bd] hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                Back
              </button>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Clients
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, company, or email..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                  autoFocus
                />
              </div>

              {/* Client List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {searchQuery ? 'No clients found' : 'No clients yet'}
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedClient?.id === client.id
                          ? 'border-[#6262bd] bg-[#6262bd]/5'
                          : 'border-slate-200 hover:border-[#6262bd]/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-800">{client.name}</h3>
                          {client.company && (
                            <p className="text-sm text-slate-600">{client.company}</p>
                          )}
                          {client.email && (
                            <p className="text-sm text-slate-500">{client.email}</p>
                          )}
                        </div>
                        {client.total_invoices > 0 && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                            {client.total_invoices} invoice{client.total_invoices !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setMode(null)}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExistingClientSubmit}
                  disabled={!selectedClient || isGenerating}
                  className="flex-1 bg-[#6262bd] text-white px-4 py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating Invoice...' : 'Generate Invoice'}
                </button>
              </div>
            </div>
          )}

          {/* New Client Mode */}
          {mode === 'new' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode(null)}
                className="text-sm text-[#6262bd] hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                Back
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="John Doe"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={newClientForm.company}
                    onChange={(e) => setNewClientForm({ ...newClientForm, company: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="Acme Corp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newClientForm.address}
                    onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="123 Main St"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={newClientForm.city}
                    onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="London"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={newClientForm.postal_code}
                    onChange={(e) => setNewClientForm({ ...newClientForm, postal_code: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="SW1A 1AA"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={newClientForm.country}
                    onChange={(e) => setNewClientForm({ ...newClientForm, country: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="United Kingdom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={newClientForm.vat_number}
                    onChange={(e) => setNewClientForm({ ...newClientForm, vat_number: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="GB123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    value={newClientForm.tax_id}
                    onChange={(e) => setNewClientForm({ ...newClientForm, tax_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    placeholder="12-3456789"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setMode(null)}
                  disabled={loading || isGenerating}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNewClientSubmit}
                  disabled={loading || isGenerating || !newClientForm.name.trim()}
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Client...' : isGenerating ? 'Generating Invoice...' : 'Create & Generate Invoice'}
                </button>
              </div>
            </div>
          )}

          {/* Action Selection Mode */}
          {mode === 'action' && clientDataForInvoice && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Client Selected</h3>
                <p className="text-slate-600">
                  {clientDataForInvoice.clientData.name}
                  {clientDataForInvoice.clientData.company && ` - ${clientDataForInvoice.clientData.company}`}
                </p>
              </div>

              <p className="text-slate-600 mb-4 text-center">
                How would you like to deliver the invoice?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    onSubmit({
                      ...clientDataForInvoice,
                      action: 'email'
                    })
                  }}
                  disabled={isGenerating || !clientDataForInvoice.clientData.email}
                  className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-500 rounded-xl flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg">Email Invoice</h3>
                      <p className="text-sm text-slate-500">
                        {clientDataForInvoice.clientData.email
                          ? `Send PDF to ${clientDataForInvoice.clientData.email}`
                          : 'No email address provided'}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onSubmit({
                      ...clientDataForInvoice,
                      action: 'download'
                    })
                  }}
                  disabled={isGenerating}
                  className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-[#6262bd] hover:bg-[#6262bd]/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#6262bd]/10 group-hover:bg-[#6262bd] rounded-xl flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-[#6262bd] group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg">Download Invoice</h3>
                      <p className="text-sm text-slate-500">Download PDF to your device</p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setMode(null)}
                disabled={isGenerating}
                className="w-full mt-4 px-4 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
