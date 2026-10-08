cat << 'INNER_EOF' >> src/services/storageService.ts

  public applyMigration(parts: PartMaster[], regrindMasters: RegrindMasterStandard[], configs: LineActiveConfiguration[], lifeStandards: PartLifeStandard[]) {
    localStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(parts));
    localStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(regrindMasters));
    localStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));
    localStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(lifeStandards));
    this.notify();
  }
INNER_EOF
