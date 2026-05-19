'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TRANSLATIONS = {
  en: {
    verifying: 'Verifying...',
    verifyingMsg: 'Verifying your magic link...',
    successTitle: 'Success!',
    successMsg: 'Login successful! Redirecting to your dashboard...',
    errorTitle: 'Login Failed',
    tryBtn: 'Try PIN Login Instead',
    invalidToken: 'Invalid or missing token. Please request a new magic link.',
    invalidLink: 'Invalid or expired magic link. Please request a new one.',
    expiredLink: 'This magic link has expired. Please request a new one.',
    inactiveAccount: 'Your account is not active. Please contact your manager.',
    errorOccurred: 'An error occurred during verification. Please try again.',
  },
  es: {
    verifying: 'Verificando...',
    verifyingMsg: 'Verificando tu enlace mágico...',
    successTitle: '¡Éxito!',
    successMsg: '¡Inicio de sesión exitoso! Redirigiendo a tu panel...',
    errorTitle: 'Error de Inicio de Sesión',
    tryBtn: 'Intentar con PIN en su lugar',
    invalidToken: 'Token inválido o ausente. Por favor solicita un nuevo enlace mágico.',
    invalidLink: 'Enlace mágico inválido o caducado. Por favor solicita uno nuevo.',
    expiredLink: 'Este enlace mágico ha caducado. Por favor solicita uno nuevo.',
    inactiveAccount: 'Tu cuenta no está activa. Contacta con tu responsable.',
    errorOccurred: 'Se produjo un error durante la verificación. Inténtalo de nuevo.',
  },
  fr: {
    verifying: 'Vérification...',
    verifyingMsg: 'Vérification de votre lien magique...',
    successTitle: 'Succès !',
    successMsg: 'Connexion réussie ! Redirection vers votre tableau de bord...',
    errorTitle: 'Échec de la Connexion',
    tryBtn: 'Essayer avec le PIN à la place',
    invalidToken: 'Token invalide ou manquant. Veuillez demander un nouveau lien magique.',
    invalidLink: 'Lien magique invalide ou expiré. Veuillez en demander un nouveau.',
    expiredLink: 'Ce lien magique a expiré. Veuillez en demander un nouveau.',
    inactiveAccount: 'Votre compte n\'est pas actif. Veuillez contacter votre responsable.',
    errorOccurred: 'Une erreur s\'est produite lors de la vérification. Veuillez réessayer.',
  },
  it: {
    verifying: 'Verifica in corso...',
    verifyingMsg: 'Verifica del link magico in corso...',
    successTitle: 'Successo!',
    successMsg: 'Accesso effettuato! Reindirizzamento alla dashboard...',
    errorTitle: 'Accesso Non Riuscito',
    tryBtn: 'Prova con il PIN',
    invalidToken: 'Token non valido o mancante. Richiedi un nuovo link magico.',
    invalidLink: 'Link magico non valido o scaduto. Richiedine uno nuovo.',
    expiredLink: 'Questo link magico è scaduto. Richiedine uno nuovo.',
    inactiveAccount: 'Il tuo account non è attivo. Contatta il tuo responsabile.',
    errorOccurred: 'Si è verificato un errore durante la verifica. Riprova.',
  },
  ro: {
    verifying: 'Se verifică...',
    verifyingMsg: 'Se verifică link-ul magic...',
    successTitle: 'Succes!',
    successMsg: 'Autentificare reușită! Redirecționare către panoul tău...',
    errorTitle: 'Autentificare Eșuată',
    tryBtn: 'Încearcă cu PIN-ul',
    invalidToken: 'Token invalid sau lipsă. Te rugăm să soliciți un nou link magic.',
    invalidLink: 'Link magic invalid sau expirat. Te rugăm să soliciți unul nou.',
    expiredLink: 'Acest link magic a expirat. Te rugăm să soliciți unul nou.',
    inactiveAccount: 'Contul tău nu este activ. Contactează managerul tău.',
    errorOccurred: 'A apărut o eroare în timpul verificării. Te rugăm să încerci din nou.',
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

function StaffMagicLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useStaffT()
  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    verifyToken()
  }, [])

  const verifyToken = async () => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('invalidToken')
      return
    }

    try {
      const { data: linkData, error: linkError } = await supabase
        .from('staff_magic_links')
        .select(`
          *,
          staff:staff_id (
            id,
            name,
            email,
            restaurant_id,
            department,
            role,
            status,
            restaurants(name)
          )
        `)
        .eq('token', token)
        .eq('used', false)
        .maybeSingle()

      if (linkError || !linkData) {
        setStatus('error')
        setMessage('invalidLink')
        return
      }

      const now = new Date()
      const expiresAt = new Date(linkData.expires_at)

      if (now > expiresAt) {
        setStatus('error')
        setMessage('expiredLink')
        return
      }

      if (linkData.staff.status !== 'active') {
        setStatus('error')
        setMessage('inactiveAccount')
        return
      }

      await supabase
        .from('staff_magic_links')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token)

      const staffSession = {
        staff_id: linkData.staff.id,
        name: linkData.staff.name,
        email: linkData.staff.email,
        restaurant_id: linkData.staff.restaurant_id,
        restaurant_name: linkData.staff.restaurants?.name,
        department: linkData.staff.department,
        role: linkData.staff.role,
        logged_in_at: new Date().toISOString()
      }

      localStorage.setItem('staff_session', JSON.stringify(staffSession))

      setStatus('success')
      setMessage('successMsg')

      setTimeout(() => {
        router.push('/staff-dashboard')
      }, 1500)
    } catch (error) {
      console.error('Error verifying magic link:', error)
      setStatus('error')
      setMessage('errorOccurred')
    }
  }

  const getMsg = (key) => t[key] || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl w-full max-w-md p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin h-16 w-16 border-b-4 border-[#6262bd] mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{t.verifying}</h1>
            <p className="text-slate-500">{t.verifyingMsg}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{t.successTitle}</h1>
            <p className="text-slate-500">{t.successMsg}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{t.errorTitle}</h1>
            <p className="text-slate-500 mb-6">{getMsg(message)}</p>
            <button
              onClick={() => router.push('/staff-login')}
              className="bg-[#6262bd] text-white px-6 py-3 font-semibold hover:bg-[#5252a3] transition-colors"
            >
              {t.tryBtn}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function StaffMagicLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <StaffMagicLoginContent />
    </Suspense>
  )
}
