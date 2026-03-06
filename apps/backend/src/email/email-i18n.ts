/**
 * Email copy by language. Used so transactional emails match the frontend language.
 * Supported: en, de, ro, ru. Fallback: en for any other code.
 * Add more languages by defining a new EmailCopy constant and adding it to EMAIL_COPY.
 */
export type EmailCopy = {
  // Order – admin
  adminOrderSubject: string;
  adminOrderTitle: string;
  adminOrderNewPlaced: string;
  orderId: string;
  total: string;
  customer: string;
  items: string;
  guest: string;

  // Order – customer confirmation
  orderConfirmationSubject: string;
  orderConfirmationTitle: string;
  orderConfirmationIntro: string;
  shippingAddress: string;
  orderConfirmed: string;

  // Order – status update
  orderStatusSubject: string;
  orderStatusTitle: string;
  orderStatusIntro: string;
  trackingNumber: string;

  // Status labels
  statusPending: string;
  statusProcessing: string;
  statusShipped: string;
  statusDelivered: string;
  statusCancelled: string;

  // Withdrawal / return request (to company)
  withdrawalSubject: string;
  withdrawalTitle: string;
  withdrawalIntro: string;
  orderNumber: string;
  name: string;
  email: string;
  deliveryAddress: string;
  requestType: string;
  reasonNotes: string;
  language: string;
};

const EN: EmailCopy = {
  adminOrderSubject: 'New order received',
  adminOrderTitle: 'New order received',
  adminOrderNewPlaced: 'A new order has been placed and paid.',
  orderId: 'Order ID',
  total: 'Total',
  customer: 'Customer',
  items: 'Items',
  guest: 'Guest',

  orderConfirmationSubject: 'Order confirmation',
  orderConfirmationTitle: 'Order confirmed',
  orderConfirmationIntro: 'Your order has been confirmed and payment was successful.',
  shippingAddress: 'Shipping address',
  orderConfirmed: 'Order confirmed',

  orderStatusSubject: 'Order status update',
  orderStatusTitle: 'Order status update',
  orderStatusIntro: 'Your order status has been updated to',
  trackingNumber: 'Tracking number (DHL)',

  statusPending: 'Pending',
  statusProcessing: 'Processing',
  statusShipped: 'Shipped',
  statusDelivered: 'Delivered',
  statusCancelled: 'Cancelled',

  withdrawalSubject: 'Request: Withdrawal / Return / Cancellation – Order',
  withdrawalTitle: 'Request: Withdrawal / Return',
  withdrawalIntro: 'A customer has submitted a request via the website form.',
  orderNumber: 'Order number',
  name: 'Name',
  email: 'E-mail',
  deliveryAddress: 'Delivery address',
  requestType: 'Type of request',
  reasonNotes: 'Reason / Additional notes',
  language: 'Language',
};

const DE: EmailCopy = {
  adminOrderSubject: 'Neue Bestellung eingegangen',
  adminOrderTitle: 'Neue Bestellung eingegangen',
  adminOrderNewPlaced: 'Eine neue Bestellung wurde aufgegeben und bezahlt.',
  orderId: 'Bestellnummer',
  total: 'Gesamtbetrag',
  customer: 'Kunde',
  items: 'Artikel',
  guest: 'Gast',

  orderConfirmationSubject: 'Bestellbestätigung',
  orderConfirmationTitle: 'Bestellung bestätigt',
  orderConfirmationIntro: 'Ihre Bestellung wurde bestätigt und die Zahlung war erfolgreich.',
  shippingAddress: 'Lieferadresse',
  orderConfirmed: 'Bestellung bestätigt',

  orderStatusSubject: 'Bestellstatus aktualisiert',
  orderStatusTitle: 'Bestellstatus aktualisiert',
  orderStatusIntro: 'Der Status Ihrer Bestellung wurde aktualisiert auf',
  trackingNumber: 'Sendungsverfolgung (DHL)',

  statusPending: 'Ausstehend',
  statusProcessing: 'In Bearbeitung',
  statusShipped: 'Versendet',
  statusDelivered: 'Zugestellt',
  statusCancelled: 'Storniert',

  withdrawalSubject: 'Anfrage: Widerruf / Retoure / Stornierung – Bestellung',
  withdrawalTitle: 'Anfrage: Widerruf / Retoure',
  withdrawalIntro: 'Ein Kunde hat eine Anfrage über das Formular auf der Website gesendet.',
  orderNumber: 'Bestellnummer',
  name: 'Name',
  email: 'E-Mail',
  deliveryAddress: 'Lieferadresse',
  requestType: 'Art der Anfrage',
  reasonNotes: 'Begründung / Anmerkungen',
  language: 'Sprache',
};

const RO: EmailCopy = {
  adminOrderSubject: 'Comandă nouă primită',
  adminOrderTitle: 'Comandă nouă primită',
  adminOrderNewPlaced: 'O comandă nouă a fost plasată și plătită.',
  orderId: 'Număr comandă',
  total: 'Total',
  customer: 'Client',
  items: 'Produse',
  guest: 'Vizitator',

  orderConfirmationSubject: 'Confirmare comandă',
  orderConfirmationTitle: 'Comandă confirmată',
  orderConfirmationIntro: 'Comanda dvs. a fost confirmată și plata a fost efectuată cu succes.',
  shippingAddress: 'Adresă de livrare',
  orderConfirmed: 'Comandă confirmată',

  orderStatusSubject: 'Actualizare status comandă',
  orderStatusTitle: 'Actualizare status comandă',
  orderStatusIntro: 'Statusul comenzii dvs. a fost actualizat la',
  trackingNumber: 'Număr urmărire (DHL)',

  statusPending: 'În așteptare',
  statusProcessing: 'În procesare',
  statusShipped: 'Expediat',
  statusDelivered: 'Livrat',
  statusCancelled: 'Anulat',

  withdrawalSubject: 'Cerere: Retragere / Returnare / Anulare – Comanda',
  withdrawalTitle: 'Cerere: Retragere / Returnare',
  withdrawalIntro: 'Un client a trimis o cerere prin formularul de pe site.',
  orderNumber: 'Număr comandă',
  name: 'Nume',
  email: 'E-mail',
  deliveryAddress: 'Adresă de livrare',
  requestType: 'Tipul cererii',
  reasonNotes: 'Motiv / Observații',
  language: 'Limbă',
};

const RU: EmailCopy = {
  adminOrderSubject: 'Получен новый заказ',
  adminOrderTitle: 'Получен новый заказ',
  adminOrderNewPlaced: 'Новый заказ оформлен и оплачен.',
  orderId: 'Номер заказа',
  total: 'Итого',
  customer: 'Клиент',
  items: 'Товары',
  guest: 'Гость',

  orderConfirmationSubject: 'Подтверждение заказа',
  orderConfirmationTitle: 'Заказ подтверждён',
  orderConfirmationIntro: 'Ваш заказ подтверждён, оплата прошла успешно.',
  shippingAddress: 'Адрес доставки',
  orderConfirmed: 'Заказ подтверждён',

  orderStatusSubject: 'Обновление статуса заказа',
  orderStatusTitle: 'Обновление статуса заказа',
  orderStatusIntro: 'Статус вашего заказа обновлён на',
  trackingNumber: 'Трек-номер (DHL)',

  statusPending: 'Ожидание',
  statusProcessing: 'В обработке',
  statusShipped: 'Отправлен',
  statusDelivered: 'Доставлен',
  statusCancelled: 'Отменён',

  withdrawalSubject: 'Запрос: Отказ / Возврат / Отмена – Заказ',
  withdrawalTitle: 'Запрос: Отказ / Возврат',
  withdrawalIntro: 'Клиент отправил запрос через форму на сайте.',
  orderNumber: 'Номер заказа',
  name: 'Имя',
  email: 'Эл. почта',
  deliveryAddress: 'Адрес доставки',
  requestType: 'Тип запроса',
  reasonNotes: 'Причина / Комментарии',
  language: 'Язык',
};

export const EMAIL_COPY: Record<string, EmailCopy> = {
  en: EN,
  de: DE,
  ro: RO,
  ru: RU,
};

const DEFAULT_LANG = 'en';

/**
 * Normalize language code (e.g. "en-US" -> "en") and pick a known locale.
 */
export function normalizeEmailLang(lang: string | undefined | null): string {
  if (!lang || typeof lang !== 'string') return DEFAULT_LANG;
  const code = lang.trim().toLowerCase().split('-')[0];
  return EMAIL_COPY[code] ? code : DEFAULT_LANG;
}

/**
 * Get email copy for a language. Falls back to en if language is missing or unknown.
 */
export function getEmailCopy(lang: string | undefined | null): EmailCopy {
  const code = normalizeEmailLang(lang);
  return EMAIL_COPY[code] ?? EN;
}
