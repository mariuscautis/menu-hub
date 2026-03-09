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
    restaurantLocation: "Restaurant Location",
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
    automatedMessageFrom: "This is an automated message from {restaurantName}",

    // Shift Published (staff notification)
    shiftPublishedSubject: "Your new shifts are now available — {restaurantName}",
    shiftPublishedTitle: "Your Rota Has Been Updated",
    shiftPublishedGreeting: "Hi {staffName},",
    shiftPublishedIntro: "Great news! Your upcoming shifts at {restaurantName} have been published and are now available for you to view.",
    shiftPublishedDetails: "Shift Details",
    shiftPublishedDate: "Date",
    shiftPublishedTime: "Time",
    shiftPublishedRole: "Role",
    shiftPublishedBreak: "Break",
    shiftPublishedMinutes: "min",
    shiftPublishedCta: "View My Rota",
    shiftPublishedOutro: "If you have any questions about your schedule, please speak to your manager.",
    shiftPublishedFooter: "This is an automated message from {restaurantName}. Please do not reply to this email.",

    // Time-Off Request (manager notification)
    timeOffRequestSubject: "New Time-Off Request from {staffName} — {restaurantName}",
    timeOffRequestTitle: "New Time-Off Request",
    timeOffRequestGreeting: "Hello,",
    timeOffRequestIntro: "A new time-off request has been submitted and is awaiting your review.",
    timeOffRequestFrom: "Staff Member",
    timeOffRequestType: "Leave Type",
    timeOffRequestDates: "Requested Dates",
    timeOffRequestDays: "Duration",
    timeOffRequestDaysUnit: "day(s)",
    timeOffRequestReason: "Reason",
    timeOffRequestCta: "Review Request",
    timeOffRequestOutro: "Please log in to your dashboard to approve or decline this request.",
    timeOffRequestFooter: "This is an automated notification from {restaurantName}.",

    // Request Approved (staff notification)
    requestApprovedSubject: "Your leave request has been approved — {restaurantName}",
    requestApprovedTitle: "Leave Request Approved",
    requestApprovedGreeting: "Hi {staffName},",
    requestApprovedBody: "Great news! Your time-off request from {dateFrom} to {dateTo} has been approved.",
    requestApprovedCta: "View My Rota",
    requestApprovedFooter: "This is an automated message from {restaurantName}. Please do not reply.",

    // Request Rejected (staff notification)
    requestRejectedSubject: "Your leave request was declined — {restaurantName}",
    requestRejectedTitle: "Leave Request Declined",
    requestRejectedGreeting: "Hi {staffName},",
    requestRejectedBody: "Unfortunately, your time-off request from {dateFrom} to {dateTo} was declined.",
    requestRejectedReason: "Reason",
    requestRejectedCta: "View My Rota",
    requestRejectedFooter: "This is an automated message from {restaurantName}. Please do not reply."
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
    restaurantLocation: "Locația Restaurantului",
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
    automatedMessageFrom: "Acesta este un mesaj automat de la {restaurantName}",

    // Shift Published (staff notification)
    shiftPublishedSubject: "Turele tale sunt acum disponibile — {restaurantName}",
    shiftPublishedTitle: "Programul Tău a Fost Actualizat",
    shiftPublishedGreeting: "Salut {staffName},",
    shiftPublishedIntro: "Vești bune! Turele tale viitoare la {restaurantName} au fost publicate și sunt acum disponibile pentru vizualizare.",
    shiftPublishedDetails: "Detalii Tură",
    shiftPublishedDate: "Data",
    shiftPublishedTime: "Ora",
    shiftPublishedRole: "Rol",
    shiftPublishedBreak: "Pauză",
    shiftPublishedMinutes: "min",
    shiftPublishedCta: "Vezi Programul Meu",
    shiftPublishedOutro: "Dacă ai întrebări despre programul tău, te rugăm să discuți cu managerul tău.",
    shiftPublishedFooter: "Acesta este un mesaj automat de la {restaurantName}. Te rugăm să nu răspunzi la acest email.",

    // Time-Off Request (manager notification)
    timeOffRequestSubject: "Cerere nouă de concediu de la {staffName} — {restaurantName}",
    timeOffRequestTitle: "Cerere Nouă de Concediu",
    timeOffRequestGreeting: "Bună ziua,",
    timeOffRequestIntro: "O nouă cerere de concediu a fost trimisă și așteaptă revizuirea dumneavoastră.",
    timeOffRequestFrom: "Angajat",
    timeOffRequestType: "Tip Concediu",
    timeOffRequestDates: "Date Solicitate",
    timeOffRequestDays: "Durată",
    timeOffRequestDaysUnit: "zi(le)",
    timeOffRequestReason: "Motiv",
    timeOffRequestCta: "Revizuiește Cererea",
    timeOffRequestOutro: "Vă rugăm să vă conectați la tabloul de bord pentru a aproba sau respinge această cerere.",
    timeOffRequestFooter: "Aceasta este o notificare automată de la {restaurantName}.",

    requestApprovedSubject: "Cererea ta de concediu a fost aprobată — {restaurantName}",
    requestApprovedTitle: "Cerere de Concediu Aprobată",
    requestApprovedGreeting: "Salut {staffName},",
    requestApprovedBody: "Vești bune! Cererea ta de concediu din {dateFrom} până în {dateTo} a fost aprobată.",
    requestApprovedCta: "Vezi Programul Meu",
    requestApprovedFooter: "Acesta este un mesaj automat de la {restaurantName}. Te rugăm să nu răspunzi.",

    requestRejectedSubject: "Cererea ta de concediu a fost respinsă — {restaurantName}",
    requestRejectedTitle: "Cerere de Concediu Respinsă",
    requestRejectedGreeting: "Salut {staffName},",
    requestRejectedBody: "Din păcate, cererea ta de concediu din {dateFrom} până în {dateTo} a fost respinsă.",
    requestRejectedReason: "Motiv",
    requestRejectedCta: "Vezi Programul Meu",
    requestRejectedFooter: "Acesta este un mesaj automat de la {restaurantName}. Te rugăm să nu răspunzi."
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
    restaurantLocation: "Emplacement du Restaurant",
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
    automatedMessageFrom: "Ceci est un message automatique de {restaurantName}",

    // Shift Published (staff notification)
    shiftPublishedSubject: "Vos nouveaux horaires sont disponibles — {restaurantName}",
    shiftPublishedTitle: "Votre Planning a Été Mis à Jour",
    shiftPublishedGreeting: "Bonjour {staffName},",
    shiftPublishedIntro: "Bonne nouvelle ! Vos prochains horaires chez {restaurantName} ont été publiés et sont maintenant disponibles.",
    shiftPublishedDetails: "Détails du Service",
    shiftPublishedDate: "Date",
    shiftPublishedTime: "Heure",
    shiftPublishedRole: "Poste",
    shiftPublishedBreak: "Pause",
    shiftPublishedMinutes: "min",
    shiftPublishedCta: "Voir Mon Planning",
    shiftPublishedOutro: "Si vous avez des questions concernant votre planning, veuillez en parler à votre responsable.",
    shiftPublishedFooter: "Ceci est un message automatique de {restaurantName}. Merci de ne pas répondre à cet email.",

    // Time-Off Request (manager notification)
    timeOffRequestSubject: "Nouvelle demande de congé de {staffName} — {restaurantName}",
    timeOffRequestTitle: "Nouvelle Demande de Congé",
    timeOffRequestGreeting: "Bonjour,",
    timeOffRequestIntro: "Une nouvelle demande de congé a été soumise et attend votre examen.",
    timeOffRequestFrom: "Employé",
    timeOffRequestType: "Type de Congé",
    timeOffRequestDates: "Dates Demandées",
    timeOffRequestDays: "Durée",
    timeOffRequestDaysUnit: "jour(s)",
    timeOffRequestReason: "Raison",
    timeOffRequestCta: "Examiner la Demande",
    timeOffRequestOutro: "Veuillez vous connecter à votre tableau de bord pour approuver ou refuser cette demande.",
    timeOffRequestFooter: "Ceci est une notification automatique de {restaurantName}.",

    requestApprovedSubject: "Votre demande de congé a été approuvée — {restaurantName}",
    requestApprovedTitle: "Demande de Congé Approuvée",
    requestApprovedGreeting: "Bonjour {staffName},",
    requestApprovedBody: "Bonne nouvelle ! Votre demande de congé du {dateFrom} au {dateTo} a été approuvée.",
    requestApprovedCta: "Voir Mon Planning",
    requestApprovedFooter: "Ceci est un message automatique de {restaurantName}. Merci de ne pas répondre.",

    requestRejectedSubject: "Votre demande de congé a été refusée — {restaurantName}",
    requestRejectedTitle: "Demande de Congé Refusée",
    requestRejectedGreeting: "Bonjour {staffName},",
    requestRejectedBody: "Malheureusement, votre demande de congé du {dateFrom} au {dateTo} a été refusée.",
    requestRejectedReason: "Raison",
    requestRejectedCta: "Voir Mon Planning",
    requestRejectedFooter: "Ceci est un message automatique de {restaurantName}. Merci de ne pas répondre."
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
    restaurantLocation: "Posizione del Ristorante",
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
    automatedMessageFrom: "Questo è un messaggio automatico da {restaurantName}",

    // Shift Published (staff notification)
    shiftPublishedSubject: "I tuoi nuovi turni sono ora disponibili — {restaurantName}",
    shiftPublishedTitle: "Il Tuo Orario È Stato Aggiornato",
    shiftPublishedGreeting: "Ciao {staffName},",
    shiftPublishedIntro: "Ottime notizie! I tuoi prossimi turni presso {restaurantName} sono stati pubblicati e sono ora disponibili.",
    shiftPublishedDetails: "Dettagli del Turno",
    shiftPublishedDate: "Data",
    shiftPublishedTime: "Ora",
    shiftPublishedRole: "Ruolo",
    shiftPublishedBreak: "Pausa",
    shiftPublishedMinutes: "min",
    shiftPublishedCta: "Visualizza il Mio Orario",
    shiftPublishedOutro: "Se hai domande sul tuo orario, parla con il tuo responsabile.",
    shiftPublishedFooter: "Questo è un messaggio automatico da {restaurantName}. Si prega di non rispondere a questa email.",

    // Time-Off Request (manager notification)
    timeOffRequestSubject: "Nuova richiesta di ferie da {staffName} — {restaurantName}",
    timeOffRequestTitle: "Nuova Richiesta di Ferie",
    timeOffRequestGreeting: "Salve,",
    timeOffRequestIntro: "È stata inviata una nuova richiesta di ferie in attesa di revisione.",
    timeOffRequestFrom: "Dipendente",
    timeOffRequestType: "Tipo di Congedo",
    timeOffRequestDates: "Date Richieste",
    timeOffRequestDays: "Durata",
    timeOffRequestDaysUnit: "giorno/i",
    timeOffRequestReason: "Motivo",
    timeOffRequestCta: "Esamina la Richiesta",
    timeOffRequestOutro: "Effettua il login alla dashboard per approvare o rifiutare questa richiesta.",
    timeOffRequestFooter: "Questa è una notifica automatica da {restaurantName}.",

    requestApprovedSubject: "La tua richiesta di ferie è stata approvata — {restaurantName}",
    requestApprovedTitle: "Richiesta di Ferie Approvata",
    requestApprovedGreeting: "Ciao {staffName},",
    requestApprovedBody: "Ottime notizie! La tua richiesta di ferie dal {dateFrom} al {dateTo} è stata approvata.",
    requestApprovedCta: "Visualizza il Mio Orario",
    requestApprovedFooter: "Questo è un messaggio automatico da {restaurantName}. Si prega di non rispondere.",

    requestRejectedSubject: "La tua richiesta di ferie è stata rifiutata — {restaurantName}",
    requestRejectedTitle: "Richiesta di Ferie Rifiutata",
    requestRejectedGreeting: "Ciao {staffName},",
    requestRejectedBody: "Purtroppo, la tua richiesta di ferie dal {dateFrom} al {dateTo} è stata rifiutata.",
    requestRejectedReason: "Motivo",
    requestRejectedCta: "Visualizza il Mio Orario",
    requestRejectedFooter: "Questo è un messaggio automatico da {restaurantName}. Si prega di non rispondere."
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
    restaurantLocation: "Ubicación del Restaurante",
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
    automatedMessageFrom: "Este es un mensaje automático de {restaurantName}",

    // Shift Published (staff notification)
    shiftPublishedSubject: "Tus nuevos turnos ya están disponibles — {restaurantName}",
    shiftPublishedTitle: "Tu Horario Ha Sido Actualizado",
    shiftPublishedGreeting: "Hola {staffName},",
    shiftPublishedIntro: "¡Buenas noticias! Tus próximos turnos en {restaurantName} han sido publicados y ya están disponibles para que los consultes.",
    shiftPublishedDetails: "Detalles del Turno",
    shiftPublishedDate: "Fecha",
    shiftPublishedTime: "Hora",
    shiftPublishedRole: "Puesto",
    shiftPublishedBreak: "Descanso",
    shiftPublishedMinutes: "min",
    shiftPublishedCta: "Ver Mi Horario",
    shiftPublishedOutro: "Si tienes alguna pregunta sobre tu horario, habla con tu responsable.",
    shiftPublishedFooter: "Este es un mensaje automático de {restaurantName}. Por favor, no respondas a este email.",

    // Time-Off Request (manager notification)
    timeOffRequestSubject: "Nueva solicitud de vacaciones de {staffName} — {restaurantName}",
    timeOffRequestTitle: "Nueva Solicitud de Vacaciones",
    timeOffRequestGreeting: "Hola,",
    timeOffRequestIntro: "Se ha enviado una nueva solicitud de tiempo libre y está pendiente de revisión.",
    timeOffRequestFrom: "Empleado",
    timeOffRequestType: "Tipo de Permiso",
    timeOffRequestDates: "Fechas Solicitadas",
    timeOffRequestDays: "Duración",
    timeOffRequestDaysUnit: "día(s)",
    timeOffRequestReason: "Motivo",
    timeOffRequestCta: "Revisar Solicitud",
    timeOffRequestOutro: "Por favor, inicia sesión en tu panel de control para aprobar o rechazar esta solicitud.",
    timeOffRequestFooter: "Esta es una notificación automática de {restaurantName}.",

    requestApprovedSubject: "Tu solicitud de vacaciones ha sido aprobada — {restaurantName}",
    requestApprovedTitle: "Solicitud de Vacaciones Aprobada",
    requestApprovedGreeting: "Hola {staffName},",
    requestApprovedBody: "¡Buenas noticias! Tu solicitud de vacaciones del {dateFrom} al {dateTo} ha sido aprobada.",
    requestApprovedCta: "Ver Mi Horario",
    requestApprovedFooter: "Este es un mensaje automático de {restaurantName}. Por favor, no respondas.",

    requestRejectedSubject: "Tu solicitud de vacaciones ha sido denegada — {restaurantName}",
    requestRejectedTitle: "Solicitud de Vacaciones Denegada",
    requestRejectedGreeting: "Hola {staffName},",
    requestRejectedBody: "Lamentablemente, tu solicitud de vacaciones del {dateFrom} al {dateTo} ha sido denegada.",
    requestRejectedReason: "Motivo",
    requestRejectedCta: "Ver Mi Horario",
    requestRejectedFooter: "Este es un mensaje automático de {restaurantName}. Por favor, no respondas."
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
