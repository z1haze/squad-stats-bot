import {LeaderboardType} from "../typings/player";

/**
 * Dynamically import a file from a file path
 *
 * @param filePath
 */
export async function importFile(filePath: string) {
  return (await import(filePath))?.default;
}

/**
 * Convert a string to a case-insensitive glob pattern
 *
 * @param str
 */
export function getCaseInsensitiveGlobPattern(str: string) {
  const escapes = ['[', ']', '*'];

  return str.split('').map(c => {
    if (/\s/.test(c)) {
      return c;
    }

    if (escapes.indexOf(c) > -1) {
      return `[\\${c.toLowerCase()}\\${c.toUpperCase()}]`
    }

    return `[${c.toLowerCase()}${c.toUpperCase()}]`
  }).join('');
}

/**
 * Given a number, provide the correct string suffix
 *
 * @param d
 */
export function nth(d: number) {
  if (d > 3 && d < 21) return 'th';

  switch (d % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function truncate(str: string, length: number, end = '...') {
  return str.length > length ? str.substring(0, length - end.length) + end : str;
}