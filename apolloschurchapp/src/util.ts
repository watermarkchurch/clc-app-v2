import URL from 'url';

export function present<T>(value: T | undefined | null | ''): value is T {
  if (!value) { return false }

  if (typeof value == 'string' && !/\S/.test(value)) {
    return false
  }
  return true
}

export function rewriteContentfulUrl(url?: undefined | null | '', query?: Record<string, any>): undefined
export function rewriteContentfulUrl(url: string, query?: Record<string, any>): string
export function rewriteContentfulUrl(url?: string | null, query: Record<string, any> = {}): string | undefined {
  if (!url) { return }

  url = url.replace(/^(https?\:)?\/\//, 'https://')
  const parsed = URL.parse(url, true)
  Object.assign(parsed.query, query)

  return URL.format(parsed)
}

export function parseName(name: string): { first: string, last?: string } {
  if (!present(name)) {
    return { first: '', last: '' }
  }

  const [first, ...remainder] = name.split(/\s+/)
  const last = remainder[remainder.length - 1] // Handle "Timothy (TA) Ateek"

  return {
    first,
    last
  }
}

export const hex2rgba = (hex: string, alpha = 1) => {
  const match = hex.match(/\w\w/g);
  if (!match) { return hex }

  const [r, g, b] = match.map(x => parseInt(x, 16));
  return `rgba(${r},${g},${b},${alpha})`;
};