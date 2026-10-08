/**
 * Safe Storage Service
 * Resilient wrapper around localStorage with automatic QuotaExceeded recovery,
 * in-memory fallback, obsolete key cleanup, and log compaction.
 */

const IN_MEMORY_CACHE = new Map<string, string>();

// Known log keys that can be safely compacted when storage is tight
const COMPACTABLE_LOG_KEYS = [
  'fin_press_audit_logs',
  'fin_press_shot_logs',
  'fin_press_downtime_logs',
  'fin_press_system_alerts',
  'fin_press_offline_buffer',
  'fin_press_replacements',
  'fin_press_inspections'
];

// Active current keys across the application
const CURRENT_ACTIVE_KEYS = new Set([
  'fin_press_users',
  'fin_press_current_user',
  'fin_press_part_masters',
  'fin_press_line_configs',
  'fin_press_life_standards',
  'fin_press_line_monitoring',
  'fin_press_spare_stocks',
  'fin_press_replacements',
  'fin_press_replacement_drafts',
  'fin_press_regrinds',
  'fin_press_regrind_standards',
  'fin_press_inspections',
  'fin_press_shot_logs',
  'fin_press_shot_drafts',
  'fin_press_audit_logs',
  'fin_press_settings',
  'fin_press_plc_config',
  'fin_press_plc_mappings',
  'fin_press_gateway_status',
  'fin_press_system_alerts',
  'fin_press_offline_buffer',
  'fin_press_position_locks',
  'fin_press_downtime_logs',
  'fin_press_active_e3_fin_die',
  'fin_press_custom_stage_groups',
  'fin_press_tv_display_configs',
  'fin_press_seed_init_v12_stages_2025',
  'fin_die_regrind_queue_v3',
  'fin_die_regrind_matrices_v2',
  'fin_die_purchasing_requisitions_v2',
  'fin_die_regrind_masters_v2',
  'fin_die_master_log_records_v1',
  'findie_tv_autocycle_config_v2',
  'app_language'
]);

class SafeStorage {
  private hasInitialized = false;

  constructor() {
    this.initCleanup();
  }

  private initCleanup() {
    if (this.hasInitialized) return;
    this.hasInitialized = true;
    try {
      this.purgeObsoleteKeys();
    } catch {
      // Ignore background cleanup issues
    }
  }

  /**
   * Purge legacy versioned keys and orphaned data from previous app iterations
   */
  public purgeObsoleteKeys(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Legacy regrind queue keys v1 & v2
        if (key === 'fin_die_regrind_queue_v1' || key === 'fin_die_regrind_queue_v2') {
          keysToRemove.push(key);
        }
        // Legacy regrind matrix keys
        else if (key === 'fin_die_regrind_matrices_v1') {
          keysToRemove.push(key);
        }
        // Legacy tooling masters
        else if (key === 'fin_die_regrind_masters_v1') {
          keysToRemove.push(key);
        }
        // Legacy purchasing requisitions
        else if (key === 'fin_die_purchasing_requisitions_v1') {
          keysToRemove.push(key);
        }
        // Obsolete seed initializers from older version runs
        else if (key.startsWith('fin_press_seed_init_') && key !== 'fin_press_seed_init_v12_stages_2025') {
          keysToRemove.push(key);
        }
        // Temporary test keys
        else if (key.startsWith('test_') || key.includes('__temp__')) {
          keysToRemove.push(key);
        }
      }

      for (const k of keysToRemove) {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * Compact bloated history arrays to free storage space
   */
  public compactLogs(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    for (const key of COMPACTABLE_LOG_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 30) {
          const compacted = parsed.slice(0, 30);
          localStorage.setItem(key, JSON.stringify(compacted));
        }
      } catch {
        // If unparseable or error, remove to prevent deadlock
        try {
          if (key === 'fin_press_offline_buffer' || key === 'fin_press_shot_drafts') {
            localStorage.removeItem(key);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Safely set an item with automatic QuotaExceededError recovery and fallback
   */
  public setItem(key: string, value: string): boolean {
    // Always update in-memory cache first
    IN_MEMORY_CACHE.set(key, value);

    if (typeof window === 'undefined' || !window.localStorage) {
      return true;
    }

    // 1st attempt: Standard write
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err: any) {
      // QuotaExceededError or security block
      const isQuotaError = 
        err?.name === 'QuotaExceededError' ||
        err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err?.code === 22 ||
        err?.code === 1014;

      if (!isQuotaError) {
        console.warn(`[SafeStorage] Non-quota error while saving "${key}":`, err?.message || err);
        return true; // cached in-memory
      }

      console.warn(`[SafeStorage] Storage quota reached while setting "${key}". Initiating emergency compaction...`);

      // 2nd attempt: Purge obsolete keys and compact logs
      try {
        this.purgeObsoleteKeys();
        this.compactLogs();
        localStorage.setItem(key, value);
        return true;
      } catch {
        // Proceed to aggressive recovery
      }

      // 3rd attempt: If saving an array of items (like regrind tickets or logs), compact the payload itself
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 25) {
          // If queue tickets: prioritize active tickets, prune old completed ones
          if (key.includes('regrind_queue')) {
            const active = parsed.filter((t: any) => t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED');
            const finished = parsed.filter((t: any) => t.status === 'READY' || t.status === 'SCRAP').slice(0, 20);
            const trimmed = [...active, ...finished];
            const trimmedStr = JSON.stringify(trimmed);
            IN_MEMORY_CACHE.set(key, trimmedStr);
            localStorage.setItem(key, trimmedStr);
            return true;
          } else {
            const trimmedStr = JSON.stringify(parsed.slice(0, 25));
            IN_MEMORY_CACHE.set(key, trimmedStr);
            localStorage.setItem(key, trimmedStr);
            return true;
          }
        }
      } catch {
        // Not a JSON array
      }

      // 4th attempt: Aggressive log purge (empty heavy non-essential logs)
      try {
        localStorage.removeItem('fin_press_offline_buffer');
        localStorage.removeItem('fin_press_shot_logs');
        localStorage.setItem('fin_press_audit_logs', JSON.stringify([]));
        localStorage.setItem(key, value);
        return true;
      } catch {
        // Safe in-memory fallback
        console.warn(`[SafeStorage] Preserving "${key}" in fast memory cache (LocalStorage fully utilized)`);
        return true;
      }
    }
  }

  /**
   * Safely retrieve an item from localStorage or in-memory fallback
   */
  public getItem(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return IN_MEMORY_CACHE.get(key) || null;
    }

    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        IN_MEMORY_CACHE.set(key, val);
        return val;
      }
    } catch {
      // Storage access blocked or threw
    }

    return IN_MEMORY_CACHE.get(key) || null;
  }

  /**
   * Safely remove an item
   */
  public removeItem(key: string): void {
    IN_MEMORY_CACHE.delete(key);
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  /**
   * Check if a key exists
   */
  public hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }
}

export const safeStorage = new SafeStorage();
