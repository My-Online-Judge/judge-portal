export const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

    if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second')
    if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
    if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
}

export const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date
        .toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        })
        .replace(',', '')
}
