// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ downloadBlob: vi.fn() }))
vi.mock('@/lib/download', () => ({ downloadBlob: h.downloadBlob }))

import { downloadCsv, toCsv } from '@/lib/csv'

afterEach(() => vi.clearAllMocks())

describe('toCsv', () => {
    it('quotesCommasQuotesAndNewlines', () => {
        const csv = toCsv([
            ['username', 'name'],
            ['alice', 'Alice, Jr.'],
            ['bob', 'Say "hi"'],
            ['carol', 'two\nlines'],
            ['dan', ''],
            ['eve', 'Lê Văn Ê'],
        ])
        // RFC 4180: CRLF between records, a field with a comma, a quote or a line break in quotes, quotes doubled.
        expect(csv).toBe(
            'username,name\r\n' +
                'alice,"Alice, Jr."\r\n' +
                'bob,"Say ""hi"""\r\n' +
                'carol,"two\nlines"\r\n' +
                'dan,\r\n' +
                'eve,Lê Văn Ê\r\n',
        )
    })
})

describe('toCsv formulas', () => {
    it('neutralisesSpreadsheetFormulas', () => {
        // A name is typed by its user: one starting with =, +, - or @ would run as a formula when the file is opened.
        expect(toCsv([['=HYPERLINK("x")', '@SUM(1)', '+1', '-1', 'a-b']])).toBe(
            `"'=HYPERLINK(""x"")",'@SUM(1),'+1,'-1,a-b\r\n`,
        )
    })
})

describe('downloadCsv', () => {
    it('savesATextCsvBlobWithAByteOrderMark', async () => {
        downloadCsv('participants-spring-cup.csv', 'username,name\r\nalice,Alice\r\n')
        expect(h.downloadBlob).toHaveBeenCalledTimes(1)
        const [name, blob] = h.downloadBlob.mock.calls[0]! as [string, Blob]
        expect(name).toBe('participants-spring-cup.csv')
        expect(blob.type).toBe('text/csv;charset=utf-8')
        // The mark makes Excel read Vietnamese names as UTF-8. Blob.text() strips it, so the bytes are checked.
        const bytes = new Uint8Array(await blob.arrayBuffer())
        expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
        expect(new TextDecoder().decode(bytes.slice(3))).toBe('username,name\r\nalice,Alice\r\n')
    })
})
