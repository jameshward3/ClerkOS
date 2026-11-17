/** All instants are stored in UTC and displayed in America/New_York. */
export const TZ = 'America/New_York'

export const fmtDate = (d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) =>
  d
    ? new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', ...opts }).format(new Date(d))
    : 'Not available'

export const fmtShortDate = (d: string | Date | null | undefined) =>
  fmtDate(d, { weekday: undefined, month: 'short' })

export const fmtTime = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(d)) : ''

/**
 * Civil date (YYYY-MM-DD) of an instant in America/New_York. Used for
 * date-only comparisons; DST-safe because it delegates to the tz database.
 */
export const civilDate = (d: string | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d))

/** True when `now` falls in [startsAt, endsAt). Missing bounds are open. */
export const isActiveWindow = (startsAt?: string | null, endsAt?: string | null, now = new Date()) =>
  (!startsAt || new Date(startsAt) <= now) && (!endsAt || now < new Date(endsAt))

/** Request-time clock for server components (ISO string, optional offset in ms). */
export const requestNowIso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString()
