"use client"
import React from 'react';
import { Wine } from 'lucide-react';

interface Props {
  width: number;
  height: number;
  bottles: any[];
  onCellClick: (x: number, y: number, bottle?: any) => void;
}

export default function GrilleGestion({ width, height, bottles, onCellClick }: Props) {
  return (
    <div className="overflow-auto p-4 flex justify-center bg-stone-100 rounded-xl border border-stone-200 shadow-inner">
      <div 
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${width}, minmax(45px, 1fr))` }}
      >
        {Array.from({ length: height }).map((_, y) => (
          Array.from({ length: width }).map((_, x) => {
            const bottle = bottles.find(b => b.pos_x === x && b.pos_y === y && b.status === 'in_stock');
            return (
              <div 
                key={`${x}-${y}`}
                onClick={() => onCellClick(x, y, bottle)}
                className={`w-12 h-16 rounded-t-full border-2 flex items-end justify-center pb-2 transition-all
                  ${bottle ? 'bg-bordeaux border-bordeaux text-white shadow-md' : 'bg-white border-dashed border-stone-300 text-stone-300'}`}
              >
                {bottle ? <Wine size={20} /> : <span className="text-[10px]">${x+1}/${y+1}</span>}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}
