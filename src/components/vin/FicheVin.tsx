"use client"
export default function FicheVin({ wine, isEdit }: { wine: any, isEdit: boolean }) {
  return (
    <div className="p-4 bg-white rounded-2xl shadow-lg border border-bordeaux/10">
      <h3 className="text-xl font-bold text-bordeaux mb-4">{wine?.name || 'Nouveau Vin'}</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><label className="text-gray-500">Pays</label><p className="font-medium">{wine?.country || '-'}</p></div>
        <div><label className="text-gray-500">Région</label><p className="font-medium">{wine?.region || '-'}</p></div>
        <div><label className="text-gray-500">Millésime</label><p className="font-medium">{wine?.vintage || '-'}</p></div>
        <div><label className="text-gray-500">Couleur</label><p className="font-medium">{wine?.color || '-'}</p></div>
        <div><label className="text-gray-500">Apogée</label><p className="font-medium text-bordeaux">{wine?.peak_date || '-'}</p></div>
      </div>
    </div>
  );
}
