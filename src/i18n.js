import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ro', 'es', 'fr', 'it'];
export const defaultLocale = 'en';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default
}));
