/**
 * Standard Stage Groups & Utilities for Mold Tooling Management
 * 12 Canonical Production Stages
 */

export const DEFAULT_STAGE_GROUPS: string[] = [
  'PIERCE & BURRING',
  'IRONING',
  'LOUVER',
  'REFLARE',
  'SLIT',
  'WIDE LOWER',
  'ROW SLIT',
  'CUT OFF',
  'SIDE CUT',
  'S1 CENTER NOTCH',
  'CORNER CUT',
  'S5 CENTER NOTCH',
  'HITCH FEED'
];

/**
 * Sorts stage names according to standard production process sequence
 */
export function sortStagesInOrder(stages: string[]): string[] {
  const normalizedDefaults = DEFAULT_STAGE_GROUPS.map(g => g.toUpperCase());
  
  const getIndex = (stg: string) => {
    if (!stg) return 999;
    const s = stg.toUpperCase();
    
    // 1. Exact match
    const exactIdx = normalizedDefaults.indexOf(s);
    if (exactIdx !== -1) return exactIdx;
    
    // 2. Fuzzy match against default groups
    for (let i = 0; i < normalizedDefaults.length; i++) {
      const def = normalizedDefaults[i];
      // If default group contains the input or input contains the default
      if (def === s || def.includes(s) || s.includes(def)) return i;
      
      // Try splitting by common separators and matching words
      const defWords = def.split(/[&\s\/]+/).filter(w => w.length > 2);
      if (defWords.some(w => s.includes(w))) return i;
    }
    
    return -1;
  };

  return [...stages].sort((a, b) => {
    const idxA = getIndex(a);
    const idxB = getIndex(b);

    if (idxA !== -1 && idxB !== -1) {
      if (idxA === idxB) return a.localeCompare(b);
      return idxA - idxB;
    }
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Helper to strip 'Stage X:' prefix and extraneous non-ASCII from any custom user string
 */
export function cleanStageName(stageStr: string): string {
  if (!stageStr) return '';
  // 1. Remove "Stage X:" prefix
  let cleaned = stageStr.replace(/^Stage\s+\d+:\s*/i, '');
  // 2. Remove Thai characters inside parentheses, e.g. "(เจาะรู / ลบคม)"
  cleaned = cleaned.replace(/\s*\([^)]*[\u0E00-\u0E7F][^)]*\)\s*/g, ' ');
  // 3. Remove any trailing slashes or random punctuation left behind
  cleaned = cleaned.replace(/\s*\/\s*$/g, '');
  cleaned = cleaned.trim();
  
  // Match to canonical default stages if case matches
  const upper = cleaned.toUpperCase();
  for (const def of DEFAULT_STAGE_GROUPS) {
    if (def.toUpperCase() === upper) return def;
  }
  return cleaned;
}

/**
 * Normalizes raw stage names into standard Stage Groups, strictly honoring customStageGroups
 */
export function deriveLogicalStage(partName: string, currentStageName?: string, customStageGroups?: string[]): string {
  let stageStr = (currentStageName || '').trim();
  const partStr = (partName || '').trim().toUpperCase();
  const groupsToUse = customStageGroups && customStageGroups.length > 0 ? customStageGroups : DEFAULT_STAGE_GROUPS;

  const findInGroups = (target: string): string | undefined => {
    return groupsToUse.find(g => g.trim().toUpperCase() === target.trim().toUpperCase());
  };

  // Strip prefix if exists
  const stripped = cleanStageName(stageStr);

  // If already one of the active groups, return it directly
  if (groupsToUse.includes(stripped)) {
    return stripped;
  }

  // Exact uppercase match against groupsToUse
  const match = findInGroups(stripped);
  if (match) return match;

  // Combine stageStr and partStr for matching
  const combined = `${stageStr} ${partStr}`.toUpperCase();

  if (combined.includes('PIERCE') || combined.includes('BURRING') || combined.includes('PIERCING')) {
    const m = findInGroups('PIERCE & BURRING') || findInGroups('PIERCE') || findInGroups('BURRING');
    if (m) return m;
  }
  if (combined.includes('IRONING') || combined.includes('IRON')) {
    const m = findInGroups('IRONING');
    if (m) return m;
  }
  if (combined.includes('LOUVER')) {
    const m = findInGroups('LOUVER');
    if (m) return m;
  }
  if (combined.includes('REFLARE') || combined.includes('REFLAIRE') || combined.includes('REFL')) {
    const m = findInGroups('REFLARE');
    if (m) return m;
  }
  if (combined.includes('ROW SLIT') || combined.includes('ROW SLID')) {
    const m = findInGroups('ROW SLIT');
    if (m) return m;
  }
  if (combined.includes('SLIT')) {
    const m = findInGroups('SLIT');
    if (m) return m;
  }
  if (combined.includes('WIDE LOWER') || combined.includes('FORMING')) {
    const m = findInGroups('WIDE LOWER');
    if (m) return m;
  }
  if (combined.includes('CUT OFF') || combined.includes('CUTOFF')) {
    const m = findInGroups('CUT OFF');
    if (m) return m;
  }
  if (combined.includes('SIDE CUT') || combined.includes('SIDECUT')) {
    const m = findInGroups('SIDE CUT');
    if (m) return m;
  }
  if (combined.includes('S5') || (combined.includes('CENTER NOTCH') && combined.includes('S5'))) {
    const m = findInGroups('S5 CENTER NOTCH');
    if (m) return m;
  }
  if (combined.includes('S1') || (combined.includes('CENTER NOTCH') && combined.includes('S1'))) {
    const m = findInGroups('S1 CENTER NOTCH');
    if (m) return m;
  }
  if (combined.includes('CENTER NOTCH') || combined.includes('NOTCH')) {
    const m = findInGroups('S5 CENTER NOTCH') || findInGroups('S1 CENTER NOTCH') || findInGroups('CORNER CUT');
    if (m) return m;
  }
  if (combined.includes('CORNER CUT')) {
    const m = findInGroups('CORNER CUT');
    if (m) return m;
  }
  if (combined.includes('HITCH') || combined.includes('SIECH') || combined.includes('FEED PIN') || combined.includes('PILOT')) {
    const m = findInGroups('HITCH FEED');
    if (m) return m;
  }

  // Check if any custom stage in groupsToUse is contained in combined
  for (const g of groupsToUse) {
    if (g && g.length > 2 && combined.includes(g.toUpperCase())) {
      return g;
    }
  }

  // If it's a custom stage name created by user that isn't raw part name
  if (stripped && stripped !== '-' && !stripped.toUpperCase().includes('DIE') && !stripped.toUpperCase().includes('PUNCH')) {
    const userMatch = findInGroups(stripped);
    if (userMatch) return userMatch;
  }

  return groupsToUse[0] || 'PIERCE & BURRING';
}

/**
 * Maps and validates a live monitoring item against the 2D interactive layout's stage configuration
 */
export function isPartMatchingInteractiveStage(
  item: { partCode: string; partName: string; stagePunchDie: string },
  layoutPartCode: string,
  layoutStageName: string
): boolean {
  if (!item) return false;
  
  // Clean values for robust matching
  const lp = (layoutPartCode || '').toUpperCase();
  const ls = (layoutStageName || '').toUpperCase();
  const ipCode = (item.partCode || '').toUpperCase();
  const ipName = (item.partName || '').toUpperCase();
  const ipStage = (item.stagePunchDie || '').toUpperCase();

  // If partCode matches exactly, it's a direct link
  if (ipCode === lp) return true;

  // 1. BURRING PUNCH STAGE
  if (lp.includes('BURR') || ls.includes('BURRING')) {
    return (ipStage.includes('PIERCE') || ipStage.includes('BURRING')) && ipName.includes('BURRING');
  }

  // 2. PIERCE PUNCH STAGE
  if (lp.includes('PIERCE') || ls.includes('PIERCE')) {
    return (ipStage.includes('PIERCE') || ipStage.includes('BURRING')) && ipName.includes('PIERCE');
  }

  // 3. IRONING PUNCH STAGE
  if (lp.includes('IRON') || ls.includes('IRONING')) {
    return ipStage.includes('IRONING') || ipStage.includes('IRON');
  }

  // 4. REFLARE PUNCH STAGE
  if (lp.includes('REFL') || ls.includes('REFLARE')) {
    return ipStage.includes('REFLARE');
  }

  // 5. SLIT / LOUVER PUNCH STAGE
  if (lp.includes('SLIT-') || lp.includes('LOUV-') || lp.includes('SLIT_PUNCH') || ls.includes('SLIT PUNCH') || ls.includes('LOUVER PUNCH')) {
    return (ipStage.includes('SLIT') || ipStage.includes('LOUVER')) && !ipName.includes('DIE');
  }

  // 6. SLIT / LOUVER DIE STAGE (DIE A & DIE B)
  if (ls.includes('DIE STAGE') || ls.includes('SLIT / LOUVER DIE') || ls.includes('SLIT DIE') || ls.includes('LOUVER DIE')) {
    return (ipStage.includes('SLIT') || ipStage.includes('LOUVER')) && ipName.includes('DIE');
  }

  // 7. ROW SLIT BLADE STAGE
  if (lp.includes('ROW-') || ls.includes('ROW SLIT')) {
    return ipStage.includes('ROW SLIT');
  }

  // 8. CUT OFF STAGE
  if (lp.includes('CUT-') || ls.includes('CUT OFF') || ls.includes('CUTOFF')) {
    return ipStage.includes('CUT OFF') || ipStage.includes('CUTOFF');
  }

  // 9. SIDE CUT STAGE
  if (lp.includes('SIDE-') || ls.includes('SIDE CUT') || ls.includes('SIDECUT')) {
    return ipStage.includes('SIDE CUT') || ipStage.includes('SIDECUT');
  }

  // 10. S1 CENTER NOTCH STAGE
  if (ls.includes('S1 CENTER NOTCH')) {
    return ipStage.includes('S1 CENTER NOTCH');
  }

  // 11. S5 CENTER NOTCH STAGE
  if (ls.includes('S5 CENTER NOTCH')) {
    return ipStage.includes('S5 CENTER NOTCH');
  }

  // 12. CORNER CUT STAGE
  if (ls.includes('CORNER CUT')) {
    return ipStage.includes('CORNER CUT');
  }

  // 13. HITCH FEED STAGE
  if (ls.includes('HITCH FEED')) {
    return ipStage.includes('HITCH FEED');
  }

  // 14. WIDE LOWER STAGE
  if (ls.includes('WIDE LOWER')) {
    return ipStage.includes('WIDE LOWER');
  }

  // Fallback fuzzy match: if the logical stage is part of layout stage name or vice versa
  if (ls.includes(ipStage) || ipStage.includes(ls)) {
    return true;
  }

  return false;
}

