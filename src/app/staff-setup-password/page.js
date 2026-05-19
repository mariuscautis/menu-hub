'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const TRANSLATIONS = {
  en: {
    title: 'Set Your Password',
    welcome: 'Welcome,',
    subtitle: 'Create a password to secure your account. You\'ll use it to log in from now on.',
    pinLabel: 'Your PIN (to verify it\'s you)',
    pinPlaceholder: 'Enter your current PIN',
    newPasswordLabel: 'New Password',
    newPasswordPlaceholder: 'Min. 8 characters',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Repeat your password',
    charsNeeded: 'more character needed',
    charsNeededPlural: 'more characters needed',
    passwordMismatch: 'Passwords don\'t match',
    infoText: 'After setting your password, you\'ll be redirected to the login page where you can sign in with your email and new password.',
    infoStrong: 'After setting your password',
    setting: 'Setting password...',
    submitBtn: 'Set Password & Continue',
    errorMinLength: 'Password must be at least 8 characters',
    errorMismatch: 'Passwords do not match',
    errorDefault: 'Failed to set password',
    errorOccurred: 'Something went wrong. Please try again.',
  },
  es: {
    title: 'Establece tu Contraseña',
    welcome: 'Bienvenido/a,',
    subtitle: 'Crea una contraseña para proteger tu cuenta. La usarás para iniciar sesión a partir de ahora.',
    pinLabel: 'Tu PIN (para verificar tu identidad)',
    pinPlaceholder: 'Introduce tu PIN actual',
    newPasswordLabel: 'Nueva Contraseña',
    newPasswordPlaceholder: 'Mín. 8 caracteres',
    confirmPasswordLabel: 'Confirmar Contraseña',
    confirmPasswordPlaceholder: 'Repite tu contraseña',
    charsNeeded: 'carácter más necesario',
    charsNeededPlural: 'caracteres más necesarios',
    passwordMismatch: 'Las contraseñas no coinciden',
    infoText: 'Después de establecer tu contraseña, serás redirigido a la página de inicio de sesión para entrar con tu email y nueva contraseña.',
    infoStrong: 'Después de establecer tu contraseña',
    setting: 'Estableciendo contraseña...',
    submitBtn: 'Establecer Contraseña y Continuar',
    errorMinLength: 'La contraseña debe tener al menos 8 caracteres',
    errorMismatch: 'Las contraseñas no coinciden',
    errorDefault: 'No se pudo establecer la contraseña',
    errorOccurred: 'Algo salió mal. Inténtalo de nuevo.',
  },
  fr: {
    title: 'Définir votre Mot de Passe',
    welcome: 'Bienvenue,',
    subtitle: 'Créez un mot de passe pour sécuriser votre compte. Vous l\'utiliserez pour vous connecter désormais.',
    pinLabel: 'Votre PIN (pour vérifier votre identité)',
    pinPlaceholder: 'Entrez votre PIN actuel',
    newPasswordLabel: 'Nouveau Mot de Passe',
    newPasswordPlaceholder: 'Min. 8 caractères',
    confirmPasswordLabel: 'Confirmer le Mot de Passe',
    confirmPasswordPlaceholder: 'Répétez votre mot de passe',
    charsNeeded: 'caractère supplémentaire requis',
    charsNeededPlural: 'caractères supplémentaires requis',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    infoText: 'Après avoir défini votre mot de passe, vous serez redirigé vers la page de connexion pour vous connecter avec votre e-mail et votre nouveau mot de passe.',
    infoStrong: 'Après avoir défini votre mot de passe',
    setting: 'Définition du mot de passe...',
    submitBtn: 'Définir le Mot de Passe et Continuer',
    errorMinLength: 'Le mot de passe doit comporter au moins 8 caractères',
    errorMismatch: 'Les mots de passe ne correspondent pas',
    errorDefault: 'Échec de la définition du mot de passe',
    errorOccurred: 'Une erreur s\'est produite. Veuillez réessayer.',
  },
  it: {
    title: 'Imposta la tua Password',
    welcome: 'Benvenuto/a,',
    subtitle: 'Crea una password per proteggere il tuo account. La utilizzerai per accedere d\'ora in poi.',
    pinLabel: 'Il tuo PIN (per verificare la tua identità)',
    pinPlaceholder: 'Inserisci il tuo PIN attuale',
    newPasswordLabel: 'Nuova Password',
    newPasswordPlaceholder: 'Min. 8 caratteri',
    confirmPasswordLabel: 'Conferma Password',
    confirmPasswordPlaceholder: 'Ripeti la tua password',
    charsNeeded: 'carattere in più necessario',
    charsNeededPlural: 'caratteri in più necessari',
    passwordMismatch: 'Le password non corrispondono',
    infoText: 'Dopo aver impostato la password, verrai reindirizzato alla pagina di accesso dove potrai accedere con la tua email e la nuova password.',
    infoStrong: 'Dopo aver impostato la password',
    setting: 'Impostazione password...',
    submitBtn: 'Imposta Password e Continua',
    errorMinLength: 'La password deve contenere almeno 8 caratteri',
    errorMismatch: 'Le password non corrispondono',
    errorDefault: 'Impossibile impostare la password',
    errorOccurred: 'Qualcosa è andato storto. Riprova.',
  },
  ro: {
    title: 'Setează-ți Parola',
    welcome: 'Bine ai venit,',
    subtitle: 'Creează o parolă pentru a-ți securiza contul. O vei folosi pentru a te autentifica de acum înainte.',
    pinLabel: 'PIN-ul tău (pentru a-ți verifica identitatea)',
    pinPlaceholder: 'Introdu PIN-ul tău actual',
    newPasswordLabel: 'Parolă Nouă',
    newPasswordPlaceholder: 'Min. 8 caractere',
    confirmPasswordLabel: 'Confirmă Parola',
    confirmPasswordPlaceholder: 'Repetă parola ta',
    charsNeeded: 'caracter în plus necesar',
    charsNeededPlural: 'caractere în plus necesare',
    passwordMismatch: 'Parolele nu se potrivesc',
    infoText: 'După setarea parolei, vei fi redirecționat la pagina de autentificare unde te poți conecta cu emailul și noua parolă.',
    infoStrong: 'După setarea parolei',
    setting: 'Se setează parola...',
    submitBtn: 'Setează Parola și Continuă',
    errorMinLength: 'Parola trebuie să aibă cel puțin 8 caractere',
    errorMismatch: 'Parolele nu se potrivesc',
    errorDefault: 'Nu s-a putut seta parola',
    errorOccurred: 'Ceva a mers greșit. Te rugăm să încerci din nou.',
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

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const staffId = searchParams.get('staff_id')
  const staffName = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')) : ''
  const t = useStaffT()

  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!staffId) router.push('/staff-login')
  }, [staffId, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(t.errorMinLength)
      return
    }
    if (password !== confirmPassword) {
      setError(t.errorMismatch)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/staff/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, pin_code: pin, password, confirm_password: confirmPassword })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t.errorDefault)
        setLoading(false)
        return
      }
      router.push('/staff-login?setup=done')
    } catch (err) {
      setError(t.errorOccurred)
      setLoading(false)
    }
  }

  const remaining = 8 - password.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#6262bd] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          {staffName && <p className="text-slate-500 mt-1">{t.welcome} {staffName}</p>}
          <p className="text-slate-500 text-sm mt-2">{t.subtitle}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t.pinLabel}
            </label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              required
              inputMode="numeric"
              placeholder={t.pinPlaceholder}
              className="w-full px-4 py-3 border-2 border-slate-200 focus:outline-none focus:border-[#6262bd] text-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t.newPasswordLabel}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t.newPasswordPlaceholder}
                className="w-full px-4 py-3 border-2 border-slate-200 focus:outline-none focus:border-[#6262bd] text-slate-700 pr-12"
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
            {password.length > 0 && password.length < 8 && (
              <p className="mt-1 text-xs text-amber-600">{remaining} {remaining === 1 ? t.charsNeeded : t.charsNeededPlural}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t.confirmPasswordLabel}
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder={t.confirmPasswordPlaceholder}
              className={`w-full px-4 py-3 border-2 focus:outline-none focus:border-[#6262bd] text-slate-700 ${
                confirmPassword && confirmPassword !== password ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1 text-xs text-red-600">{t.passwordMismatch}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4">
            <p className="text-xs text-blue-700">
              <strong>{t.infoStrong}</strong>, {t.infoText.replace(t.infoStrong + ', ', '').replace(t.infoStrong, '')}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || password.length < 8 || password !== confirmPassword || !pin}
            className="w-full bg-[#6262bd] text-white py-3 font-semibold hover:bg-[#5252a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.setting : t.submitBtn}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function StaffSetupPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-white" />
      </div>
    }>
      <SetupForm />
    </Suspense>
  )
}
