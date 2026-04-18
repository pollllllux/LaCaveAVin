"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Wine, Brain, BarChart3, ArrowRight, Check } from 'lucide-react'

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    checkAuth()
  }, [])

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-stone-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/vintrakfr.png" alt="Vintrak" width={168} height={84} />
          </div>
          <div className="flex gap-3">
            {user ? (
              <button
                onClick={() => router.push('/app')}
                className="px-6 py-2 bg-bordeaux text-white rounded-full font-bold text-sm hover:bg-stone-800 transition-colors"
              >
                Accéder à mon app
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-2 text-stone-600 hover:text-stone-900 font-bold text-sm transition-colors"
                >
                  Connexion
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-2 bg-bordeaux text-white rounded-full font-bold text-sm hover:bg-stone-800 transition-colors"
                >
                  Inscription
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-serif font-bold italic text-stone-900 leading-tight">
            La gestion simple et efficace de vos caves à vin
          </h1>

          <p className="text-xl text-stone-600 max-w-2xl mx-auto">
            Organisez votre collection avec élégance. Reconnaissance IA des étiquettes, statistiques intelligentes, et bien plus encore.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-bordeaux text-white rounded-full font-bold text-lg shadow-lg shadow-bordeaux/30 hover:bg-stone-800 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Essayer maintenant
              <ArrowRight size={20} />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 border-2 border-stone-300 text-stone-900 rounded-full font-bold text-lg hover:border-stone-900 transition-colors"
            >
              En savoir plus
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-serif font-bold italic text-center mb-16 text-stone-900">
            Fonctionnalités principales
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 bg-stone-50 rounded-3xl border border-stone-200 hover:border-bordeaux transition-colors group">
              <div className="p-4 bg-bordeaux/10 rounded-2xl w-fit mb-6 group-hover:bg-bordeaux group-hover:text-white transition-colors">
                <Brain size={32} className="text-bordeaux group-hover:text-white" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-3">Reconnaissance IA</h3>
              <p className="text-stone-600">
                Capturez une photo de l'étiquette et l'IA détecte automatiquement le vin. Plus besoin de taper les informations.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-stone-50 rounded-3xl border border-stone-200 hover:border-bordeaux transition-colors group">
              <div className="p-4 bg-bordeaux/10 rounded-2xl w-fit mb-6 group-hover:bg-bordeaux group-hover:text-white transition-colors">
                <BarChart3 size={32} className="text-bordeaux group-hover:text-white" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-3">Statistiques intelligentes</h3>
              <p className="text-stone-600">
                Analysez votre consommation, les vins les plus appréciés, et planifiez vos achats intelligemment.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-stone-50 rounded-3xl border border-stone-200 hover:border-bordeaux transition-colors group">
              <div className="p-4 bg-bordeaux/10 rounded-2xl w-fit mb-6 group-hover:bg-bordeaux group-hover:text-white transition-colors">
                <Wine size={32} className="text-bordeaux group-hover:text-white" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-3">Gestion visuelle</h3>
              <p className="text-stone-600">
                Organisez vos bouteilles dans une grille spatiale interactive. Visualisez votre cave comme si vous l'ouvriez.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-serif font-bold italic text-stone-900">
                Pourquoi choisir Vintrak?
              </h2>
              <ul className="space-y-4">
                {[
                  "Reconnaissance des étiquettes par IA - gain de temps garanti",
                  "Interface minimaliste et intuitive",
                  "Statistiques détaillées de votre consommation",
                  "Gestion de plusieurs caves",
                  "Gratuit et sans publicités",
                  "100% confidentiel - vos données vous appartiennent"
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="text-bordeaux flex-shrink-0 mt-1" size={20} />
                    <span className="text-stone-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-bordeaux/10 to-stone-200 rounded-3xl p-12 flex items-center justify-center h-96">
              <div className="text-center text-stone-400">
                <Wine size={80} className="mx-auto opacity-50 mb-4" />
                <p className="font-serif italic">Visualisez votre cave</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-bordeaux text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-serif font-bold italic">
            Prêt à gérer votre collection?
          </h2>
          <p className="text-xl text-white/90">
            Créez votre compte gratuitement et commencez à organiser vos vins maintenant.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-bordeaux rounded-full font-bold text-lg hover:bg-stone-100 transition-colors active:scale-95 shadow-xl"
          >
            Essayer maintenant
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-stone-900 text-stone-300 border-t border-stone-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <Image src="/vintrakfr.png" alt="Vintrak" width={210} height={105} />
              </div>
              <p className="text-sm">La gestion simple et efficace de vos caves à vin</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3">Utilisateur</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/login" className="hover:text-white transition-colors">Connexion</a></li>
                <li><a href="/login" className="hover:text-white transition-colors">Inscription</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Conditions</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 text-center text-sm">
            <p>&copy; 2026 Vintrak. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
