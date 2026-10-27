import { downloadBlob } from '@/lib/download'

/**
 * Rows as RFC 4180 CSV: records end in CRLF, a field holding a comma, a double quote or a line break is quoted,
 * and a quote inside a quoted field is doubled. A field that a spreadsheet would run as a formula (one starting
 * with =, +, -, @, a tab or a carriage return) gets a leading apostrophe, the spreadsheet's own "this is text"
 * mark: the values here are typed by users (a name) and the file is opened in Excel.
 */
export function toCsv(rows: string[][]): string {
    return rows.map((row) => row.map(field).join(',') + '\r\n').join('')
}

function field(value: string): string {
    const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Save CSV text as a file. The byte order mark makes Excel read UTF-8 (Vietnamese names) as such. */
export function downloadCsv(filename: string, text: string): void {
    downloadBlob(filename, new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' }))
}
