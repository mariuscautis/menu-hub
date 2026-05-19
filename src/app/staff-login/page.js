'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const TRANSLATIONS = {
  en: {
    title: 'Staff Login',
    subtitle: 'Access your schedule and time-off requests',
    setupDone: 'Password set successfully! You can now log in.',
    emailLabel: 'Email Address',
    emailPlaceholder: 'your.email@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    loggingIn: 'Logging in...',
    loginBtn: 'Login',
    hint: 'First time logging in? Your manager will provide your PIN to set up your password. Forgotten your password? Ask your manager to reset it.',
    errorDefault: 'Invalid email or password',
    errorOccurred: 'An error occurred during login. Please try again.',
  },
  es: {
    title: 'Acceso del Personal',
    subtitle: 'Accede a tu horario y solicitudes de ausencia',
    setupDone: '¡Contraseña establecida correctamente! Ya puedes iniciar sesión.',
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'tu.email@ejemplo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Introduce tu contraseña',
    loggingIn: 'Iniciando sesión...',
    loginBtn: 'Iniciar Sesión',
    hint: '¿Es tu primera vez? Tu responsable te proporcionará el PIN para configurar tu contraseña. ¿Olvidaste tu contraseña? Pide a tu responsable que la restablezca.',
    errorDefault: 'Correo o contraseña incorrectos',
    errorOccurred: 'Se produjo un error durante el inicio de sesión. Inténtalo de nuevo.',
  },
  fr: {
    title: 'Connexion du Personnel',
    subtitle: 'Accédez à votre planning et vos demandes d\'absence',
    setupDone: 'Mot de passe défini avec succès ! Vous pouvez maintenant vous connecter.',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'votre.email@exemple.com',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Entrez votre mot de passe',
    loggingIn: 'Connexion en cours...',
    loginBtn: 'Se Connecter',
    hint: 'Première connexion ? Votre responsable vous fournira le code PIN pour configurer votre mot de passe. Mot de passe oublié ? Demandez à votre responsable de le réinitialiser.',
    errorDefault: 'E-mail ou mot de passe invalide',
    errorOccurred: 'Une erreur s\'est produite lors de la connexion. Veuillez réessayer.',
  },
  it: {
    title: 'Accesso del Personale',
    subtitle: 'Accedi al tuo turno e alle richieste di assenza',
    setupDone: 'Password impostata con successo! Ora puoi accedere.',
    emailLabel: 'Indirizzo Email',
    emailPlaceholder: 'tua.email@esempio.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Inserisci la tua password',
    loggingIn: 'Accesso in corso...',
    loginBtn: 'Accedi',
    hint: 'Prima volta? Il tuo responsabile ti fornirà il PIN per impostare la password. Password dimenticata? Chiedi al tuo responsabile di reimpostarla.',
    errorDefault: 'Email o password non valida',
    errorOccurred: 'Si è verificato un errore durante l\'accesso. Riprova.',
  },
  ro: {
    title: 'Autentificare Personal',
    subtitle: 'Accesează programul tău și cererile de concediu',
    setupDone: 'Parola a fost setată cu succes! Acum te poți autentifica.',
    emailLabel: 'Adresă de Email',
    emailPlaceholder: 'emailul.tau@exemplu.com',
    passwordLabel: 'Parolă',
    passwordPlaceholder: 'Introdu parola ta',
    loggingIn: 'Se autentifică...',
    loginBtn: 'Autentificare',
    hint: 'Prima autentificare? Managerul tău îți va oferi PIN-ul pentru a-ți seta parola. Ai uitat parola? Cere managerului tău să o reseteze.',
    errorDefault: 'Email sau parolă incorecte',
    errorOccurred: 'A apărut o eroare la autentificare. Te rugăm să încerci din nou.',
  },
}

function useStaffT() {
  const [t, setT] = useState(TRANSLATIONS.en)
  useEffect(() => {
    const lang = localStorage.getItem('app_language') || 'en'
    setT(TRANSLATIONS[lang] || TRANSLATIONS.en)
  }, [])
  return t
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setupDone = searchParams.get('setup') === 'done'
  const t = useStaffT()

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      })
      const data = await res.json()

      if (!res.ok) {
        setError((data.error || t.errorDefault) + (data.detail ? ` (${data.detail})` : ''))
        setLoading(false)
        return
      }

      if (data.needs_setup) {
        router.push(`/staff-setup-password?staff_id=${data.staff_id}&name=${encodeURIComponent(data.name)}`)
        return
      }

      localStorage.setItem('staff_session', JSON.stringify(data.staff_session))
      router.push('/staff-dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError(t.errorOccurred)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#6262bd] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-slate-500 mt-2">{t.subtitle}</p>
        </div>

        {setupDone && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 text-green-700 text-sm">
            {t.setupDone}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t.emailLabel}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="w-full px-4 py-3 border-2 border-slate-200 focus:outline-none focus:border-[#6262bd] text-slate-700"
              placeholder={t.emailPlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border-2 border-slate-200 focus:outline-none focus:border-[#6262bd] text-slate-700 pr-12"
                placeholder={t.passwordPlaceholder}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6262bd] text-white py-3 font-semibold hover:bg-[#5252a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.loggingIn : t.loginBtn}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">{t.hint}</p>
        </div>
      </div>
    </div>
  )
}

export default function StaffLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-white" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
