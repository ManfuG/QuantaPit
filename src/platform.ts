import { Capacitor, registerPlugin } from '@capacitor/core'

interface QuantaPitPlugin {
  exportSession(options: { filename: string; source: string }): Promise<{ saved: boolean }>
}

const native = registerPlugin<QuantaPitPlugin>('QuantaPit')

export async function exportSessionFile(source: string): Promise<boolean> {
  const filename = `quantapit-sessions-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  if (Capacitor.getPlatform() === 'android') {
    return (await native.exportSession({ filename, source })).saved
  }
  const url = URL.createObjectURL(new Blob([source], { type: 'application/json' }))
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    // Let the browser start consuming the download before releasing its URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return true
}
