import { useRouter } from 'next/navigation'
import { ArrowLeft, Wine } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 p-6 flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-6 bg-bordeaux/10 rounded-full">
            <Wine className="w-16 h-16 text-bordeaux opacity-50" />
          </div>
        </div>

        {/* 404 Text */}
        <div className="space-y-3">
          <h1 className="text-6xl font-serif font-bold text-stone-800 italic">404</h1>
          <p className="text-2xl font-serif font-bold text-stone-800 italic">
            Oooops...
          </p>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <p className="text-lg text-stone-700">
            Voici une page où nous n'aurions pas dû arriver
          </p>
          <p className="text-sm text-stone-500">
            Cette page n'existe pas ou a été déplacée.
          </p>
        </div>

        {/* Button */}
        <div className="pt-6">
          <Link
            href="/login"
            className="w-full py-4 bg-bordeaux text-white rounded-2xl font-bold hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Retour à la connexion
          </Link>
        </div>

        {/* Decoration */}
        <div className="pt-4 opacity-20">
          <p className="text-xs text-stone-400 italic">🍷</p>
        </div>
      </div>
    </div>
  )
}
