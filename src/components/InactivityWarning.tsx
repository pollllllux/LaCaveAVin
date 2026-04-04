import { useEffect, useState } from 'react'
import { Clock, LogOut } from 'lucide-react'

interface InactivityWarningProps {
  show: boolean
  onStayConnected: () => void
}

export default function InactivityWarning({ show, onStayConnected }: InactivityWarningProps) {
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (!show) {
      setCountdown(60)
      return
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [show])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-center p-4 bg-amber-50 rounded-2xl">
          <Clock className="text-amber-600" size={40} />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-serif font-bold text-stone-800 italic">Inactivité détectée</h2>
          <p className="text-sm text-stone-600">
            Vous serez déconnecté pour raison de sécurité dans :
          </p>
        </div>

        <div className="text-center">
          <div className="text-5xl font-bold text-amber-600 font-mono">
            {countdown.toString().padStart(2, '0')}s
          </div>
        </div>

        <button
          onClick={onStayConnected}
          className="w-full py-4 bg-bordeaux text-white font-bold rounded-2xl hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>Rester connecté</span>
        </button>

        <p className="text-[11px] text-stone-400 text-center italic">
          Cliquez n'importe où pour confirmer votre présence
        </p>
      </div>
    </div>
  )
}
