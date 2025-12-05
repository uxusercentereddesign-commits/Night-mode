import React from 'react';
import { Hammer, Lightbulb } from 'lucide-react';

interface ControlsProps {
  isHammerMode: boolean;
  onToggleHammer: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ isHammerMode, onToggleHammer }) => {
  return (
    <div className="absolute top-8 right-8 flex flex-col items-end gap-6 text-stone-300 font-light pointer-events-none">
      
      {/* Light Instruction */}
      <div className="flex items-center gap-4 animate-fade-in-up transition-opacity duration-500">
        <span className="text-right text-sm md:text-base drop-shadow-md tracking-wide">
            Click bulb to turn <br/> on and off
        </span>
        <div className="w-12 h-12 rounded-full bg-stone-800/50 backdrop-blur-sm border border-stone-700 flex items-center justify-center shadow-xl">
             <Lightbulb size={24} className="text-yellow-500" />
        </div>
      </div>

      {/* Hammer Instruction */}
      <div className="flex items-center gap-4 animate-fade-in-up delay-100 transition-opacity duration-500">
        <span className="text-right text-sm md:text-base drop-shadow-md tracking-wide max-w-[200px]">
            Use hammer to place <br/> Wooden Peg, then hang bulb
        </span>
        <button 
            onClick={onToggleHammer}
            className={`pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 border
                ${isHammerMode 
                    ? 'bg-amber-700 text-white border-amber-500 scale-110 ring-4 ring-amber-900/30' 
                    : 'bg-stone-800/50 backdrop-blur-sm border-stone-700 text-stone-400 hover:bg-stone-700 hover:text-white'
                }
            `}
        >
             <Hammer size={24} className={isHammerMode ? 'animate-pulse' : ''} />
        </button>
      </div>

    </div>
  );
};