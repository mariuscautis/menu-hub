'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import moment from 'moment'

// ── UI translations (mirrors email-translations locale keys) ──────────────────
const UI_TRANSLATIONS = {
  en: {
    welcome: 'Welcome',
    logOut: 'Log out',
    upcomingShifts: 'Upcoming Shifts',
    thisWeek: 'This Week',
    pendingTimeOff: 'Pending Time-Off',
    mySchedule: 'My Schedule',
    noUpcomingShifts: 'No upcoming shifts scheduled',
    today: 'Today',
    tomorrow: 'Tomorrow',
    break: 'break',
    timeOffRequests: 'Time-Off Requests',
    requestTimeOff: '+ Request Time Off',
    noRequests: 'No time-off requests yet',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    workingDay: 'working day',
    workingDays: 'working days',
    // Modal
    requestTimeOffTitle: 'Request Time Off',
    requestSubmitted: 'Request submitted!',
    managerNotified: 'Your manager will be notified.',
    leaveType: 'Leave Type *',
    startDate: 'Start Date *',
    endDate: 'End Date *',
    workingDaysRequested: 'Working days requested',
    excludesWeekends: 'Excludes weekends',
    medicalCertTitle: 'Medical Certificate Provided',
    medicalCertDesc: 'I confirm I have or will provide a medical certificate',
    reasonRequired: 'Reason *',
    reasonOptional: 'Reason (optional)',
    reasonPlaceholderHoliday: 'Add any notes about your holiday...',
    reasonPlaceholder: 'Please provide details...',
    pleaseNote: 'Please note:',
    requiresApproval: 'Requests require manager approval',
    notifyOnReview: "You'll be notified by email when your request is reviewed",
    holidayDeduction: 'Holiday days will be deducted from your balance when approved',
    sickLeaveNote: 'Sick leave may require a return-to-work meeting',
    cancel: 'Cancel',
    submitRequest: 'Submit Request',
    submitting: 'Submitting…',
    // Leave balance
    entitlement: 'Entitlement',
    daysPerYear: 'days/year',
    available: 'Available',
    remaining: 'remaining',
    pendingLabel: 'Pending',
    awaiting: 'awaiting',
    // Errors
    errStartRequired: 'Start date is required',
    errEndRequired: 'End date is required',
    errEndAfterStart: 'End date must be on or after start date',
    errNoPastDates: 'Cannot request leave for past dates',
    errNoWorkingDays: 'Selected range contains no working days',
    errReasonRequired: 'Please provide a reason for this leave type',
    errMedicalCert: 'Please confirm you will provide a medical certificate',
    errInsufficientDays: 'You only have {available} days available',
    errFailed: 'Failed to submit',
    // Leave types
    ltAnnualHoliday: '🏖️ Annual Holiday (Paid)',
    ltSickSelfCert: '🤒 Sick Leave – Self Certified',
    ltSickMedicalCert: '🏥 Sick Leave – Medical Certificate',
    ltUnpaid: '💸 Unpaid Leave',
    ltCompassionate: '🕊️ Compassionate Leave',
    ltOther: '📋 Other',
    ldAnnualHoliday: 'Paid leave from your annual entitlement',
    ldSickSelfCert: 'For illness up to 7 days — no medical certificate required',
    ldSickMedicalCert: 'For illness over 7 days — medical certificate required',
    ldUnpaid: 'Time off without pay',
    ldCompassionate: 'For bereavement or family emergencies',
    ldOther: 'Other type of leave',
  },
  ro: {
    welcome: 'Bun venit',
    logOut: 'Deconectare',
    upcomingShifts: 'Ture Viitoare',
    thisWeek: 'Săptămâna Aceasta',
    pendingTimeOff: 'Concediu în Așteptare',
    mySchedule: 'Programul Meu',
    noUpcomingShifts: 'Nicio tură programată',
    today: 'Astăzi',
    tomorrow: 'Mâine',
    break: 'pauză',
    timeOffRequests: 'Cereri de Concediu',
    requestTimeOff: '+ Solicită Concediu',
    noRequests: 'Nicio cerere de concediu încă',
    pending: 'În așteptare',
    approved: 'Aprobată',
    rejected: 'Respinsă',
    workingDay: 'zi lucrătoare',
    workingDays: 'zile lucrătoare',
    requestTimeOffTitle: 'Solicită Concediu',
    requestSubmitted: 'Cerere trimisă!',
    managerNotified: 'Managerul tău va fi notificat.',
    leaveType: 'Tip Concediu *',
    startDate: 'Data de Început *',
    endDate: 'Data de Sfârșit *',
    workingDaysRequested: 'Zile lucrătoare solicitate',
    excludesWeekends: 'Fără weekenduri',
    medicalCertTitle: 'Certificat Medical Furnizat',
    medicalCertDesc: 'Confirm că am sau voi furniza un certificat medical',
    reasonRequired: 'Motiv *',
    reasonOptional: 'Motiv (opțional)',
    reasonPlaceholderHoliday: 'Adaugă note despre concediul tău...',
    reasonPlaceholder: 'Te rugăm să oferi detalii...',
    pleaseNote: 'Vă rugăm să rețineți:',
    requiresApproval: 'Cererile necesită aprobarea managerului',
    notifyOnReview: 'Vei fi notificat prin email când cererea ta este analizată',
    holidayDeduction: 'Zilele de concediu vor fi deduse din soldul tău când sunt aprobate',
    sickLeaveNote: 'Concediul medical poate necesita o întâlnire la întoarcere',
    cancel: 'Anulează',
    submitRequest: 'Trimite Cererea',
    submitting: 'Se trimite…',
    entitlement: 'Drept',
    daysPerYear: 'zile/an',
    available: 'Disponibile',
    remaining: 'rămase',
    pendingLabel: 'În așteptare',
    awaiting: 'în așteptare',
    errStartRequired: 'Data de început este obligatorie',
    errEndRequired: 'Data de sfârșit este obligatorie',
    errEndAfterStart: 'Data de sfârșit trebuie să fie la sau după data de început',
    errNoPastDates: 'Nu poți solicita concediu pentru date trecute',
    errNoWorkingDays: 'Intervalul selectat nu conține zile lucrătoare',
    errReasonRequired: 'Te rugăm să furnizezi un motiv pentru acest tip de concediu',
    errMedicalCert: 'Te rugăm să confirmi că vei furniza un certificat medical',
    errInsufficientDays: 'Ai doar {available} zile disponibile',
    errFailed: 'Trimitere eșuată',
    ltAnnualHoliday: '🏖️ Concediu Anual (Plătit)',
    ltSickSelfCert: '🤒 Concediu Medical – Auto-certificat',
    ltSickMedicalCert: '🏥 Concediu Medical – Certificat Medical',
    ltUnpaid: '💸 Concediu Fără Plată',
    ltCompassionate: '🕊️ Concediu de Compasiune',
    ltOther: '📋 Altele',
    ldAnnualHoliday: 'Concediu plătit din dreptul tău anual',
    ldSickSelfCert: 'Pentru boală până la 7 zile — nu este necesar certificat medical',
    ldSickMedicalCert: 'Pentru boală peste 7 zile — certificat medical necesar',
    ldUnpaid: 'Timp liber fără plată',
    ldCompassionate: 'Pentru doliu sau urgențe familiale',
    ldOther: 'Alt tip de concediu',
  },
  fr: {
    welcome: 'Bienvenue',
    logOut: 'Déconnexion',
    upcomingShifts: 'Prochains Services',
    thisWeek: 'Cette Semaine',
    pendingTimeOff: 'Congés en Attente',
    mySchedule: 'Mon Planning',
    noUpcomingShifts: 'Aucun service planifié',
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    break: 'pause',
    timeOffRequests: 'Demandes de Congé',
    requestTimeOff: '+ Demander un Congé',
    noRequests: 'Aucune demande de congé pour le moment',
    pending: 'En attente',
    approved: 'Approuvée',
    rejected: 'Refusée',
    workingDay: 'jour ouvrable',
    workingDays: 'jours ouvrables',
    requestTimeOffTitle: 'Demander un Congé',
    requestSubmitted: 'Demande envoyée !',
    managerNotified: 'Votre responsable sera notifié.',
    leaveType: 'Type de Congé *',
    startDate: 'Date de Début *',
    endDate: 'Date de Fin *',
    workingDaysRequested: 'Jours ouvrables demandés',
    excludesWeekends: 'Hors week-ends',
    medicalCertTitle: 'Certificat Médical Fourni',
    medicalCertDesc: 'Je confirme que je fournirai un certificat médical',
    reasonRequired: 'Raison *',
    reasonOptional: 'Raison (optionnel)',
    reasonPlaceholderHoliday: 'Ajoutez des notes sur vos vacances...',
    reasonPlaceholder: 'Veuillez fournir des détails...',
    pleaseNote: 'Veuillez noter :',
    requiresApproval: "Les demandes nécessitent l'approbation du responsable",
    notifyOnReview: 'Vous serez notifié par email lorsque votre demande sera examinée',
    holidayDeduction: 'Les jours de congé seront déduits de votre solde lors de leur approbation',
    sickLeaveNote: "Le congé maladie peut nécessiter un entretien de reprise",
    cancel: 'Annuler',
    submitRequest: 'Soumettre la Demande',
    submitting: 'Envoi en cours…',
    entitlement: 'Droit',
    daysPerYear: 'jours/an',
    available: 'Disponibles',
    remaining: 'restants',
    pendingLabel: 'En attente',
    awaiting: 'en attente',
    errStartRequired: 'La date de début est requise',
    errEndRequired: 'La date de fin est requise',
    errEndAfterStart: 'La date de fin doit être après la date de début',
    errNoPastDates: 'Impossible de demander un congé pour des dates passées',
    errNoWorkingDays: 'La plage sélectionnée ne contient aucun jour ouvrable',
    errReasonRequired: 'Veuillez fournir une raison pour ce type de congé',
    errMedicalCert: 'Veuillez confirmer que vous fournirez un certificat médical',
    errInsufficientDays: "Vous n'avez que {available} jours disponibles",
    errFailed: 'Échec de la soumission',
    ltAnnualHoliday: '🏖️ Congé Annuel (Payé)',
    ltSickSelfCert: '🤒 Congé Maladie – Auto-déclaré',
    ltSickMedicalCert: '🏥 Congé Maladie – Certificat Médical',
    ltUnpaid: '💸 Congé Sans Solde',
    ltCompassionate: '🕊️ Congé pour Raisons Familiales',
    ltOther: '📋 Autre',
    ldAnnualHoliday: 'Congé payé sur votre droit annuel',
    ldSickSelfCert: "Pour maladie jusqu'à 7 jours — aucun certificat médical requis",
    ldSickMedicalCert: 'Pour maladie de plus de 7 jours — certificat médical requis',
    ldUnpaid: 'Temps libre sans rémunération',
    ldCompassionate: 'Pour deuil ou urgences familiales',
    ldOther: 'Autre type de congé',
  },
  it: {
    welcome: 'Benvenuto',
    logOut: 'Esci',
    upcomingShifts: 'Prossimi Turni',
    thisWeek: 'Questa Settimana',
    pendingTimeOff: 'Ferie in Attesa',
    mySchedule: 'Il Mio Orario',
    noUpcomingShifts: 'Nessun turno programmato',
    today: 'Oggi',
    tomorrow: 'Domani',
    break: 'pausa',
    timeOffRequests: 'Richieste di Ferie',
    requestTimeOff: '+ Richiedi Ferie',
    noRequests: 'Nessuna richiesta di ferie ancora',
    pending: 'In attesa',
    approved: 'Approvata',
    rejected: 'Rifiutata',
    workingDay: 'giorno lavorativo',
    workingDays: 'giorni lavorativi',
    requestTimeOffTitle: 'Richiedi Ferie',
    requestSubmitted: 'Richiesta inviata!',
    managerNotified: 'Il tuo responsabile verrà notificato.',
    leaveType: 'Tipo di Congedo *',
    startDate: 'Data di Inizio *',
    endDate: 'Data di Fine *',
    workingDaysRequested: 'Giorni lavorativi richiesti',
    excludesWeekends: 'Esclusi i fine settimana',
    medicalCertTitle: 'Certificato Medico Fornito',
    medicalCertDesc: 'Confermo che fornirò un certificato medico',
    reasonRequired: 'Motivo *',
    reasonOptional: 'Motivo (opzionale)',
    reasonPlaceholderHoliday: 'Aggiungi note sulle tue vacanze...',
    reasonPlaceholder: 'Si prega di fornire dettagli...',
    pleaseNote: 'Si prega di notare:',
    requiresApproval: 'Le richieste richiedono approvazione del responsabile',
    notifyOnReview: 'Sarai notificato via email quando la tua richiesta viene esaminata',
    holidayDeduction: 'I giorni di ferie verranno detratti dal tuo saldo quando approvati',
    sickLeaveNote: 'Il congedo per malattia potrebbe richiedere un colloquio al ritorno',
    cancel: 'Annulla',
    submitRequest: 'Invia Richiesta',
    submitting: 'Invio in corso…',
    entitlement: 'Diritto',
    daysPerYear: 'giorni/anno',
    available: 'Disponibili',
    remaining: 'rimanenti',
    pendingLabel: 'In attesa',
    awaiting: 'in attesa',
    errStartRequired: 'La data di inizio è obbligatoria',
    errEndRequired: 'La data di fine è obbligatoria',
    errEndAfterStart: 'La data di fine deve essere uguale o successiva alla data di inizio',
    errNoPastDates: 'Non è possibile richiedere ferie per date passate',
    errNoWorkingDays: 'Il periodo selezionato non contiene giorni lavorativi',
    errReasonRequired: 'Si prega di fornire un motivo per questo tipo di congedo',
    errMedicalCert: 'Si prega di confermare che si fornirà un certificato medico',
    errInsufficientDays: 'Hai solo {available} giorni disponibili',
    errFailed: 'Invio fallito',
    ltAnnualHoliday: '🏖️ Ferie Annuali (Pagate)',
    ltSickSelfCert: '🤒 Congedo Malattia – Auto-certificato',
    ltSickMedicalCert: '🏥 Congedo Malattia – Certificato Medico',
    ltUnpaid: '💸 Congedo Non Retribuito',
    ltCompassionate: '🕊️ Congedo per Lutto',
    ltOther: '📋 Altro',
    ldAnnualHoliday: 'Ferie pagate dal tuo diritto annuale',
    ldSickSelfCert: 'Per malattia fino a 7 giorni — nessun certificato medico richiesto',
    ldSickMedicalCert: 'Per malattia oltre 7 giorni — certificato medico richiesto',
    ldUnpaid: 'Tempo libero senza retribuzione',
    ldCompassionate: 'Per lutto o emergenze familiari',
    ldOther: 'Altro tipo di congedo',
  },
  es: {
    welcome: 'Bienvenido',
    logOut: 'Cerrar sesión',
    upcomingShifts: 'Próximos Turnos',
    thisWeek: 'Esta Semana',
    pendingTimeOff: 'Vacaciones Pendientes',
    mySchedule: 'Mi Horario',
    noUpcomingShifts: 'No hay turnos programados',
    today: 'Hoy',
    tomorrow: 'Mañana',
    break: 'descanso',
    timeOffRequests: 'Solicitudes de Vacaciones',
    requestTimeOff: '+ Solicitar Vacaciones',
    noRequests: 'Sin solicitudes de vacaciones todavía',
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Denegada',
    workingDay: 'día laborable',
    workingDays: 'días laborables',
    requestTimeOffTitle: 'Solicitar Vacaciones',
    requestSubmitted: '¡Solicitud enviada!',
    managerNotified: 'Tu responsable será notificado.',
    leaveType: 'Tipo de Permiso *',
    startDate: 'Fecha de Inicio *',
    endDate: 'Fecha de Fin *',
    workingDaysRequested: 'Días laborables solicitados',
    excludesWeekends: 'Excluye fines de semana',
    medicalCertTitle: 'Certificado Médico Proporcionado',
    medicalCertDesc: 'Confirmo que proporcionaré un certificado médico',
    reasonRequired: 'Motivo *',
    reasonOptional: 'Motivo (opcional)',
    reasonPlaceholderHoliday: 'Añade notas sobre tus vacaciones...',
    reasonPlaceholder: 'Por favor, proporciona detalles...',
    pleaseNote: 'Por favor, ten en cuenta:',
    requiresApproval: 'Las solicitudes requieren aprobación del responsable',
    notifyOnReview: 'Serás notificado por email cuando tu solicitud sea revisada',
    holidayDeduction: 'Los días de vacaciones se deducirán de tu saldo cuando sean aprobados',
    sickLeaveNote: 'La baja por enfermedad puede requerir una reunión de reincorporación',
    cancel: 'Cancelar',
    submitRequest: 'Enviar Solicitud',
    submitting: 'Enviando…',
    entitlement: 'Derecho',
    daysPerYear: 'días/año',
    available: 'Disponibles',
    remaining: 'restantes',
    pendingLabel: 'Pendiente',
    awaiting: 'en espera',
    errStartRequired: 'La fecha de inicio es obligatoria',
    errEndRequired: 'La fecha de fin es obligatoria',
    errEndAfterStart: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
    errNoPastDates: 'No se puede solicitar vacaciones para fechas pasadas',
    errNoWorkingDays: 'El rango seleccionado no contiene días laborables',
    errReasonRequired: 'Por favor proporciona un motivo para este tipo de permiso',
    errMedicalCert: 'Por favor confirma que proporcionarás un certificado médico',
    errInsufficientDays: 'Solo tienes {available} días disponibles',
    errFailed: 'Error al enviar',
    ltAnnualHoliday: '🏖️ Vacaciones Anuales (Pagadas)',
    ltSickSelfCert: '🤒 Baja por Enfermedad – Autodeclarada',
    ltSickMedicalCert: '🏥 Baja por Enfermedad – Certificado Médico',
    ltUnpaid: '💸 Permiso Sin Sueldo',
    ltCompassionate: '🕊️ Permiso por Duelo',
    ltOther: '📋 Otro',
    ldAnnualHoliday: 'Vacaciones pagadas de tu derecho anual',
    ldSickSelfCert: 'Para enfermedad de hasta 7 días — no se requiere certificado médico',
    ldSickMedicalCert: 'Para enfermedad de más de 7 días — certificado médico requerido',
    ldUnpaid: 'Tiempo libre sin remuneración',
    ldCompassionate: 'Para duelo o emergencias familiares',
    ldOther: 'Otro tipo de permiso',
  },
}

function getT(locale) {
  const normalized = (locale || 'en').split('-')[0].toLowerCase()
  return UI_TRANSLATIONS[normalized] || UI_TRANSLATIONS.en
}

function getLeaveTypes(tr) {
  return [
    { value: 'annual_holiday',   label: tr.ltAnnualHoliday,   description: tr.ldAnnualHoliday,   requiresReason: false },
    { value: 'sick_self_cert',   label: tr.ltSickSelfCert,    description: tr.ldSickSelfCert,    requiresReason: true  },
    { value: 'sick_medical_cert',label: tr.ltSickMedicalCert, description: tr.ldSickMedicalCert, requiresReason: true  },
    { value: 'unpaid',           label: tr.ltUnpaid,          description: tr.ldUnpaid,          requiresReason: true  },
    { value: 'compassionate',    label: tr.ltCompassionate,   description: tr.ldCompassionate,   requiresReason: true  },
    { value: 'other',            label: tr.ltOther,           description: tr.ldOther,           requiresReason: true  },
  ]
}

const STATUS_CONFIG = {
  pending:  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-green-100',  text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { bg: 'bg-red-100',    text: 'text-red-700',   dot: 'bg-red-500'   },
}

function calculateWorkingDays(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (start > end) return 0
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export default function StaffDashboard() {
  const router = useRouter()
  const [staffSession, setStaffSession] = useState(null)
  const [locale, setLocale] = useState('en')
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState([])
  const [timeOffRequests, setTimeOffRequests] = useState([])
  const [leaveBalance, setLeaveBalance] = useState(null)

  // Modal state
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [form, setForm] = useState({ leave_type: 'annual_holiday', date_from: '', date_to: '', reason: '', medical_certificate_provided: false })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const tr = getT(locale)
  const LEAVE_TYPES = getLeaveTypes(tr)
  const workingDays = calculateWorkingDays(form.date_from, form.date_to)

  const fetchData = useCallback(async (session) => {
    const { staff_id, restaurant_id } = session
    try {
      const [shiftsRes, torRes, staffRes] = await Promise.all([
        fetch(`/api/rota/shifts?restaurant_id=${restaurant_id}&staff_id=${staff_id}&date_from=${moment().subtract(1, 'month').format('YYYY-MM-DD')}&date_to=${moment().add(3, 'months').format('YYYY-MM-DD')}`),
        fetch(`/api/rota/requests?restaurant_id=${restaurant_id}&staff_id=${staff_id}&request_type=time_off`),
        fetch(`/api/staff?restaurant_id=${restaurant_id}&staff_id=${staff_id}`),
      ])

      let fetchedRequests = []

      if (shiftsRes.ok) {
        const d = await shiftsRes.json()
        setShifts((d.shifts || []).filter(s => s.staff_id === staff_id))
      }
      if (torRes.ok) {
        const d = await torRes.json()
        fetchedRequests = d.requests || []
        setTimeOffRequests(fetchedRequests)
      }
      if (staffRes.ok) {
        const d = await staffRes.json()
        const entitlement = d.staff?.[0]?.staff_leave_entitlements?.[0]
        if (entitlement) {
          const approvedDays = fetchedRequests.filter(r => r.status === 'approved' && r.leave_type === 'annual_holiday').reduce((s, r) => s + (r.days_requested || 0), 0)
          const pendingDays = fetchedRequests.filter(r => r.status === 'pending' && r.leave_type === 'annual_holiday').reduce((s, r) => s + (r.days_requested || 0), 0)
          setLeaveBalance({
            annual_holiday_days: entitlement.annual_holiday_days,
            holiday_days_remaining: entitlement.annual_holiday_days - approvedDays,
            holiday_days_pending: pendingDays,
          })
        }
      }
    } catch (err) {
      console.error('Error fetching staff dashboard data:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('staff_session')
    if (!raw) { router.push('/staff-login'); return }
    const session = JSON.parse(raw)
    setStaffSession(session)
    // Use locale stored at login time (from restaurant.email_language)
    if (session.locale) setLocale(session.locale)
    fetchData(session)
  }, [router, fetchData])

  const handleLogout = () => {
    localStorage.removeItem('staff_session')
    router.push('/staff-login')
  }

  const openModal = () => {
    setForm({ leave_type: 'annual_holiday', date_from: '', date_to: '', reason: '', medical_certificate_provided: false })
    setFormErrors({})
    setSubmitSuccess(false)
    setShowTimeOffModal(true)
  }

  const validateForm = () => {
    const errs = {}
    if (!form.date_from) errs.date_from = tr.errStartRequired
    if (!form.date_to) errs.date_to = tr.errEndRequired
    if (form.date_from && form.date_to && form.date_from > form.date_to) errs.date_to = tr.errEndAfterStart
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (form.date_from && new Date(form.date_from) < today) errs.date_from = tr.errNoPastDates
    if (workingDays === 0 && form.date_from && form.date_to) errs.days = tr.errNoWorkingDays
    const leaveType = LEAVE_TYPES.find(l => l.value === form.leave_type)
    if (leaveType?.requiresReason && !form.reason.trim()) errs.reason = tr.errReasonRequired
    if (form.leave_type === 'sick_medical_cert' && !form.medical_certificate_provided) errs.medical = tr.errMedicalCert
    if (form.leave_type === 'annual_holiday' && leaveBalance) {
      const available = (leaveBalance.holiday_days_remaining || 0) - (leaveBalance.holiday_days_pending || 0)
      if (workingDays > available) errs.days = tr.errInsufficientDays.replace('{available}', available.toFixed(1))
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/rota/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: staffSession.restaurant_id,
          staff_id: staffSession.staff_id,
          request_type: 'time_off',
          date_from: form.date_from,
          date_to: form.date_to,
          reason: form.reason,
          leave_type: form.leave_type,
          days_requested: workingDays,
          medical_certificate_provided: form.medical_certificate_provided,
        })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || tr.errFailed) }
      setSubmitSuccess(true)
      await fetchData(staffSession)
      setTimeout(() => setShowTimeOffModal(false), 1800)
    } catch (err) {
      setFormErrors(prev => ({ ...prev, submit: err.message }))
    }
    setSubmitting(false)
  }

  const leaveTypeInfo = LEAVE_TYPES.find(l => l.value === form.leave_type) || LEAVE_TYPES[0]

  const upcomingShifts = shifts.filter(s => moment(s.date).isSameOrAfter(moment(), 'day')).length
  const thisWeekShifts = shifts.filter(s => moment(s.date).isBetween(moment().startOf('isoWeek'), moment().endOf('isoWeek'), 'day', '[]')).length
  const pendingTimeOff = timeOffRequests.filter(r => r.status === 'pending').length

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6262bd]" />
      </div>
    )
  }

  if (!staffSession) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{tr.welcome}, {staffSession.name}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{staffSession.role} · {staffSession.restaurant_name}</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-sm transition-colors">
            {tr.logOut}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: tr.upcomingShifts, value: upcomingShifts, color: 'text-[#6262bd]' },
            { label: tr.thisWeek, value: thisWeekShifts, color: 'text-[#6262bd]' },
            { label: tr.pendingTimeOff, value: pendingTimeOff, color: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 leading-tight">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Upcoming Shifts */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">{tr.mySchedule}</h2>
          {shifts.filter(s => moment(s.date).isSameOrAfter(moment(), 'day')).length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-sm font-medium">{tr.noUpcomingShifts}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shifts
                .filter(s => moment(s.date).isSameOrAfter(moment(), 'day'))
                .slice(0, 10)
                .map(shift => {
                  const isToday = moment(shift.date).isSame(moment(), 'day')
                  const isTomorrow = moment(shift.date).isSame(moment().add(1, 'day'), 'day')
                  const dayLabel = isToday ? tr.today : isTomorrow ? tr.tomorrow : moment(shift.date).format('ddd D MMM')
                  return (
                    <div key={shift.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl ${isToday ? 'bg-[#6262bd]/10 border-2 border-[#6262bd]/30' : 'bg-slate-50 dark:bg-slate-800 border-2 border-transparent'}`}>
                      <div className="flex-shrink-0 text-center min-w-[60px]">
                        <p className={`text-xs font-bold ${isToday ? 'text-[#6262bd]' : 'text-slate-400 dark:text-slate-500'}`}>{dayLabel}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{shift.shift_start} – {shift.shift_end}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{shift.role_required}{shift.break_duration ? ` · ${shift.break_duration}min ${tr.break}` : ''}</p>
                      </div>
                      {isToday && <span className="text-xs font-bold bg-[#6262bd] text-white px-2 py-0.5 rounded-full flex-shrink-0">{tr.today}</span>}
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Time-Off Requests */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{tr.timeOffRequests}</h2>
            <button onClick={openModal} className="bg-[#6262bd] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#5252a3] transition-colors">
              {tr.requestTimeOff}
            </button>
          </div>

          {timeOffRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <div className="text-4xl mb-2">🌴</div>
              <p className="text-sm font-medium">{tr.noRequests}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeOffRequests.map(req => {
                const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
                const statusLabel = req.status === 'pending' ? tr.pending : req.status === 'approved' ? tr.approved : tr.rejected
                return (
                  <div key={req.id} className={`border-2 rounded-xl p-4 ${req.status === 'pending' ? 'border-amber-200 dark:border-amber-800' : req.status === 'approved' ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {moment(req.date_from).format('D MMM YYYY')} – {moment(req.date_to).format('D MMM YYYY')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {req.days_requested ? `${req.days_requested} ${req.days_requested !== 1 ? tr.workingDays : tr.workingDay}` : ''}
                          {req.leave_type ? ` · ${req.leave_type.replace(/_/g, ' ')}` : ''}
                        </p>
                        {req.reason && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">"{req.reason}"</p>}
                        {req.status === 'rejected' && req.rejection_reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">✕ {req.rejection_reason}</p>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowTimeOffModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            <div className="px-6 py-4 border-b-2 border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{tr.requestTimeOffTitle}</h2>
              <button onClick={() => setShowTimeOffModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xl font-bold transition-colors">×</button>
            </div>

            {submitSuccess ? (
              <div className="px-6 py-12 text-center">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{tr.requestSubmitted}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tr.managerNotified}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

                {/* Leave balance */}
                {leaveBalance && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">{tr.entitlement}</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{leaveBalance.annual_holiday_days}</p>
                      <p className="text-xs text-blue-500 dark:text-blue-400">{tr.daysPerYear}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-100 dark:border-green-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-0.5">{tr.available}</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {((leaveBalance.holiday_days_remaining || 0) - (leaveBalance.holiday_days_pending || 0)).toFixed(1)}
                      </p>
                      <p className="text-xs text-green-500 dark:text-green-400">{tr.remaining}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-0.5">{tr.pendingLabel}</p>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{(leaveBalance.holiday_days_pending || 0).toFixed(1)}</p>
                      <p className="text-xs text-amber-500 dark:text-amber-400">{tr.awaiting}</p>
                    </div>
                  </div>
                )}

                {/* Leave type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{tr.leaveType}</label>
                  <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 text-sm">
                    {LEAVE_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <div className="mt-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{leaveTypeInfo.description}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{tr.startDate}</label>
                    <input type="date" value={form.date_from} min={new Date().toISOString().split('T')[0]}
                      onChange={e => { setForm(f => ({ ...f, date_from: e.target.value })); setFormErrors(p => ({ ...p, date_from: undefined })) }}
                      className={`w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 ${formErrors.date_from ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`} />
                    {formErrors.date_from && <p className="mt-1 text-xs text-red-500">{formErrors.date_from}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{tr.endDate}</label>
                    <input type="date" value={form.date_to} min={form.date_from || new Date().toISOString().split('T')[0]}
                      onChange={e => { setForm(f => ({ ...f, date_to: e.target.value })); setFormErrors(p => ({ ...p, date_to: undefined })) }}
                      className={`w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 ${formErrors.date_to ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`} />
                    {formErrors.date_to && <p className="mt-1 text-xs text-red-500">{formErrors.date_to}</p>}
                  </div>
                </div>

                {/* Working days */}
                {workingDays > 0 && (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${formErrors.days ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{tr.workingDaysRequested}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{tr.excludesWeekends}</p>
                      {formErrors.days && <p className="text-xs text-red-500 mt-0.5">{formErrors.days}</p>}
                    </div>
                    <p className={`text-3xl font-bold ${formErrors.days ? 'text-red-500' : 'text-[#6262bd]'}`}>{workingDays}</p>
                  </div>
                )}

                {/* Medical cert */}
                {form.leave_type === 'sick_medical_cert' && (
                  <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer ${formErrors.medical ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'} hover:border-[#6262bd] transition-colors`}>
                    <input type="checkbox" checked={form.medical_certificate_provided}
                      onChange={e => { setForm(f => ({ ...f, medical_certificate_provided: e.target.checked })); setFormErrors(p => ({ ...p, medical: undefined })) }}
                      className="w-5 h-5 mt-0.5 text-[#6262bd] rounded" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{tr.medicalCertTitle}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{tr.medicalCertDesc}</p>
                      {formErrors.medical && <p className="text-xs text-red-500 mt-0.5">{formErrors.medical}</p>}
                    </div>
                  </label>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {leaveTypeInfo.requiresReason ? tr.reasonRequired : tr.reasonOptional}
                  </label>
                  <textarea rows={3} value={form.reason}
                    onChange={e => { setForm(f => ({ ...f, reason: e.target.value })); setFormErrors(p => ({ ...p, reason: undefined })) }}
                    placeholder={form.leave_type === 'annual_holiday' ? tr.reasonPlaceholderHoliday : tr.reasonPlaceholder}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 resize-none ${formErrors.reason ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`} />
                  {formErrors.reason && <p className="mt-1 text-xs text-red-500">{formErrors.reason}</p>}
                </div>

                {/* Info box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1.5">{tr.pleaseNote}</p>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• {tr.requiresApproval}</li>
                    <li>• {tr.notifyOnReview}</li>
                    {form.leave_type === 'annual_holiday' && <li>• {tr.holidayDeduction}</li>}
                    {form.leave_type.startsWith('sick_') && <li>• {tr.sickLeaveNote}</li>}
                  </ul>
                </div>

                {formErrors.submit && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-400">
                    {formErrors.submit}
                  </div>
                )}

                <div className="flex gap-3 pb-2">
                  <button type="button" onClick={() => setShowTimeOffModal(false)}
                    className="flex-1 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                    {tr.cancel}
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-colors disabled:opacity-50 text-sm">
                    {submitting ? tr.submitting : tr.submitRequest}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
