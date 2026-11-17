import { cookies } from 'next/headers'

export type Locale = 'en' | 'es'
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get('lang')?.value
  return c === 'es' ? 'es' : 'en'
}

/**
 * Interface strings. Spanish strings are a staff-drafted first pass pending
 * review by a qualified City translator (see docs/content-status.md). Page
 * CONTENT is only shown in Spanish where a Spanish version exists; otherwise
 * the English version is shown with an explicit notice.
 */
const STRINGS = {
  en: {
    skip: 'Skip to main content', services: 'Services', explore: 'Explore Orange', government: 'Government', meetings: 'Meetings',
    transparency: 'Transparency', projects: 'Projects', accessibility: 'Accessibility', search: 'Search', menu: 'Menu',
    language: 'Español', languageLabel: 'Ver en español',
    notTranslated: 'This page is not yet available in Spanish.',
    prototype: 'Prototype for review — not the official City website.', officialSite: 'Official site',
    contact: 'Contact City Hall', footerAbout: 'City of Orange Township', footerGov: 'Government', footerHelp: 'Help',
    privacy: 'Privacy', designNote: 'Design concept • Illustrative content is labeled',
  },
  es: {
    skip: 'Saltar al contenido principal', services: 'Servicios', explore: 'Conozca Orange', government: 'Gobierno', meetings: 'Reuniones',
    transparency: 'Transparencia', projects: 'Proyectos', accessibility: 'Accesibilidad', search: 'Buscar', menu: 'Menú',
    language: 'English', languageLabel: 'View in English',
    notTranslated: 'Esta página todavía no está disponible en español. Se muestra la versión en inglés.',
    prototype: 'Prototipo para revisión — no es el sitio oficial de la Ciudad.', officialSite: 'Sitio oficial',
    contact: 'Contacto del Ayuntamiento', footerAbout: 'Ciudad de Orange Township', footerGov: 'Gobierno', footerHelp: 'Ayuda',
    privacy: 'Privacidad', designNote: 'Concepto de diseño • El contenido ilustrativo está señalado',
  },
} as const
export type Strings = { [K in keyof (typeof STRINGS)['en']]: string }
export const t = (l: Locale): Strings => STRINGS[l]
