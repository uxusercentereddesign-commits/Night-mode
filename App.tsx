import React, { useState } from 'react';
import { BulbScene } from './components/BulbScene';
import { Controls } from './components/Controls';

function App() {
  const [isHammerMode, setIsHammerMode] = useState(false);

  const toggleHammer = () => {
    setIsHammerMode((prev) => !prev);
  };

  return (
    <div className="relative w-screen h-screen bg-[#1E1E1E] overflow-hidden">
      
      {/* Main Physics Scene */}
      <BulbScene 
        isHammerMode={isHammerMode} 
        onToggleHammer={toggleHammer}
      />

      {/* UI Overlay */}
      <Controls 
        isHammerMode={isHammerMode} 
        onToggleHammer={toggleHammer} 
      />
      
      {/* Footer / Branding */}
      <div className="absolute bottom-6 left-6 text-stone-600 text-xs tracking-widest pointer-events-none select-none">
        LUMI HANG // INTERACTIVE
      </div>
    </div>
  );
}

export default App;