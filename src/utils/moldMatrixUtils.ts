export type MoldType = 'TYPE_A' | 'TYPE_B' | 'TYPE_C' | 'TYPE_D' | 'TYPE_E';

export interface StageDefinition {
  stageCode: string;
  stageName: string;
  partCode: string;
  partName: string;
  positions: number;
}

export function getMoldTypeForLine(lineId: string): MoldType {
  switch (lineId) {
    case 'E1':
      return 'TYPE_A'; // 7Ø Slit 3Pitch 60Row
    case 'E3-1':
    case 'E3-2':
    case 'E3-3':
      return 'TYPE_C'; // 7Ø Wide Louver 4Pitch 42Row
    case 'E2':
      return 'TYPE_D'; // Ø5 Slit / Louver 3Pitch 68Row
    case 'E4':
    case 'E5':
      return 'TYPE_E'; // Ø5 Slit / Louver 3Pitch 66Row
    default:
      return 'TYPE_A';
  }
}

export function getStagesForMoldType(moldType: MoldType): StageDefinition[] {
  switch (moldType) {
    case 'TYPE_A':
      return [
        { stageCode: 'STG-01-FORM-TOP', stageName: 'Forming 1-2 Stage (Top)', partCode: 'P-FORM-001', partName: 'Forming Punch (Top)', positions: 180 },
        { stageCode: 'STG-01-FORM-BOT', stageName: 'Forming 1-2 Stage (Bottom)', partCode: 'D-FORM-001', partName: 'Forming Die (Bottom)', positions: 180 },
        { stageCode: 'STG-02-PRC-TOP', stageName: 'Piercing Stage (Top)', partCode: 'P-PRC-001', partName: 'Piercing Punch (Top)', positions: 180 },
        { stageCode: 'STG-02-PRC-BOT', stageName: 'Piercing Stage (Bottom)', partCode: 'D-PRC-001', partName: 'Piercing Die (Bottom)', positions: 180 },
        { stageCode: 'STG-03-IRON-TOP', stageName: 'Ironing Stage (Top)', partCode: 'P-IRON-001', partName: 'Ironing Punch (Top)', positions: 180 },
        { stageCode: 'STG-03-IRON-BOT', stageName: 'Ironing Stage (Bottom)', partCode: 'D-IRON-001', partName: 'Ironing Die (Bottom)', positions: 180 },
        { stageCode: 'STG-04-SLT-P', stageName: 'Louver / Slit Stage (Punch)', partCode: 'P-SLIT-001', partName: 'Slit Punch', positions: 180 },
        { stageCode: 'STG-04-SLT-D', stageName: 'Louver / Slit Stage (Die)', partCode: 'D-SLIT-001', partName: 'Slit Die', positions: 15 },
        { stageCode: 'STG-05-REFL-TOP', stageName: 'Reflare Stage (Top)', partCode: 'P-REFL-001', partName: 'Reflare Punch (Top)', positions: 180 },
        { stageCode: 'STG-05-REFL-BOT', stageName: 'Reflare Stage (Bottom)', partCode: 'D-REFL-001', partName: 'Reflare Die (Bottom)', positions: 180 },
        { stageCode: 'STG-06-CEN-P', stageName: 'Center Notching (Punch)', partCode: 'P-CEN-001', partName: 'Center Notching Punch', positions: 3 }, // A=1, B=1, C=1
        { stageCode: 'STG-06-CEN-D', stageName: 'Center Notching (Die)', partCode: 'D-CEN-001', partName: 'Center Notching Die', positions: 31 }, // A=1, B=29, C=1
        { stageCode: 'STG-07-COR-P', stageName: 'Corner Cut (Punch)', partCode: 'P-COR-001', partName: 'Corner Cut Punch', positions: 62 },
        { stageCode: 'STG-07-COR-D', stageName: 'Corner Cut (Die)', partCode: 'D-COR-001', partName: 'Corner Cut Die', positions: 62 },
        { stageCode: 'STG-08-SIDE-P', stageName: 'Side Cut (Punch)', partCode: 'P-SIDE-001', partName: 'Side Cut Punch', positions: 2 },
        { stageCode: 'STG-08-SIDE-D', stageName: 'Side Cut (Die)', partCode: 'D-SIDE-001', partName: 'Side Cut Die', positions: 2 },
        { stageCode: 'STG-09-PILOT', stageName: 'Pilot Stage', partCode: 'P-PILOT-001', partName: 'Pilot Punch', positions: 60 },
        { stageCode: 'STG-10-RWS-TOP', stageName: 'Row Slit Stage (Top)', partCode: 'P-RWS-001', partName: 'Row Slit Blade (Top)', positions: 59 },
        { stageCode: 'STG-10-RWS-BOT', stageName: 'Row Slit Stage (Bottom)', partCode: 'D-RWS-001', partName: 'Row Slit Blade (Bottom)', positions: 59 },
        { stageCode: 'STG-11-CUT-P', stageName: 'Cut Off (Punch)', partCode: 'P-CUT-001', partName: 'Cut Off Punch', positions: 2 },
        { stageCode: 'STG-11-CUT-D', stageName: 'Cut Off (Die)', partCode: 'D-CUT-001', partName: 'Cut Off Die', positions: 2 },
      ];
    case 'TYPE_B':
      return [
        { stageCode: 'STG-01-FORM-TOP', stageName: 'Forming 1-2 Stage (Top)', partCode: 'P-FORM-001', partName: 'Forming Punch (Top)', positions: 180 },
        { stageCode: 'STG-01-FORM-BOT', stageName: 'Forming 1-2 Stage (Bottom)', partCode: 'D-FORM-001', partName: 'Forming Die (Bottom)', positions: 180 },
        { stageCode: 'STG-02-PRC-TOP', stageName: 'Piercing Stage (Top)', partCode: 'P-PRC-001', partName: 'Piercing Punch (Top)', positions: 180 },
        { stageCode: 'STG-02-PRC-BOT', stageName: 'Piercing Stage (Bottom)', partCode: 'D-PRC-001', partName: 'Piercing Die (Bottom)', positions: 180 },
        { stageCode: 'STG-03-IRON-TOP', stageName: 'Ironing Stage (Top)', partCode: 'P-IRON-001', partName: 'Ironing Punch (Top)', positions: 180 },
        { stageCode: 'STG-03-IRON-BOT', stageName: 'Ironing Stage (Bottom)', partCode: 'D-IRON-001', partName: 'Ironing Die (Bottom)', positions: 180 },
        { stageCode: 'STG-04-LOUV-P', stageName: 'Louver Stage (Punch)', partCode: 'P-LOUV-001', partName: 'Louver Punch', positions: 168 },
        { stageCode: 'STG-04-LOUV-D', stageName: 'Louver Stage (Die)', partCode: 'D-LOUV-001', partName: 'Louver Die', positions: 168 },
        { stageCode: 'STG-05-REFL-TOP', stageName: 'Reflare Stage (Top)', partCode: 'P-REFL-001', partName: 'Reflare Punch (Top)', positions: 180 },
        { stageCode: 'STG-05-REFL-BOT', stageName: 'Reflare Stage (Bottom)', partCode: 'D-REFL-001', partName: 'Reflare Die (Bottom)', positions: 180 },
        // Center Notching: NONE
        // Corner Cut: NONE
        { stageCode: 'STG-08-SIDE-P', stageName: 'Side Cut (Punch)', partCode: 'P-SIDE-001', partName: 'Side Cut Punch', positions: 2 },
        { stageCode: 'STG-08-SIDE-D', stageName: 'Side Cut (Die)', partCode: 'D-SIDE-001', partName: 'Side Cut Die', positions: 2 },
        { stageCode: 'STG-09-PILOT', stageName: 'Pilot Stage', partCode: 'P-PILOT-001', partName: 'Pilot Punch', positions: 60 },
        { stageCode: 'STG-10-RWS-TOP', stageName: 'Row Slit Stage (Top)', partCode: 'P-RWS-001', partName: 'Row Slit Blade (Top)', positions: 59 },
        { stageCode: 'STG-10-RWS-BOT', stageName: 'Row Slit Stage (Bottom)', partCode: 'D-RWS-001', partName: 'Row Slit Blade (Bottom)', positions: 59 },
        { stageCode: 'STG-11-CUT-P', stageName: 'Cut Off (Punch)', partCode: 'P-CUT-001', partName: 'Cut Off Punch', positions: 2 },
        { stageCode: 'STG-11-CUT-D', stageName: 'Cut Off (Die)', partCode: 'D-CUT-001', partName: 'Cut Off Die', positions: 2 },
      ];
    case 'TYPE_C':
      return [
        { stageCode: 'STG-01-FORM-WL-TOP', stageName: 'Forming WL+ 1-2 Stage (Top)', partCode: 'P-FORM-WL-001', partName: 'Forming Punch WL+', positions: 168 },
        { stageCode: 'STG-01-FORM-WL-BOT', stageName: 'Forming WL+ 1-2 Stage (Bottom)', partCode: 'D-FORM-WL-001', partName: 'Forming Die WL+', positions: 168 },
        { stageCode: 'STG-02-PRC-WL-TOP', stageName: 'Piercing Stage WL+ (Top)', partCode: 'P-PRC-WL-001', partName: 'Piercing Punch WL+', positions: 168 },
        { stageCode: 'STG-02-PRC-WL-BOT', stageName: 'Piercing Stage WL+ (Bottom)', partCode: 'D-PRC-WL-001', partName: 'Piercing Die WL+', positions: 168 },
        { stageCode: 'STG-03-IRON-WL-TOP', stageName: 'Ironing Stage WL+ (Top)', partCode: 'P-IRON-WL-001', partName: 'Ironing Punch WL+', positions: 168 },
        { stageCode: 'STG-03-IRON-WL-BOT', stageName: 'Ironing Stage WL+ (Bottom)', partCode: 'D-IRON-WL-001', partName: 'Ironing Die WL+', positions: 168 },
        { stageCode: 'STG-08-SIDE-WL-P', stageName: 'Side Cut Stage WL+ (Punch)', partCode: 'P-SIDE-WL-001', partName: 'Side Cut Punch WL+', positions: 2 },
        { stageCode: 'STG-08-SIDE-WL-D', stageName: 'Side Cut Stage WL+ (Die)', partCode: 'D-SIDE-WL-001', partName: 'Side Cut Die WL+', positions: 2 },
        { stageCode: 'STG-05-REFL-WL-TOP', stageName: 'Reflare Stage WL+ (Top)', partCode: 'P-REFL-WL-001', partName: 'Reflare Punch WL+', positions: 168 },
        { stageCode: 'STG-05-REFL-WL-BOT', stageName: 'Reflare Stage WL+ (Bottom)', partCode: 'D-REFL-WL-001', partName: 'Reflare Die WL+', positions: 168 },
        { stageCode: 'STG-09-PILOT-WL', stageName: 'Pilot Stage WL+', partCode: 'P-PILOT-WL-001', partName: 'Pilot Punch WL+', positions: 42 },
        { stageCode: 'STG-10-RWS-WL-TOP', stageName: 'Row Slit Stage WL+ (Top)', partCode: 'P-RWS-WL-001', partName: 'Row Slit Blade WL+ (Top)', positions: 82 },
        { stageCode: 'STG-10-RWS-WL-BOT', stageName: 'Row Slit Stage WL+ (Bottom)', partCode: 'D-RWS-WL-001', partName: 'Row Slit Blade WL+ (Bottom)', positions: 82 },
        { stageCode: 'STG-11-CUT-P', stageName: 'Cut Off Stage (Punch)', partCode: 'P-CUT-001', partName: 'Cut Off Punch', positions: 4 },
        { stageCode: 'STG-11-CUT-D', stageName: 'Cut Off Stage (Die)', partCode: 'D-CUT-001', partName: 'Cut Off Die', positions: 4 },
      ];
    case 'TYPE_D':
      return [
        { stageCode: 'STG-01-FORM-TOP', stageName: 'Forming 1-2 Stage (Top)', partCode: 'P-FORM-001', partName: 'Forming Punch (Top)', positions: 204 },
        { stageCode: 'STG-01-FORM-BOT', stageName: 'Forming 1-2 Stage (Bottom)', partCode: 'D-FORM-001', partName: 'Forming Die (Bottom)', positions: 204 },
        { stageCode: 'STG-02-PRC-TOP', stageName: 'Piercing Stage (Top)', partCode: 'P-PRC-001', partName: 'Piercing Punch (Top)', positions: 204 },
        { stageCode: 'STG-02-PRC-BOT', stageName: 'Piercing Stage (Bottom)', partCode: 'D-PRC-001', partName: 'Piercing Die (Bottom)', positions: 204 },
        { stageCode: 'STG-03-IRON-TOP', stageName: 'Ironing Stage (Top)', partCode: 'P-IRON-001', partName: 'Ironing Punch (Top)', positions: 204 },
        { stageCode: 'STG-03-IRON-BOT', stageName: 'Ironing Stage (Bottom)', partCode: 'D-IRON-001', partName: 'Ironing Die (Bottom)', positions: 204 },
        { stageCode: 'STG-04-SLT-P', stageName: 'Louver / Slit Stage (Punch)', partCode: 'P-SLIT-001', partName: 'Slit Punch', positions: 204 },
        { stageCode: 'STG-04-SLT-DA3', stageName: 'Louver / Slit Stage (Die A 3 ROW)', partCode: 'D-SLIT-A3-001', partName: 'Slit Die A (3 ROW)', positions: 10 },
        { stageCode: 'STG-04-SLT-DA4', stageName: 'Louver / Slit Stage (Die A 4 ROW)', partCode: 'D-SLIT-A4-001', partName: 'Slit Die A (4 ROW)', positions: 1 },
        { stageCode: 'STG-04-SLT-DB3', stageName: 'Louver / Slit Stage (Die B 3 ROW)', partCode: 'D-SLIT-B3-001', partName: 'Slit Die B (3 ROW)', positions: 10 },
        { stageCode: 'STG-04-SLT-DB4', stageName: 'Louver / Slit Stage (Die B 4 ROW)', partCode: 'D-SLIT-B4-001', partName: 'Slit Die B (4 ROW)', positions: 1 },
        { stageCode: 'STG-05-REFL-TOP', stageName: 'Reflare Stage (Top)', partCode: 'P-REFL-001', partName: 'Reflare Punch (Top)', positions: 204 },
        { stageCode: 'STG-05-REFL-BOT', stageName: 'Reflare Stage (Bottom)', partCode: 'D-REFL-001', partName: 'Reflare Die (Bottom)', positions: 204 },
        // Center Notching: NONE
        // Corner Cut: NONE
        { stageCode: 'STG-08-SIDE-P', stageName: 'Side Cut Stage (Punch)', partCode: 'P-SIDE-001', partName: 'Side Cut Punch', positions: 2 },
        { stageCode: 'STG-08-SIDE-D', stageName: 'Side Cut Stage (Die)', partCode: 'D-SIDE-001', partName: 'Side Cut Die', positions: 2 },
        { stageCode: 'STG-09-PILOT', stageName: 'Pilot Stage', partCode: 'P-PILOT-001', partName: 'Pilot Punch', positions: 68 },
        { stageCode: 'STG-10-RWS-A-TOP', stageName: 'Row Slit Stage (Blade A Top)', partCode: 'P-RWS-A-001', partName: 'Row Slit Blade A (Top)', positions: 34 },
        { stageCode: 'STG-10-RWS-A-BOT', stageName: 'Row Slit Stage (Blade A Bottom)', partCode: 'D-RWS-A-001', partName: 'Row Slit Blade A (Bottom)', positions: 33 },
        { stageCode: 'STG-10-RWS-B-TOP', stageName: 'Row Slit Stage (Blade B Top)', partCode: 'P-RWS-B-001', partName: 'Row Slit Blade B (Top)', positions: 34 },
        { stageCode: 'STG-10-RWS-B-BOT', stageName: 'Row Slit Stage (Blade B Bottom)', partCode: 'D-RWS-B-001', partName: 'Row Slit Blade B (Bottom)', positions: 32 },
        { stageCode: 'STG-11-CUT-P', stageName: 'Cut Off Stage (Punch)', partCode: 'P-CUT-001', partName: 'Cut Off Punch', positions: 4 },
        { stageCode: 'STG-11-CUT-D', stageName: 'Cut Off Stage (Die)', partCode: 'D-CUT-001', partName: 'Cut Off Die', positions: 4 },
      ];
    case 'TYPE_E':
      return [
        { stageCode: 'STG-01-FORM-TOP', stageName: 'Forming 1-2 Stage (Top)', partCode: 'P-FORM-001', partName: 'Forming Punch (Top)', positions: 198 },
        { stageCode: 'STG-01-FORM-BOT', stageName: 'Forming 1-2 Stage (Bottom)', partCode: 'D-FORM-001', partName: 'Forming Die (Bottom)', positions: 198 },
        { stageCode: 'STG-02-PRC-TOP', stageName: 'Piercing Stage (Top)', partCode: 'P-PRC-001', partName: 'Piercing Punch (Top)', positions: 198 },
        { stageCode: 'STG-02-PRC-BOT', stageName: 'Piercing Stage (Bottom)', partCode: 'D-PRC-001', partName: 'Piercing Die (Bottom)', positions: 198 },
        { stageCode: 'STG-03-IRON-TOP', stageName: 'Ironing Stage (Top)', partCode: 'P-IRON-001', partName: 'Ironing Punch (Top)', positions: 198 },
        { stageCode: 'STG-03-IRON-BOT', stageName: 'Ironing Stage (Bottom)', partCode: 'D-IRON-001', partName: 'Ironing Die (Bottom)', positions: 198 },
        { stageCode: 'STG-04-SLT-P', stageName: 'Louver / Slit Stage (Punch)', partCode: 'P-SLIT-001', partName: 'Slit Punch', positions: 198 },
        { stageCode: 'STG-04-SLT-DA3', stageName: 'Louver / Slit Stage (Die A 3 ROW)', partCode: 'D-SLIT-A3-001', partName: 'Slit Die A (3 ROW)', positions: 10 },
        { stageCode: 'STG-04-SLT-DA4', stageName: 'Louver / Slit Stage (Die A 4 ROW)', partCode: 'D-SLIT-A4-001', partName: 'Slit Die A (4 ROW)', positions: 1 },
        { stageCode: 'STG-04-SLT-DB3', stageName: 'Louver / Slit Stage (Die B 3 ROW)', partCode: 'D-SLIT-B3-001', partName: 'Slit Die B (3 ROW)', positions: 10 },
        { stageCode: 'STG-04-SLT-DB4', stageName: 'Louver / Slit Stage (Die B 4 ROW)', partCode: 'D-SLIT-B4-001', partName: 'Slit Die B (4 ROW)', positions: 1 },
        { stageCode: 'STG-05-REFL-TOP', stageName: 'Reflare Stage (Top)', partCode: 'P-REFL-001', partName: 'Reflare Punch (Top)', positions: 198 },
        { stageCode: 'STG-05-REFL-BOT', stageName: 'Reflare Stage (Bottom)', partCode: 'D-REFL-001', partName: 'Reflare Die (Bottom)', positions: 198 },
        // Center Notching: NONE
        // Corner Cut: NONE
        { stageCode: 'STG-08-SIDE-P', stageName: 'Side Cut Stage (Punch)', partCode: 'P-SIDE-001', partName: 'Side Cut Punch', positions: 2 },
        { stageCode: 'STG-08-SIDE-D', stageName: 'Side Cut Stage (Die)', partCode: 'D-SIDE-001', partName: 'Side Cut Die', positions: 2 },
        { stageCode: 'STG-09-PILOT', stageName: 'Pilot Stage', partCode: 'P-PILOT-001', partName: 'Pilot Punch', positions: 66 },
        { stageCode: 'STG-10-RWS-A-TOP', stageName: 'Row Slit Stage (Blade A Top)', partCode: 'P-RWS-A-001', partName: 'Row Slit Blade A (Top)', positions: 33 },
        { stageCode: 'STG-10-RWS-A-BOT', stageName: 'Row Slit Stage (Blade A Bottom)', partCode: 'D-RWS-A-001', partName: 'Row Slit Blade A (Bottom)', positions: 33 },
        { stageCode: 'STG-10-RWS-B-TOP', stageName: 'Row Slit Stage (Blade B Top)', partCode: 'P-RWS-B-001', partName: 'Row Slit Blade B (Top)', positions: 32 },
        { stageCode: 'STG-10-RWS-B-BOT', stageName: 'Row Slit Stage (Blade B Bottom)', partCode: 'D-RWS-B-001', partName: 'Row Slit Blade B (Bottom)', positions: 32 },
        { stageCode: 'STG-11-CUT-P', stageName: 'Cut Off Stage (Punch)', partCode: 'P-CUT-001', partName: 'Cut Off Punch', positions: 4 },
        { stageCode: 'STG-11-CUT-D', stageName: 'Cut Off Stage (Die)', partCode: 'D-CUT-001', partName: 'Cut Off Die', positions: 4 },
      ];
    default:
      return [];
  }
}
