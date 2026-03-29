"use client"
import { Home, Wine, PieChart, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const path = usePathname();
  const linkClass = (p: string) => `flex flex-col items-center gap-1 ${path === p ? 'text-bordeaux' : 'text-stone-400'}`;

  return (
    <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-lg border-t border-stone-200 px-6 py-3 flex justify-between items-center z-50">
      <Link href="/" className={linkClass('/')}><Home size={24} /><span className="text-[10px] uppercase font-bold">Cave</span></Link>
      <Link href="/bouteilles" className={linkClass('/bouteilles')}><Wine size={24} /><span className="text-[10px] uppercase font-bold">Vins</span></Link>
      <Link href="/stats" className={linkClass('/stats')}><PieChart size={24} /><span className="text-[10px] uppercase font-bold">Stats</span></Link>
      <button className="text-stone-400"><Menu size={24} /><span className="text-[10px] uppercase font-bold">Menu</span></button>
    </nav>
  );
}
