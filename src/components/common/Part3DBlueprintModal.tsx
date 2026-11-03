import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCw, 
  Eye, 
  Box, 
  ShieldCheck, 
  AlertTriangle, 
  Calculator, 
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Compass,
  Maximize2
} from 'lucide-react';
import { UnifiedPartMasterRow } from '../../views/PartMasterView';

interface Part3DBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  partRow: UnifiedPartMasterRow | null;
}

export const Part3DBlueprintModal: React.FC<Part3DBlueprintModalProps> = ({
  isOpen,
  onClose,
  partRow
}) => {
  const [rotationX, setRotationX] = useState<number>(20);
  const [rotationY, setRotationY] = useState<number>(-30);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [renderMode, setRenderMode] = useState<'WIREFRAME' | 'SHADED' | 'X_RAY'>('WIREFRAME');
  const [isAutoSpin, setIsAutoSpin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'3D_BLUEPRINT' | 'CALCULATION_LADDER'>('3D_BLUEPRINT');

  // 360-degree Auto Rotation Effect
  useEffect(() => {
    if (!isAutoSpin) return;
    const interval = setInterval(() => {
      setRotationY(prev => (prev + 1.2) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoSpin]);

  if (!isOpen || !partRow) return null;

  // Extract Spec values directly from partRow
  const newSpecNum = typeof partRow.newSpecMm === 'number'
    ? partRow.newSpecMm
    : parseFloat(String(partRow.shotLifeCycle?.partsSpec || '28.00').replace(/[^0-9.]/g, '')) || 28.00;

  const scrapLimitNum = typeof partRow.scrapLimitMm === 'number'
    ? partRow.scrapLimitMm
    : parseFloat(String(partRow.shotLifeCycle?.lowerSpecScrapLimit || '27.00').replace(/[^0-9.]/g, '')) || 27.00;

  const isDisposable = partRow.regrindStandard?.perGrindMm?.toLowerCase().includes('dispose') || partRow.maintenanceType === 'DISPOSE';

  const perGrindNum = isDisposable ? 0 : parseFloat(String(partRow.regrindStandard?.perGrindMm || '0.10').replace(/[^0-9.]/g, '')) || 0.10;

  const totalAllowableGrind = isDisposable ? 0 : Math.max(0, newSpecNum - scrapLimitNum);
  const maxCyclesCalculated = (isDisposable || perGrindNum <= 0) 
    ? 'Dispose' 
    : typeof partRow.regrindStandard?.regrindCycles === 'number'
      ? partRow.regrindStandard.regrindCycles
      : Math.floor(totalAllowableGrind / perGrindNum);

  // Classify Part Geometry Type
  const nameUpper = partRow.partName.toUpperCase();
  const isDie = nameUpper.includes('DIE');
  const isLouver = nameUpper.includes('LOUVER');
  const isSlit = nameUpper.includes('SLIT') || nameUpper.includes('CUTTER') || nameUpper.includes('FLARE') || nameUpper.includes('BLADE');
  const isPin = nameUpper.includes('PIN') || nameUpper.includes('PILOT') || nameUpper.includes('GUIDE');
  const isIroning = nameUpper.includes('IRONING') || nameUpper.includes('FORM') || nameUpper.includes('BUCKING');
  const isPunch = !isDie && !isLouver && !isSlit && !isPin && !isIroning;

  // Handle Mouse Drag for 360° Rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startRotX = rotationX;
    const startRotY = rotationY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setRotationY((startRotY + deltaX * 0.8) % 360);
      setRotationX(Math.max(-85, Math.min(85, startRotX - deltaY * 0.6)));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.2, 2.2));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.2, 0.6));
  const handleResetCamera = () => {
    setRotationX(20);
    setRotationY(-30);
    setZoomScale(1.0);
    setIsAutoSpin(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#121316] border border-[#00FF00]/40 rounded-xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#1a1b1e] border-b border-[#2d2e38]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/30 text-[#00FF00]">
              <Box className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#00FF00] bg-[#00FF00]/10 px-2 py-0.5 rounded border border-[#00FF00]/30">
                  {partRow.stage}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  DWG: {partRow.drawingNo || 'DWG-STD-2025'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  3D Precision Model
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide mt-0.5 flex items-center gap-2">
                {partRow.partName}
                <span className="text-xs font-normal text-slate-400 font-mono">
                  (Ø5 & Ø7 Factory Standard)
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-[#0a0b0d] p-1 rounded-lg border border-[#2d2e38]">
              <button
                onClick={() => setActiveTab('3D_BLUEPRINT')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === '3D_BLUEPRINT'
                    ? 'bg-[#00FF00] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D Blueprint Simulation</span>
              </button>
              <button
                onClick={() => setActiveTab('CALCULATION_LADDER')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'CALCULATION_LADDER'
                    ? 'bg-[#00FF00] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>ตารางรอบเจียร (Grind Ladder)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#22222a] hover:bg-[#333340] text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
              title="ปิดหน้าต่าง (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Viewport Content */}
        <div className="flex-1 overflow-hidden p-4 bg-[#0d0e11] flex flex-col justify-between">
          {activeTab === '3D_BLUEPRINT' ? (
            <div className="w-full h-full flex flex-col justify-between space-y-3">
              
              {/* Full-Width Spacious 3D Canvas Box */}
              <div className="w-full flex-1 bg-[#14151a] border border-[#2a2b34] rounded-xl p-4 flex flex-col justify-between relative min-h-[500px] shadow-2xl select-none overflow-hidden">
                
                {/* Canvas Floating Top HUD Controls Bar */}
                <div className="flex items-center justify-between z-20 gap-3 flex-wrap">
                  
                  {/* Left Badges */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#00FF00] bg-[#00FF00]/10 px-3 py-1.5 rounded-lg border border-[#00FF00]/30 shadow-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00FF00] animate-ping" />
                      3D Interactive Viewport
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-black/50 px-2.5 py-1 rounded-md border border-white/10">
                      Rot X: {Math.round(rotationX)}° | Rot Y: {Math.round((rotationY % 360 + 360) % 360)}°
                    </span>
                  </div>

                  {/* Top Center Spec Quick Badges (High Visibility) */}
                  <div className="hidden md:flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">New Spec L₀:</span>
                      <strong className="text-emerald-400 font-bold">{newSpecNum.toFixed(2)} mm</strong>
                    </div>
                    <span className="text-slate-600">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Scrap Limit L<sub>min</sub>:</span>
                      <strong className="text-rose-400 font-bold">{scrapLimitNum.toFixed(2)} mm</strong>
                    </div>
                    <span className="text-slate-600">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Step Δl:</span>
                      <strong className="text-purple-300 font-bold">{isDisposable ? 'Dispose' : `${perGrindNum.toFixed(2)} mm`}</strong>
                    </div>
                    <span className="text-slate-600">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Max Cycles:</span>
                      <strong className="text-[#00FF00] font-bold">
                        {typeof maxCyclesCalculated === 'number' ? `${maxCyclesCalculated} รอบ` : maxCyclesCalculated}
                      </strong>
                    </div>
                  </div>

                  {/* Right Controls Toolbars */}
                  <div className="flex items-center gap-2 bg-[#08090b]/90 backdrop-blur-md p-1.5 rounded-lg border border-white/15 shadow-md">
                    {/* Render Mode Switcher */}
                    <div className="flex items-center bg-[#1a1b22] rounded p-0.5 border border-white/10">
                      <button
                        onClick={() => setRenderMode('WIREFRAME')}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-colors cursor-pointer ${
                          renderMode === 'WIREFRAME' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                        title="โหมดสาย Wireframe โปร่งแสง (Match Blueprint)"
                      >
                        Wireframe
                      </button>
                      <button
                        onClick={() => setRenderMode('SHADED')}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-colors cursor-pointer ${
                          renderMode === 'SHADED' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                        title="โหมดผิวเนื้อโลหะสมจริง (Polished Steel)"
                      >
                        Shaded Metal
                      </button>
                      <button
                        onClick={() => setRenderMode('X_RAY')}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-colors cursor-pointer ${
                          renderMode === 'X_RAY' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                        title="โหมดเอ็กซเรย์เห็นภายใน (X-Ray Cutaway)"
                      >
                        X-Ray
                      </button>
                    </div>

                    {/* Auto Spin Toggle */}
                    <button
                      onClick={() => setIsAutoSpin(!isAutoSpin)}
                      className={`p-1.5 rounded text-xs font-mono flex items-center gap-1 font-bold border cursor-pointer transition-all ${
                        isAutoSpin 
                          ? 'bg-[#00FF00] text-black border-[#00FF00]' 
                          : 'bg-[#1e1f26] text-slate-300 hover:text-white border-white/10'
                      }`}
                      title={isAutoSpin ? 'หยุดหมุน 360°' : 'หมุนดู 360° อัตโนมัติ (Auto 360 Spin)'}
                    >
                      {isAutoSpin ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">Spin 360°</span>
                    </button>

                    {/* Zoom Buttons */}
                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 text-slate-300 hover:text-white bg-[#1e1f26] rounded border border-white/10 hover:bg-slate-700 cursor-pointer"
                      title="ซูมขยาย (Zoom In)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 text-slate-300 hover:text-white bg-[#1e1f26] rounded border border-white/10 hover:bg-slate-700 cursor-pointer"
                      title="ย่อมุมมอง (Zoom Out)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>

                    {/* Reset Camera Button */}
                    <button
                      onClick={handleResetCamera}
                      className="p-1.5 text-slate-300 hover:text-white bg-[#1e1f26] rounded border border-white/10 hover:bg-slate-700 cursor-pointer"
                      title="รีเซ็ตมุมมองและทิศทาง (Reset Camera)"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main 3D Canvas Canvas Renderer */}
                <div 
                  className="w-full flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing my-2 relative"
                  onMouseDown={handleMouseDown}
                >
                  {/* Subtle Background Blueprint Grid Lines */}
                  <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#00FF00_1px,transparent_1px)] [background-size:20px_20px]" />

                  {/* 3D Object Container with Perspective Transform */}
                  <div 
                    className="transition-transform duration-75 ease-out flex items-center justify-center relative z-10"
                    style={{
                      transform: `perspective(900px) rotateX(${rotationX}deg) rotateY(${rotationY}deg) scale(${zoomScale})`,
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    <svg width="360" height="360" viewBox="-180 -180 360 360" className="drop-shadow-[0_15px_30px_rgba(0,255,0,0.15)]">
                      <defs>
                        {/* Shaded Metallic Steel Gradients */}
                        <linearGradient id="metalMainShaded" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#64748b" />
                          <stop offset="35%" stopColor="#e2e8f0" />
                          <stop offset="70%" stopColor="#334155" />
                          <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>

                        <linearGradient id="metalGreenHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#00FF00" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#006600" stopOpacity="0.4" />
                        </linearGradient>

                        <linearGradient id="xRayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#0369a1" stopOpacity="0.6" />
                        </linearGradient>

                        {/* Drop Glow Filter */}
                        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Dynamic 3D Geometry Rendering based on Part Category */}
                      {isPunch ? (
                        /* PUNCH GEOMETRY (Pierce Punch, Burring Punch, etc.) */
                        <g 
                          stroke={renderMode === 'WIREFRAME' ? '#00FF00' : renderMode === 'X_RAY' ? '#38bdf8' : '#475569'} 
                          strokeWidth={renderMode === 'WIREFRAME' ? '1.5' : '1'} 
                          fill={renderMode === 'WIREFRAME' ? 'none' : renderMode === 'X_RAY' ? 'url(#xRayGradient)' : 'url(#metalMainShaded)'}
                        >
                          {/* Upper Shank Cylinder Head */}
                          <ellipse cx="0" cy="-90" rx="55" ry="22" fill={renderMode === 'WIREFRAME' ? 'none' : renderMode === 'X_RAY' ? 'none' : '#94a3b8'} />
                          <path d="M -55,-90 L -55,-25 A 55 22 0 0 0 55,-25 L 55,-90 Z" />
                          <ellipse cx="0" cy="-25" rx="55" ry="22" fill={renderMode === 'WIREFRAME' ? 'none' : renderMode === 'X_RAY' ? 'none' : '#64748b'} />

                          {/* Center Alignment Axis Guide Line */}
                          <line x1="0" y1="-110" x2="0" y2="110" stroke="#00FF00" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

                          {/* Middle Taper Transition Cone */}
                          <path d="M -55,-25 L -30,25 A 30 12 0 0 0 30,25 L 55,-25 Z" fill={renderMode === 'WIREFRAME' ? 'none' : renderMode === 'X_RAY' ? 'none' : '#475569'} />
                          <ellipse cx="0" cy="25" rx="30" ry="12" fill="none" stroke="#00FF00" strokeWidth="1" strokeDasharray="2 2" />

                          {/* Lower Cutting Pin Body */}
                          <path d="M -30,25 L -30,95 A 30 12 0 0 0 30,95 L 30,25 Z" fill={renderMode === 'WIREFRAME' ? 'none' : 'url(#metalGreenHighlight)'} />
                          <ellipse cx="0" cy="95" rx="30" ry="12" fill={renderMode === 'WIREFRAME' ? 'none' : '#00FF00'} opacity="0.8" />

                          {/* Dotted Wear Limit Ring Line (L_min Indicator) */}
                          <ellipse cx="0" cy="70" rx="30" ry="12" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 3" />

                          {/* Tip Chamfer & Cutting Diameter Ellipse */}
                          <circle cx="0" cy="95" r="14" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" />
                        </g>
                      ) : isDie ? (
                        /* DIE GEOMETRY (Pierce Die, Burring Die, Block Die) */
                        <g 
                          stroke={renderMode === 'WIREFRAME' ? '#00FF00' : renderMode === 'X_RAY' ? '#38bdf8' : '#64748b'} 
                          strokeWidth={renderMode === 'WIREFRAME' ? '1.5' : '1'} 
                          fill={renderMode === 'WIREFRAME' ? 'none' : renderMode === 'X_RAY' ? 'url(#xRayGradient)' : 'url(#metalMainShaded)'}
                        >
                          {/* Outer Die Block 3D Isometric Faces */}
                          <path d="M -75,-50 L 75,-50 L 75,50 L -75,50 Z" fill={renderMode === 'WIREFRAME' ? 'none' : '#334155'} />
                          <path d="M 75,-50 L 115,-20 L 115,80 L 75,50 Z" fill={renderMode === 'WIREFRAME' ? 'none' : '#1e293b'} />
                          <path d="M -75,50 L 75,50 L 115,80 L -35,80 Z" fill={renderMode === 'WIREFRAME' ? 'none' : '#0f172a'} />

                          {/* Counterbore Entry Chamfer */}
                          <ellipse cx="20" cy="15" rx="36" ry="18" fill="#000000" stroke="#00FF00" strokeWidth="2" />
                          <ellipse cx="20" cy="35" rx="36" ry="18" fill="none" stroke="#00FF00" strokeWidth="1" strokeDasharray="3 3" />

                          {/* Inner Precision Slug Relief Hole Wireframes */}
                          <ellipse cx="20" cy="55" rx="28" ry="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />

                          {/* Die Corner Mounting Holes */}
                          <circle cx="-50" cy="-25" r="7" fill="none" stroke="#00FF00" strokeWidth="1" />
                          <circle cx="50" cy="-25" r="7" fill="none" stroke="#00FF00" strokeWidth="1" />
                        </g>
                      ) : isSlit ? (
                        /* SLIT / CUTTER / SHEAR BLADE GEOMETRY */
                        <g 
                          stroke={renderMode === 'WIREFRAME' ? '#00FF00' : renderMode === 'X_RAY' ? '#38bdf8' : '#475569'} 
                          strokeWidth={renderMode === 'WIREFRAME' ? '1.5' : '1'} 
                          fill={renderMode === 'WIREFRAME' ? 'none' : renderMode === 'X_RAY' ? 'url(#xRayGradient)' : 'url(#metalMainShaded)'}
                        >
                          {/* Shear Blade Body Block */}
                          <path d="M -80,-60 L 80,-60 L 80,40 L -80,40 Z" fill={renderMode === 'WIREFRAME' ? 'none' : '#334155'} />
                          <path d="M 80,-60 L 110,-35 L 110,65 L 80,40 Z" fill={renderMode === 'WIREFRAME' ? 'none' : '#1e293b'} />
                          <path d="M -80,40 L 80,40 L 110,65 L -50,65 Z" fill={renderMode === 'WIREFRAME' ? 'none' : '#0f172a'} />

                          {/* Angled Shear Cutting Edge Bevel */}
                          <path d="M -80,-60 L 80,-40 L 80,-20 L -80,-40 Z" fill={renderMode === 'WIREFRAME' ? 'none' : 'url(#metalGreenHighlight)'} stroke="#00FF00" strokeWidth="2" />
                          <line x1="-80" y1="-40" x2="80" y2="-20" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 2" />

                          {/* Mounting Counterbore Slots */}
                          <rect x="-40" y="-10" width="25" height="30" rx="12" fill="none" stroke="#00FF00" strokeWidth="1.5" />
                          <rect x="20" y="-10" width="25" height="30" rx="12" fill="none" stroke="#00FF00" strokeWidth="1.5" />
                        </g>
                      ) : isPin ? (
                        /* GUIDE PIN / PILOT PIN GEOMETRY */
                        <g 
                          stroke={renderMode === 'WIREFRAME' ? '#00FF00' : renderMode === 'X_RAY' ? '#38bdf8' : '#475569'} 
                          strokeWidth={renderMode === 'WIREFRAME' ? '1.5' : '1'} 
                          fill={renderMode === 'WIREFRAME' ? 'none' : renderMode === 'X_RAY' ? 'url(#xRayGradient)' : 'url(#metalMainShaded)'}
                        >
                          {/* Domed Pilot Head Top */}
                          <path d="M -30,-80 Q 0,-115 30,-80 Z" fill={renderMode === 'WIREFRAME' ? 'none' : '#00FF00'} opacity="0.8" />
                          <ellipse cx="0" cy="-80" rx="30" ry="12" fill={renderMode === 'WIREFRAME' ? 'none' : '#94a3b8'} />

                          {/* Main Precision Ground Shaft Body */}
                          <path d="M -30,-80 L -30,80 A 30 12 0 0 0 30,80 L 30,-80 Z" />
                          <ellipse cx="0" cy="80" rx="30" ry="12" fill={renderMode === 'WIREFRAME' ? 'none' : '#64748b'} />

                          {/* Retaining Ring Groove */}
                          <path d="M -35,30 L -35,45 A 35 14 0 0 0 35,45 L 35,30 Z" fill="none" stroke="#00FF00" strokeWidth="1.5" strokeDasharray="3 2" />

                          {/* Axis Centerline */}
                          <line x1="0" y1="-120" x2="0" y2="100" stroke="#00FF00" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                        </g>
                      ) : (
                        /* FORM / BUCKING / GENERIC PRECISION TOOLING */
                        <g 
                          stroke={renderMode === 'WIREFRAME' ? '#00FF00' : renderMode === 'X_RAY' ? '#38bdf8' : '#475569'} 
                          strokeWidth={renderMode === 'WIREFRAME' ? '1.5' : '1'} 
                          fill={renderMode === 'WIREFRAME' ? 'none' : renderMode === 'X_RAY' ? 'url(#xRayGradient)' : 'url(#metalMainShaded)'}
                        >
                          <ellipse cx="0" cy="-80" rx="60" ry="24" fill={renderMode === 'WIREFRAME' ? 'none' : '#94a3b8'} />
                          <path d="M -60,-80 L -60,-10 A 60 24 0 0 0 60,-10 L 60,-80 Z" />
                          <ellipse cx="0" cy="-10" rx="60" ry="24" />

                          <path d="M -60,-10 L -40,60 A 40 16 0 0 0 40,60 L 60,-10 Z" fill={renderMode === 'WIREFRAME' ? 'none' : 'url(#metalGreenHighlight)'} />
                          <ellipse cx="0" cy="60" rx="40" ry="16" fill={renderMode === 'WIREFRAME' ? 'none' : '#00FF00'} opacity="0.8" />
                        </g>
                      )}
                    </svg>
                  </div>
                </div>

                {/* Canvas Floating Bottom Info Bar */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-t border-[#2a2b34] pt-2.5 mt-auto flex-wrap gap-2 z-20 bg-[#121317]/80 backdrop-blur-md px-2 rounded-lg">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Compass className="w-4 h-4 text-[#00FF00] animate-spin" style={{ animationDuration: '10s' }} />
                    <span>🖱️ คลิกและลากเมาส์หมุน 360° | Zoom: {(zoomScale * 100).toFixed(0)}%</span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-emerald-400 font-bold">Standard: Fin Die Ø5 & Ø7</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-[#00FF00] font-mono">High-Precision Geometry Model</span>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* Tab 2: Calculation Ladder Step Table (Full Width) */
            <div className="bg-[#14151a] border border-[#2a2b34] rounded-xl p-5 space-y-4 h-full overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#2d2e38] pb-3">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2 font-mono">
                    <Calculator className="w-5 h-5 text-[#00FF00]" />
                    <span>ตารางลำดับรอบการเจียรลับคม (Regrind Life Cycle Step Ladder)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    แสดงสเปกการลดลงของความยาวจากการเจียรแต่ละครั้ง ตั้งแต่พาร์ทใหม่ (L₀ = {newSpecNum.toFixed(2)} mm) จนถึงเกณฑ์ทิ้ง (L<sub>min</sub> = {scrapLimitNum.toFixed(2)} mm)
                  </p>
                </div>
                <div className="text-right font-mono text-xs bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="text-[#00FF00] font-bold block">
                    Max Capacity: {typeof maxCyclesCalculated === 'number' ? `${maxCyclesCalculated} Cycles` : maxCyclesCalculated}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    ระยะเจียรรวมสูงสุด: {totalAllowableGrind.toFixed(2)} mm
                  </span>
                </div>
              </div>

              {/* Step Ladder Matrix Table */}
              <div className="overflow-x-auto rounded-lg border border-[#2d2e38]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#1a1b22] text-slate-300 uppercase text-[10px] border-b border-[#2d2e38]">
                    <tr>
                      <th className="py-2.5 px-4 text-center w-20">รอบที่ (Cycle)</th>
                      <th className="py-2.5 px-4">สถานะพาร์ท / รอบการซ่อมบำรุง</th>
                      <th className="py-2.5 px-4 text-center">ความยาวพาร์ทที่เหลือ (L)</th>
                      <th className="py-2.5 px-4 text-center">ระยะเจียรสะสม (Σ Δl)</th>
                      <th className="py-2.5 px-4 text-center">การประเมินสภาพและข้อควรระวัง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262732] bg-[#101115]">
                    {/* Cycle 0 (Brand New Part) */}
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-4 text-center font-bold text-[#00FF00] bg-[#00FF00]/5">0</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ชิ้นส่วนใหม่จากโรงงาน (Brand New L₀)
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-white text-sm">{newSpecNum.toFixed(2)} mm</td>
                      <td className="py-2.5 px-4 text-center text-slate-400">0.00 mm</td>
                      <td className="py-2.5 px-4 text-center text-emerald-400 font-bold">สมบูรณ์ 100% ตามมาตรฐาน DWG</td>
                    </tr>

                    {/* Step Iterations */}
                    {typeof maxCyclesCalculated === 'number' && maxCyclesCalculated > 0 && Array.from({ length: Math.min(20, maxCyclesCalculated) }, (_, idx) => {
                      const cycleNum = idx + 1;
                      const remLen = Math.max(scrapLimitNum, newSpecNum - cycleNum * perGrindNum);
                      const accumGrind = cycleNum * perGrindNum;
                      const isLast = cycleNum === maxCyclesCalculated;

                      return (
                        <tr key={cycleNum} className={`hover:bg-white/5 transition-colors ${isLast ? 'bg-amber-500/10' : ''}`}>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-300">{cycleNum}</td>
                          <td className="py-2.5 px-4 text-slate-300">
                            {isLast ? (
                              <strong className="text-amber-400 font-bold">เจียรครั้งสุดท้าย (Final Allowed Regrind Cycle)</strong>
                            ) : (
                              `ผ่านการเจียรลับคมครั้งที่ ${cycleNum}`
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-purple-300 text-sm">{remLen.toFixed(2)} mm</td>
                          <td className="py-2.5 px-4 text-center text-slate-400">{accumGrind.toFixed(2)} mm</td>
                          <td className="py-2.5 px-4 text-center">
                            {isLast ? (
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                ⚠️ ใกล้ถึงเกณฑ์ Scrap Limit
                              </span>
                            ) : (
                              <span className="text-slate-400">อยู่ในเกณฑ์สเปกใช้งานได้ปกติ</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Scrap Row */}
                    <tr className="bg-rose-500/10 hover:bg-rose-500/15 transition-colors">
                      <td className="py-2.5 px-4 text-center font-bold text-rose-400 bg-rose-500/10">&gt; Max</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          หมดสเปก / ปลดระวาง (Scrap Standard)
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-rose-400 text-sm">&lt; {scrapLimitNum.toFixed(2)} mm</td>
                      <td className="py-2.5 px-4 text-center text-rose-300">&gt; {totalAllowableGrind.toFixed(2)} mm</td>
                      <td className="py-2.5 px-4 text-center text-rose-400 font-bold">ต้องปลดระวางและเปลี่ยนชิ้นใหม่ทันที</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#18191c] border-t border-[#2d2e38] text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00FF00]" />
            <span>Fin Die Tooling Specification Standard Rev 2025 - 3D Simulation & Verification</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#25262c] hover:bg-[#32333b] text-white font-bold rounded-lg border border-white/10 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
