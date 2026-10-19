export const formatMs = (v: number | null | undefined): string => (v == null ? '-' : `${v} ms`)
export const formatMem = (v: number | null | undefined): string =>
    v == null ? '-' : `${(v / (1024 * 1024)).toFixed(1)} MB`
