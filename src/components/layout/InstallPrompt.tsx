import React, { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

// Event bawaan Chrome/Android sebelum menawarkan pemasangan aplikasi
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'installPromptDismissed'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

// Ajakan memasang aplikasi ke layar utama HP (PWA)
export const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(readDismissed)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (dismissed || isStandalone()) return null

  const showIosHint = !deferred && isIos()
  if (!deferred && !showIosHint) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch (err) {
      console.error('Gagal menyimpan pilihan pemasangan:', err)
    }
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    if (outcome === 'dismissed') dismiss()
  }

  return (
    <div className="install-banner">
      <span>
        {showIosHint
          ? 'Pasang Mutaba\'ah di HP: ketuk tombol Bagikan, lalu "Tambah ke Layar Utama".'
          : 'Pasang Mutaba\'ah di HP supaya bisa dibuka langsung dari layar utama.'}
      </span>
      <span className="actions">
        {deferred && (
          <button className="btn-primary btn-small" onClick={install}>
            <Icon name="download" size={16} /> Pasang
          </button>
        )}
        <button className="btn-small" onClick={dismiss}>
          Nanti saja
        </button>
      </span>
    </div>
  )
}
