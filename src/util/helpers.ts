export async function importFile(filePath: string) {
    return (await import(filePath))?.default;
}

export function getCaseInsensitivePattern(str: string) {
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

export function nth(d: number) {
    if (d > 3 && d < 21) return 'th';

    switch (d % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
    }
}