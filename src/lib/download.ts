// Save text as a file through a temporary anchor on a Blob URL.
export function downloadText(filename: string, text: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoke on the next tick: some browsers start the download after click() returns.
    setTimeout(() => URL.revokeObjectURL(url), 0)
}
