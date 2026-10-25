import { downloadBlob } from '@/lib/download'

/**
 * Rows as RFC 4180 CSV: records end in CRLF, a field holding a comma, a double quote or a line break is quoted,
 * and a quote inside a quoted field is doubled. Everything else is written as is.
 */
export function toCsv(rows: string[][]): string {
    return rows.map((row) => row.map(field).join(',') + '\r\n').join('')
}

function field(value: string): string {
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Save CSV text as a file. The byte order mark makes Excel read UTF-8 (Vietnamese names) as such. */
export function downloadCsv(filename: string, text: string): void {
    downloadBlob(filename, new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' }))
}
