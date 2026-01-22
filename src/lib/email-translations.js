// Email translations for use in Edge API routes
// These are embedded directly since Edge runtime can't use fs to read JSON files

const emailTranslations = {
  en: {
    // Takeaway Order Confirmation
    takeawayOrderConfirmed: "Takeaway Order Confirmed!",
    takeawayThankYou: "Thank you for your order, {customerName}",
    yourPickupCode: "Your Pickup Code",
    showCodeToCollect: "Show this code when collecting your order",
    orderDetails: "Order Details",
    orderNumber: "Order",
    item: "Item",
    qty: "Qty",
    price: "Price",
    total: "Total",
    specialRequests: "Special Requests",
    whatsNext: "What's next?",
    whatsNextDescription: "We'll send you another email when your order is ready for pickup. Payment will be collected in cash when you arrive.",
    pickupLocation: "Pickup Location",
    phone: "Phone",
    automatedMessage: "This is an automated email, please do not reply.",
    takeawayOrder: "Takeaway Order",

    // Takeaway Ready for Pickup
    orderReady: "Your Order is Ready!",
    orderReadyGreeting: "Time to pick up your food, {customerName}!",
    orderReadyBanner: "Your takeaway order is ready for collection!",
    yourOrder: "Your Order",
    totalCash: "Total (Cash)",

    // Reservation Confirmed
    reservationConfirmed: "Reservation Confirmed!",
    reservationConfirmedAt: "Reservation Confirmed at {restaurantName}",
    dearCustomer: "Dear {customerName},",
    reservationConfirmedMessage: "Great news! Your reservation at {restaurantName} has been confirmed.",
    date: "Date",
    time: "Time",
    partySize: "Party Size",
    guest: "guest",
    guests: "guests",
    table: "Table",
    toBeAssigned: "To be assigned",
    arriveWithin15: "Please arrive within 15 minutes of your reservation time.",
    lookForwardToServing: "We look forward to serving you!",
    needToCancel: "If you need to cancel your reservation, please use the link below:",
    cancelReservation: "Cancel Reservation",

    // Reservation Pending
    reservationRequestReceived: "Reservation Request Received",
    reservationRequestReceivedAt: "Reservation Request Received - {restaurantName}",
    receivedRequestMessage: "We've received your reservation request at {restaurantName}.",
    pendingApproval: "Pending Approval",
    pendingApprovalMessage: "Your reservation is awaiting confirmation from the restaurant. You'll receive another email once it's been approved.",
    cancelRequest: "Cancel Request",

    // Reservation Cancelled
    reservationCancelled: "Reservation Cancelled",
    reservationCancelledAt: "Reservation Cancelled - {restaurantName}",
    reservationCancelledMessage: "Your reservation at {restaurantName} has been cancelled.",
    originalDate: "Original Date",
    originalTime: "Original Time",
    reason: "Reason",
    wasThisIncorrect: "Was this incorrect?",
    cancellationErrorMessage: "If you believe this cancellation was made in error, please contact us at {phone} as soon as possible.",
    theRestaurantDirectly: "the restaurant directly",
    hopeToSeeYou: "We hope to see you at {restaurantName} in the future!",
    automatedMessageFrom: "This is an automated message from {restaurantName}"
  },

  ro: {
    // Takeaway Order Confirmation
    takeawayOrderConfirmed: "Comanda La Pachet Confirmată!",
    takeawayThankYou: "Mulțumim pentru comanda ta, {customerName}",
    yourPickupCode: "Codul Tău de Ridicare",
    showCodeToCollect: "Arată acest cod când ridici comanda",
    orderDetails: "Detalii Comandă",
    orderNumber: "Comandă",
    item: "Produs",
    qty: "Cant.",
    price: "Preț",
    total: "Total",
    specialRequests: "Cerințe Speciale",
    whatsNext: "Ce urmează?",
    whatsNextDescription: "Îți vom trimite un alt email când comanda ta este gata de ridicare. Plata se va face în numerar la sosire.",
    pickupLocation: "Locație Ridicare",
    phone: "Telefon",
    automatedMessage: "Acesta este un email automat, vă rugăm să nu răspundeți.",
    takeawayOrder: "Comandă La Pachet",

    // Takeaway Ready for Pickup
    orderReady: "Comanda Ta Este Gata!",
    orderReadyGreeting: "E timpul să îți ridici mâncarea, {customerName}!",
    orderReadyBanner: "Comanda ta la pachet este gata de ridicare!",
    yourOrder: "Comanda Ta",
    totalCash: "Total (Numerar)",

    // Reservation Confirmed
    reservationConfirmed: "Rezervare Confirmată!",
    reservationConfirmedAt: "Rezervare Confirmată la {restaurantName}",
    dearCustomer: "Dragă {customerName},",
    reservationConfirmedMessage: "Vești bune! Rezervarea ta la {restaurantName} a fost confirmată.",
    date: "Data",
    time: "Ora",
    partySize: "Număr Persoane",
    guest: "persoană",
    guests: "persoane",
    table: "Masă",
    toBeAssigned: "Va fi alocată",
    arriveWithin15: "Vă rugăm să ajungeți în termen de 15 minute de la ora rezervării.",
    lookForwardToServing: "Abia așteptăm să vă servim!",
    needToCancel: "Dacă trebuie să anulați rezervarea, vă rugăm să folosiți linkul de mai jos:",
    cancelReservation: "Anulare Rezervare",

    // Reservation Pending
    reservationRequestReceived: "Cerere de Rezervare Primită",
    reservationRequestReceivedAt: "Cerere de Rezervare Primită - {restaurantName}",
    receivedRequestMessage: "Am primit cererea ta de rezervare la {restaurantName}.",
    pendingApproval: "În Așteptare",
    pendingApprovalMessage: "Rezervarea ta așteaptă confirmarea de la restaurant. Vei primi un alt email odată ce aceasta a fost aprobată.",
    cancelRequest: "Anulează Cererea",

    // Reservation Cancelled
    reservationCancelled: "Rezervare Anulată",
    reservationCancelledAt: "Rezervare Anulată - {restaurantName}",
    reservationCancelledMessage: "Rezervarea ta la {restaurantName} a fost anulată.",
    originalDate: "Data Originală",
    originalTime: "Ora Originală",
    reason: "Motiv",
    wasThisIncorrect: "A fost aceasta o greșeală?",
    cancellationErrorMessage: "Dacă crezi că această anulare a fost făcută din greșeală, te rugăm să ne contactezi la {phone} cât mai curând posibil.",
    theRestaurantDirectly: "direct restaurantul",
    hopeToSeeYou: "Sperăm să te vedem la {restaurantName} în viitor!",
    automatedMessageFrom: "Acesta este un mesaj automat de la {restaurantName}"
  },

  fr: {
    // Takeaway Order Confirmation
    takeawayOrderConfirmed: "Commande à Emporter Confirmée!",
    takeawayThankYou: "Merci pour votre commande, {customerName}",
    yourPickupCode: "Votre Code de Retrait",
    showCodeToCollect: "Montrez ce code lors du retrait de votre commande",
    orderDetails: "Détails de la Commande",
    orderNumber: "Commande",
    item: "Article",
    qty: "Qté",
    price: "Prix",
    total: "Total",
    specialRequests: "Demandes Spéciales",
    whatsNext: "Et après?",
    whatsNextDescription: "Nous vous enverrons un autre email quand votre commande sera prête. Le paiement sera effectué en espèces à votre arrivée.",
    pickupLocation: "Lieu de Retrait",
    phone: "Téléphone",
    automatedMessage: "Ceci est un email automatique, merci de ne pas répondre.",
    takeawayOrder: "Commande à Emporter",

    // Takeaway Ready for Pickup
    orderReady: "Votre Commande Est Prête!",
    orderReadyGreeting: "C'est l'heure de récupérer votre repas, {customerName}!",
    orderReadyBanner: "Votre commande à emporter est prête à être récupérée!",
    yourOrder: "Votre Commande",
    totalCash: "Total (Espèces)",

    // Reservation Confirmed
    reservationConfirmed: "Réservation Confirmée!",
    reservationConfirmedAt: "Réservation Confirmée chez {restaurantName}",
    dearCustomer: "Cher/Chère {customerName},",
    reservationConfirmedMessage: "Bonne nouvelle! Votre réservation chez {restaurantName} a été confirmée.",
    date: "Date",
    time: "Heure",
    partySize: "Nombre de Personnes",
    guest: "personne",
    guests: "personnes",
    table: "Table",
    toBeAssigned: "À attribuer",
    arriveWithin15: "Veuillez arriver dans les 15 minutes suivant l'heure de votre réservation.",
    lookForwardToServing: "Nous avons hâte de vous servir!",
    needToCancel: "Si vous devez annuler votre réservation, veuillez utiliser le lien ci-dessous:",
    cancelReservation: "Annuler la Réservation",

    // Reservation Pending
    reservationRequestReceived: "Demande de Réservation Reçue",
    reservationRequestReceivedAt: "Demande de Réservation Reçue - {restaurantName}",
    receivedRequestMessage: "Nous avons reçu votre demande de réservation chez {restaurantName}.",
    pendingApproval: "En Attente d'Approbation",
    pendingApprovalMessage: "Votre réservation est en attente de confirmation du restaurant. Vous recevrez un autre email une fois approuvée.",
    cancelRequest: "Annuler la Demande",

    // Reservation Cancelled
    reservationCancelled: "Réservation Annulée",
    reservationCancelledAt: "Réservation Annulée - {restaurantName}",
    reservationCancelledMessage: "Votre réservation chez {restaurantName} a été annulée.",
    originalDate: "Date Originale",
    originalTime: "Heure Originale",
    reason: "Raison",
    wasThisIncorrect: "Était-ce une erreur?",
    cancellationErrorMessage: "Si vous pensez que cette annulation a été faite par erreur, veuillez nous contacter au {phone} dès que possible.",
    theRestaurantDirectly: "directement le restaurant",
    hopeToSeeYou: "Nous espérons vous voir chez {restaurantName} à l'avenir!",
    automatedMessageFrom: "Ceci est un message automatique de {restaurantName}"
  },

  it: {
    // Takeaway Order Confirmation
    takeawayOrderConfirmed: "Ordine da Asporto Confermato!",
    takeawayThankYou: "Grazie per il tuo ordine, {customerName}",
    yourPickupCode: "Il Tuo Codice di Ritiro",
    showCodeToCollect: "Mostra questo codice quando ritiri l'ordine",
    orderDetails: "Dettagli Ordine",
    orderNumber: "Ordine",
    item: "Articolo",
    qty: "Qtà",
    price: "Prezzo",
    total: "Totale",
    specialRequests: "Richieste Speciali",
    whatsNext: "Cosa succede dopo?",
    whatsNextDescription: "Ti invieremo un'altra email quando il tuo ordine sarà pronto. Il pagamento sarà effettuato in contanti all'arrivo.",
    pickupLocation: "Luogo di Ritiro",
    phone: "Telefono",
    automatedMessage: "Questa è un'email automatica, si prega di non rispondere.",
    takeawayOrder: "Ordine da Asporto",

    // Takeaway Ready for Pickup
    orderReady: "Il Tuo Ordine È Pronto!",
    orderReadyGreeting: "È ora di ritirare il tuo cibo, {customerName}!",
    orderReadyBanner: "Il tuo ordine da asporto è pronto per il ritiro!",
    yourOrder: "Il Tuo Ordine",
    totalCash: "Totale (Contanti)",

    // Reservation Confirmed
    reservationConfirmed: "Prenotazione Confermata!",
    reservationConfirmedAt: "Prenotazione Confermata presso {restaurantName}",
    dearCustomer: "Caro/a {customerName},",
    reservationConfirmedMessage: "Ottime notizie! La tua prenotazione presso {restaurantName} è stata confermata.",
    date: "Data",
    time: "Ora",
    partySize: "Numero di Persone",
    guest: "persona",
    guests: "persone",
    table: "Tavolo",
    toBeAssigned: "Da assegnare",
    arriveWithin15: "Si prega di arrivare entro 15 minuti dall'orario della prenotazione.",
    lookForwardToServing: "Non vediamo l'ora di servirvi!",
    needToCancel: "Se devi cancellare la prenotazione, usa il link qui sotto:",
    cancelReservation: "Cancella Prenotazione",

    // Reservation Pending
    reservationRequestReceived: "Richiesta di Prenotazione Ricevuta",
    reservationRequestReceivedAt: "Richiesta di Prenotazione Ricevuta - {restaurantName}",
    receivedRequestMessage: "Abbiamo ricevuto la tua richiesta di prenotazione presso {restaurantName}.",
    pendingApproval: "In Attesa di Approvazione",
    pendingApprovalMessage: "La tua prenotazione è in attesa di conferma dal ristorante. Riceverai un'altra email una volta approvata.",
    cancelRequest: "Cancella Richiesta",

    // Reservation Cancelled
    reservationCancelled: "Prenotazione Cancellata",
    reservationCancelledAt: "Prenotazione Cancellata - {restaurantName}",
    reservationCancelledMessage: "La tua prenotazione presso {restaurantName} è stata cancellata.",
    originalDate: "Data Originale",
    originalTime: "Ora Originale",
    reason: "Motivo",
    wasThisIncorrect: "È stato un errore?",
    cancellationErrorMessage: "Se ritieni che questa cancellazione sia stata fatta per errore, contattaci al {phone} il prima possibile.",
    theRestaurantDirectly: "direttamente il ristorante",
    hopeToSeeYou: "Speriamo di vederti presso {restaurantName} in futuro!",
    automatedMessageFrom: "Questo è un messaggio automatico da {restaurantName}"
  },

  es: {
    // Takeaway Order Confirmation
    takeawayOrderConfirmed: "¡Pedido Para Llevar Confirmado!",
    takeawayThankYou: "Gracias por tu pedido, {customerName}",
    yourPickupCode: "Tu Código de Recogida",
    showCodeToCollect: "Muestra este código al recoger tu pedido",
    orderDetails: "Detalles del Pedido",
    orderNumber: "Pedido",
    item: "Artículo",
    qty: "Cant.",
    price: "Precio",
    total: "Total",
    specialRequests: "Solicitudes Especiales",
    whatsNext: "¿Qué sigue?",
    whatsNextDescription: "Te enviaremos otro email cuando tu pedido esté listo. El pago se realizará en efectivo a tu llegada.",
    pickupLocation: "Lugar de Recogida",
    phone: "Teléfono",
    automatedMessage: "Este es un email automático, por favor no responda.",
    takeawayOrder: "Pedido Para Llevar",

    // Takeaway Ready for Pickup
    orderReady: "¡Tu Pedido Está Listo!",
    orderReadyGreeting: "¡Es hora de recoger tu comida, {customerName}!",
    orderReadyBanner: "¡Tu pedido para llevar está listo para recoger!",
    yourOrder: "Tu Pedido",
    totalCash: "Total (Efectivo)",

    // Reservation Confirmed
    reservationConfirmed: "¡Reserva Confirmada!",
    reservationConfirmedAt: "Reserva Confirmada en {restaurantName}",
    dearCustomer: "Estimado/a {customerName},",
    reservationConfirmedMessage: "¡Buenas noticias! Tu reserva en {restaurantName} ha sido confirmada.",
    date: "Fecha",
    time: "Hora",
    partySize: "Número de Personas",
    guest: "persona",
    guests: "personas",
    table: "Mesa",
    toBeAssigned: "Por asignar",
    arriveWithin15: "Por favor llegue dentro de los 15 minutos de su hora de reserva.",
    lookForwardToServing: "¡Esperamos poder servirle!",
    needToCancel: "Si necesita cancelar su reserva, utilice el enlace a continuación:",
    cancelReservation: "Cancelar Reserva",

    // Reservation Pending
    reservationRequestReceived: "Solicitud de Reserva Recibida",
    reservationRequestReceivedAt: "Solicitud de Reserva Recibida - {restaurantName}",
    receivedRequestMessage: "Hemos recibido tu solicitud de reserva en {restaurantName}.",
    pendingApproval: "Pendiente de Aprobación",
    pendingApprovalMessage: "Tu reserva está pendiente de confirmación del restaurante. Recibirás otro email una vez aprobada.",
    cancelRequest: "Cancelar Solicitud",

    // Reservation Cancelled
    reservationCancelled: "Reserva Cancelada",
    reservationCancelledAt: "Reserva Cancelada - {restaurantName}",
    reservationCancelledMessage: "Tu reserva en {restaurantName} ha sido cancelada.",
    originalDate: "Fecha Original",
    originalTime: "Hora Original",
    reason: "Motivo",
    wasThisIncorrect: "¿Fue esto un error?",
    cancellationErrorMessage: "Si crees que esta cancelación fue hecha por error, contáctanos al {phone} lo antes posible.",
    theRestaurantDirectly: "directamente al restaurante",
    hopeToSeeYou: "¡Esperamos verte en {restaurantName} en el futuro!",
    automatedMessageFrom: "Este es un mensaje automático de {restaurantName}"
  }
}

/**
 * Get email translations for a specific locale
 * @param {string} locale - The locale code (en, ro, fr, it, es)
 * @returns {object} - Translation strings for the locale
 */
export function getEmailTranslations(locale = 'en') {
  // Normalize locale (handle cases like 'en-US' -> 'en')
  const normalizedLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  return emailTranslations[normalizedLocale] || emailTranslations.en
}

/**
 * Replace placeholders in a translation string
 * @param {string} template - The template string with {placeholder} syntax
 * @param {object} values - Object with key-value pairs to replace
 * @returns {string} - The string with placeholders replaced
 */
export function t(template, values = {}) {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match
  })
}

/**
 * Format date according to locale
 * @param {string} dateStr - ISO date string
 * @param {string} locale - Locale code
 * @returns {string} - Formatted date string
 */
export function formatDateForLocale(dateStr, locale = 'en') {
  const localeMap = {
    en: 'en-US',
    ro: 'ro-RO',
    fr: 'fr-FR',
    it: 'it-IT',
    es: 'es-ES'
  }
  const normalizedLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  const fullLocale = localeMap[normalizedLocale] || 'en-US'

  return new Date(dateStr).toLocaleDateString(fullLocale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default emailTranslations
