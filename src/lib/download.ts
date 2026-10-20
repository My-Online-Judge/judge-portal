// Save text as a file through a temporary anchor on a Blob URL.
export function downloadText(filename: string, text: string): void {
    downloadBlob(filename, new Blob([text], { type: 'text/plain;charset=utf-8' }))
}

// Save any blob as a file the same way.
export function downloadBlob(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob)
    downloadUrl(url, filename)
    // Revoke on the next tick: some browsers start the download after click() returns.
    setTimeout(() => URL.revokeObjectURL(url), 0)
}

// Save what a URL serves as a file through a temporary anchor. The browser streams it to disk and sends the page's
// cookies with a same-origin URL; nothing is held in memory and no request timeout applies.
export function downloadUrl(url: string, filename: string): void {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
}
