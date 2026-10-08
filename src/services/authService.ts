import { User, UserRole, RolePermissions } from '../types';

export const ROLE_DEFINITIONS: Record<UserRole, {
  label: string;
  labelTh: string;
  badgeClass: string;
  description: string;
  descriptionTh: string;
  primaryDuties: string[];
}> = {
  VIEWER: {
    label: 'Viewer',
    labelTh: 'ผู้สังเกตการณ์ / ผู้บริหาร',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    description: 'View TV monitoring boards and analytical reports only.',
    descriptionTh: 'ดูหน้าจอ TV มอนิเตอร์และรายงานสถิติเท่านั้น ไม่สามารถแก้ไขข้อมูลใดๆ ได้',
    primaryDuties: ['View TV dashboards', 'View MTBF and consumption reports', 'Read-only access']
  },
  OPERATOR: {
    label: 'Operator',
    labelTh: 'พนักงานเดินเครื่องปั๊มฟิน',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-700/80',
    description: 'Add daily and shift shot entries, submit visual condition inspections.',
    descriptionTh: 'บันทึกยอดช็อตประจำกะ ตรวจสอบสภาพรอยครีบฟินเบื้องต้น (ไม่สามารถแก้เกณฑ์มาตรฐานได้)',
    primaryDuties: ['Add shot entries per shift', 'Submit condition checks & burr readings', 'View live counters']
  },
  LINE_LEADER: {
    label: 'Line Leader',
    labelTh: 'หัวหน้าสายการผลิต',
    badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80',
    description: 'Review shot entries, submit shot corrections, and confirm active line die configurations.',
    descriptionTh: 'ตรวจสอบยอดช็อต ขอปรับแก้ช็อตที่บันทึกผิดพลาด ยืนยันการติดตั้งแม่พิมพ์ประจำสาย',
    primaryDuties: ['Review shot logs', 'Submit shot corrections', 'Confirm line configuration changes', 'Supervise operators']
  },
  MAINTENANCE: {
    label: 'Maintenance',
    labelTh: 'ช่างซ่อมบำรุงแม่พิมพ์',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/80',
    description: 'Create part replacement transactions, inspect tooling condition, and view life standards.',
    descriptionTh: 'บันทึกเปลี่ยนอะไหล่แม่พิมพ์ บันทึกการตรวจสภาพทางเทคนิค ตรวจสอบเกณฑ์อายุการใช้งาน',
    primaryDuties: ['Execute part replacements', 'Perform precision tool inspections', 'Check wear limits & standards']
  },
  TOOLING_ADMIN: {
    label: 'Tooling Admin',
    labelTh: 'ผู้ดูแลแม่พิมพ์และสเปกชิ้นส่วน',
    badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-700/80',
    description: 'Maintain Part Master, manage regrind standards, configure part positions and Fin Die setup.',
    descriptionTh: 'ดูแลฐานข้อมูล Master ชิ้นส่วน กำหนดมาตรฐานการเจียระไน และจัดการโครงสร้างตำแหน่งในแม่พิมพ์',
    primaryDuties: ['Maintain Part Master database', 'Maintain regrind engineering standards', 'Manage part positions & Fin Die configs']
  },
  WAREHOUSE: {
    label: 'Warehouse',
    labelTh: 'เจ้าหน้าที่คลังอะไหล่แม่พิมพ์',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80',
    description: 'Manage spare inventory on-hand, reserved, quarantine, and stock movement adjustments.',
    descriptionTh: 'จัดการสต็อกอะไหล่ (On Hand, Reserved, Quarantine) และบันทึกการเบิกจ่ายสต็อก',
    primaryDuties: ['Manage stock inventory & locations', 'Process reserve and quarantine counts', 'Record stock adjustments with reasons']
  },
  PURCHASING: {
    label: 'Purchasing',
    labelTh: 'เจ้าหน้าที่จัดซื้อ (Buyer)',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
    description: 'Manage PR, PO, supplier contacts, confirmed deliveries, and ETA information.',
    descriptionTh: 'จัดการเอกสารขอซื้อ PR ออกใบสั่งซื้อ PO ติดตามสถานะซัพพลายเออร์และวันส่งมอบ (ETA)',
    primaryDuties: ['Process PR and PO lifecycles', 'Manage supplier lead times', 'Update delivery ETAs and track late shipment risk']
  },
  ENGINEERING: {
    label: 'Engineering',
    labelTh: 'วิศวกรแม่พิมพ์ (Die Engineer)',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-700/80',
    description: 'Create and revise 10-key life standards, analyze technical tooling life and MTBF wear trends.',
    descriptionTh: 'กำหนดและแก้ไขเกณฑ์อายุช็อต (10 Composite Keys) วิเคราะห์แนวโน้มการสึกหรอและ MTBF',
    primaryDuties: ['Create Life Standard revisions', 'Analyze technical MTBF trends', 'Optimize material & coating standards']
  },
  APPROVER: {
    label: 'Approver',
    labelTh: 'ผู้อนุมัติระดับสูง / ผู้จัดการ',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700/80',
    description: 'Approve standard changes, approve counter resets, approve over-life usage and replacement corrections.',
    descriptionTh: 'อนุมัติการแก้ไขเกณฑ์มาตรฐาน อนุมัติการรีเซ็ตตัวนับ อนุมัติการใช้งานเกินอายุ และอนุมัติการแก้ไขรายการ',
    primaryDuties: ['Approve life standard changes', 'Approve counter resets & corrections', 'Authorize over-life run exceptions', 'Approve critical replacements']
  },
  SYSTEM_ADMIN: {
    label: 'System Admin',
    labelTh: 'ผู้ดูแลระบบสูงสุด',
    badgeClass: 'bg-red-950/80 text-red-300 border-red-600/80',
    description: 'Full system administration, complete user & role management, security and audit governance.',
    descriptionTh: 'ดูแลระบบสูงสุด บริหารจัดการผู้ใช้งานและสิทธิ์ความปลอดภัย ดูแล Audit Log ทั้งหมด',
    primaryDuties: ['Manage all users and assign roles', 'Configure system settings & seed backups', 'Audit compliance monitoring', 'Full access privileges']
  },
  // Legacy aliases
  ADMIN: {
    label: 'System Admin',
    labelTh: 'ผู้ดูแลระบบ',
    badgeClass: 'bg-red-950/80 text-red-300 border-red-600/80',
    description: 'Full administrative access.',
    descriptionTh: 'สิทธิ์การดูแลระบบเต็มรูปแบบ',
    primaryDuties: ['Full system administration']
  },
  SUPERVISOR: {
    label: 'Supervisor / Approver',
    labelTh: 'หัวหน้างาน / ผู้อนุมัติ',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700/80',
    description: 'Approver privileges.',
    descriptionTh: 'สิทธิ์การอนุมัติและกำกับดูแล',
    primaryDuties: ['Approve changes and corrections']
  },
  DIE_SPECIALIST: {
    label: 'Tooling Specialist',
    labelTh: 'ผู้เชี่ยวชาญแม่พิมพ์',
    badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-700/80',
    description: 'Tooling administration privileges.',
    descriptionTh: 'สิทธิ์การจัดการแม่พิมพ์และการลับคม',
    primaryDuties: ['Manage tooling setup and regrinding']
  },
  MAINTENANCE_TECH: {
    label: 'Maintenance Tech',
    labelTh: 'ช่างเทคนิคซ่อมบำรุง',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/80',
    description: 'Maintenance tech privileges.',
    descriptionTh: 'สิทธิ์งานซ่อมบำรุงและเปลี่ยนอะไหล่',
    primaryDuties: ['Perform tool changeovers and inspections']
  }
};

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'VIEWER':
      return {
        canViewTvAndReports: true,
        canAddShotEntries: false,
        canSubmitConditionChecks: false,
        canReviewShotEntries: false,
        canSubmitShotCorrections: false,
        canConfirmLineConfig: false,
        canCreateReplacements: false,
        canCreateInspections: false,
        canViewLifeStandards: false,
        canMaintainPartMaster: false,
        canMaintainRegrindStandards: false,
        canManagePartPositionAndDieConfig: false,
        canManageStockAndMovements: false,
        canManageProcurement: false,
        canCreateLifeStandardRevisions: false,
        canAnalyzeLifeTrends: true,
        canApproveStandardChanges: false,
        canApproveCounterResets: false,
        canApproveOverLifeUsage: false,
        canApproveReplacementCorrections: false,
        canManageUsersAndRoles: false,
        canAdministerSystem: false
      };

    case 'OPERATOR':
      return {
        canViewTvAndReports: true,
        canAddShotEntries: true,
        canSubmitConditionChecks: true,
        canReviewShotEntries: false,
        canSubmitShotCorrections: false,
        canConfirmLineConfig: false,
        canCreateReplacements: false,
        canCreateInspections: false,
        canViewLifeStandards: true,
        canMaintainPartMaster: false,
        canMaintainRegrindStandards: false,
        canManagePartPositionAndDieConfig: false,
        canManageStockAndMovements: false,
        canManageProcurement: false,
        canCreateLifeStandardRevisions: false,
        canAnalyzeLifeTrends: false,
        canApproveStandardChanges: false,
        canApproveCounterResets: false,
        canApproveOverLifeUsage: false,
        canApproveReplacementCorrections: false,
        canManageUsersAndRoles: false,
        canAdministerSystem: false
      };

    case 'LINE_LEADER':
      return {
        canViewTvAndReports: true,
        canAddShotEntries: true,
        canSubmitConditionChecks: true,
        canReviewShotEntries: true,
        canSubmitShotCorrections: true,
        canConfirmLineConfig: true,
        canCreateReplacements: false,
        canCreateInspections: true,
        canViewLifeStandards: true,
        canMaintainPartMaster: false,
        canMaintainRegrindStandards: false,
        canManagePartPositionAndDieConfig: false,
        canManageStockAndMovements: false,
        canManageProcurement: false,
        canCreateLifeStandardRevisions: false,
        canAnalyzeLifeTrends: true,
        canApproveStandardChanges: false,
        canApproveCounterResets: false,
        canApproveOverLifeUsage: false,
        canApproveReplacementCorrections: false,
        canManageUsersAndRoles: false,
        canAdministerSystem: false
      };

    case 'MAINTENANCE':
    case 'MAINTENANCE_TECH':
      return {
        canViewTvAndReports: true,
        canAddShotEntries: false,
        canSubmitConditionChecks: true,
        canReviewShotEntries: false,
        canSubmitShotCorrections: false,
        canConfirmLineConfig: false,
        canCreateReplacements: true,
        canCreateInspections: true,
        canViewLifeStandards: true,
        canMaintainPartMaster: false,
        canMaintainRegrindStandards: false,
        canManagePartPositionAndDieConfig: false,
        canManageStockAndMovements: false,
        canManageProcurement: false,
        canCreateLifeStandardRevisions: false,
        canAnalyzeLifeTrends: true,
        canApproveStandardChanges: false,
        canApproveCounterResets: false,
        canApproveOverLifeUsage: false,
        canApproveReplacementCorrections: false,
        canManageUsersAndRoles: false,
        canAdministerSystem: false
      };

    case 'TOOLING_ADMIN':
    case 'DIE_SPECIALIST':
      return {
        canViewTvAndReports: true,
        canAddShotEntries: false,
        canSubmitConditionChecks: true,
        canReviewShotEntries: true,
        canSubmitShotCorrections: false,
        canConfirmLineConfig: true,
        canCreateReplacements: true,
        canCreateInspections: true,
        canViewLifeStandards: true,
        canMaintainPartMaster: true,
        canMaintainRegrindStandards: true,
        canManagePartPositionAndDieConfig: true,
        canManageStockAndMovements: false,
        canManageProcurement: false,
        canCreateLifeStandardRevisions: false,
        canAnalyzeLifeTrends: true,
        canApproveStandardChanges: false,
        canApproveCounterResets: false,
        canApproveOverLifeUsage: false,
        canApproveReplacementCorrections: false,
        canManageUsersAndRoles: false,
        canAdministerSystem: false
      };

    case 'WAREHOUSE':
      return {
        canViewTvAndReports: true,
        canAddShotEntries: false,
        canSubmitConditionChecks: false,
        canReviewShotEntries: false,
        canSubmitShotCorrections: false,
        canConfirmLineConfig: false,
        canCreateReplacements: false,
        canCreateInspections: false,
        canViewLifeStandards: true,
        canMaintainPartMaster: false,
        canMaintainRegrindStandards: false,
        canManagePartPositionAndDieConfig: false,
        canManageStockAndMovements: true,
        canManageProcurement: false,
        canCreateLifeStandardRevisions: false,
        canAnalyzeLifeTrends: false,
        canApproveStandardChanges: false,
        canApproveCounterResets: false,
        canApproveOverLifeUsage: false,
        canApproveReplacementCorrections: false,
        canManageUsersAndRoles: false,
        canAdministerSystem: false
      };

    case 'PURCHASING':
      return {
        canViewTvAndReports: true,
        canAddShotEntries: false,
        canSubmitConditionChecks: false,
        canReviewShotEntries: false,
        canSubmitShotCorrections: false,
        canConfirmLineConfig: false,
        canCreateReplacements: false,
        canCreateInspections: false,
        canViewLifeStandards: true,
        canMaintainPartMaster: false,
        canMaintainRegrindStandards: false,
        canManagePartPositionAndDieConfig: false,
        canManageStockAndMovements: false,
        canManageProcurement: true,
        canCreateLifeStandardRevisions: false,
        canAnalyzeLifeTrends: true,
        canApproveStandardChanges: false,
        canApproveCounterResets: false,
        canApproveOverLifeUsage: false,
        canApproveReplacementCorrections: false,
        canManageUsersAndRoles: false,
        canAdministerSystem: false
      };

    case 'ENGINEERING':
      return {
        canViewTvAndReports: true,
        canAddShotEntries: false,
        canSubmitConditionChecks: true,
        canReviewShotEntries: true,
        canSubmitShotCorrections: false,
        canConfirmLineConfig: true,
        canCreateReplacements: false,
        canCreateInspections: true,
        canViewLifeStandards: true,
        canMaintainPartMaster: true,
        canMaintainRegrindStandards: true,
        canManagePartPositionAndDieConfig: true,
        canManageStockAndMovements: false,
        canManageProcurement: false,
        canCreateLifeStandardRevisions: true,
        canAnalyzeLifeTrends: true,
        canApproveStandardChanges: false,
        canApproveCounterResets: false,
        canApproveOverLifeUsage: false,
        canApproveReplacementCorrections: false,
        canManageUsersAndRoles: false,
        canAdministerSystem: false
      };

    case 'APPROVER':
    case 'SUPERVISOR':
      return {
        canViewTvAndReports: true,
        canAddShotEntries: false,
        canSubmitConditionChecks: true,
        canReviewShotEntries: true,
        canSubmitShotCorrections: true,
        canConfirmLineConfig: true,
        canCreateReplacements: true,
        canCreateInspections: true,
        canViewLifeStandards: true,
        canMaintainPartMaster: false,
        canMaintainRegrindStandards: false,
        canManagePartPositionAndDieConfig: false,
        canManageStockAndMovements: false,
        canManageProcurement: true,
        canCreateLifeStandardRevisions: false,
        canAnalyzeLifeTrends: true,
        canApproveStandardChanges: true,
        canApproveCounterResets: true,
        canApproveOverLifeUsage: true,
        canApproveReplacementCorrections: true,
        canManageUsersAndRoles: false,
        canAdministerSystem: false
      };

    case 'SYSTEM_ADMIN':
    case 'ADMIN':
    default:
      return {
        canViewTvAndReports: true,
        canAddShotEntries: true,
        canSubmitConditionChecks: true,
        canReviewShotEntries: true,
        canSubmitShotCorrections: true,
        canConfirmLineConfig: true,
        canCreateReplacements: true,
        canCreateInspections: true,
        canViewLifeStandards: true,
        canMaintainPartMaster: true,
        canMaintainRegrindStandards: true,
        canManagePartPositionAndDieConfig: true,
        canManageStockAndMovements: true,
        canManageProcurement: true,
        canCreateLifeStandardRevisions: true,
        canAnalyzeLifeTrends: true,
        canApproveStandardChanges: true,
        canApproveCounterResets: true,
        canApproveOverLifeUsage: true,
        canApproveReplacementCorrections: true,
        canManageUsersAndRoles: true,
        canAdministerSystem: true
      };
  }
}

/**
 * Route protection and role mapping
 */
export function checkRouteAccess(
  user: User | null,
  routeId: string
): {
  allowed: boolean;
  requiredPermission?: keyof RolePermissions;
  requiredRoles?: UserRole[];
  reason?: string;
  reasonTh?: string;
} {
  if (!user) {
    return {
      allowed: false,
      reason: 'Authentication required. Please sign in with your user profile.',
      reasonTh: 'จำเป็นต้องเข้าสู่ระบบ กรุณาเลือกโปรไฟล์ผู้ใช้งาน'
    };
  }

  const permissions = getRolePermissions(user.role);

  switch (routeId) {
    case 'tv-monitoring':
    case 'line-overview':
    case 'reports':
      return { allowed: true };

    case 'shot-entry':
      if (permissions.canAddShotEntries || permissions.canReviewShotEntries || permissions.canSubmitShotCorrections) {
        return { allowed: true };
      }
      return {
        allowed: false,
        requiredPermission: 'canAddShotEntries',
        requiredRoles: ['OPERATOR', 'LINE_LEADER', 'APPROVER', 'SYSTEM_ADMIN'],
        reason: 'Adding or correcting shot counts requires Operator, Line Leader, or Supervisor permissions.',
        reasonTh: 'การบันทึกหรือปรับแก้ช็อตสงวนสิทธิ์เฉพาะ Operator, Line Leader หรือ Supervisor'
      };

    case 'replacement-entry':
      if (permissions.canCreateReplacements) {
        return { allowed: true };
      }
      return {
        allowed: false,
        requiredPermission: 'canCreateReplacements',
        requiredRoles: ['MAINTENANCE', 'TOOLING_ADMIN', 'APPROVER', 'SYSTEM_ADMIN'],
        reason: 'Creating part replacement records requires Maintenance or Tooling Admin authorization.',
        reasonTh: 'การบันทึกเปลี่ยนอะไหล่แม่พิมพ์สงวนสิทธิ์สำหรับ Maintenance หรือ Tooling Admin'
      };

    case 'regrinding-entry':
      if (permissions.canMaintainRegrindStandards || permissions.canCreateInspections || permissions.canCreateReplacements) {
        return { allowed: true };
      }
      return {
        allowed: false,
        requiredPermission: 'canMaintainRegrindStandards',
        requiredRoles: ['TOOLING_ADMIN', 'MAINTENANCE', 'ENGINEERING', 'SYSTEM_ADMIN'],
        reason: 'Re-grinding control and tool sharpening requires Tooling Admin or Maintenance credentials.',
        reasonTh: 'การควบคุมการเจียระไนและลับคมสงวนสิทธิ์เฉพาะ Tooling Admin หรือ Maintenance'
      };

    case 'condition-inspection':
      if (permissions.canSubmitConditionChecks || permissions.canCreateInspections) {
        return { allowed: true };
      }
      return {
        allowed: false,
        requiredPermission: 'canSubmitConditionChecks',
        requiredRoles: ['OPERATOR', 'LINE_LEADER', 'MAINTENANCE', 'TOOLING_ADMIN', 'SYSTEM_ADMIN'],
        reason: 'Submitting condition checks requires Operator or Maintenance roles.',
        reasonTh: 'การบันทึกตรวจสอบสภาพแม่พิมพ์ต้องใช้สิทธิ์ Operator หรือ Maintenance'
      };

    case 'part-master':
    case 'install-quantity-setup':
      if (permissions.canMaintainPartMaster || permissions.canManagePartPositionAndDieConfig || permissions.canConfirmLineConfig) {
        return { allowed: true };
      }
      return {
        allowed: false,
        requiredPermission: 'canMaintainPartMaster',
        requiredRoles: ['TOOLING_ADMIN', 'ENGINEERING', 'LINE_LEADER', 'SYSTEM_ADMIN'],
        reason: 'Managing Part Masters, Fin Die configurations, and installed quantities requires Tooling Admin or Engineering role.',
        reasonTh: 'การแก้ไข Master ชิ้นส่วนและโครงสร้างแม่พิมพ์สงวนสิทธิ์สำหรับ Tooling Admin หรือ Engineering'
      };

    case 'life-standard-setup':
      if (permissions.canCreateLifeStandardRevisions || permissions.canApproveStandardChanges || permissions.canViewLifeStandards) {
        return { allowed: true };
      }
      return {
        allowed: false,
        requiredPermission: 'canCreateLifeStandardRevisions',
        requiredRoles: ['ENGINEERING', 'APPROVER', 'SYSTEM_ADMIN'],
        reason: 'Revising 10-key composite life standards requires Engineering or Approver authorization.',
        reasonTh: 'การแก้ไขเกณฑ์อายุช็อต 10 ตัวแปรสงวนสิทธิ์เฉพาะฝ่ายวิศวกรรม (Engineering) หรือ ผู้อนุมัติ'
      };

    case 'spare-stock':
      if (permissions.canManageStockAndMovements || permissions.canManageProcurement || permissions.canViewLifeStandards) {
        return { allowed: true };
      }
      return {
        allowed: false,
        requiredPermission: 'canManageStockAndMovements',
        requiredRoles: ['WAREHOUSE', 'PURCHASING', 'SYSTEM_ADMIN', 'APPROVER'],
        reason: 'Managing inventory stock and procurement PR/PO requires Warehouse or Purchasing credentials.',
        reasonTh: 'การจัดการสต็อกและการจัดซื้อสงวนสิทธิ์สำหรับ Warehouse หรือ Purchasing'
      };

    case 'user-approval':
      if (permissions.canManageUsersAndRoles || permissions.canApproveStandardChanges || permissions.canApproveCounterResets) {
        return { allowed: true };
      }
      return {
        allowed: false,
        requiredPermission: 'canApproveStandardChanges',
        requiredRoles: ['APPROVER', 'SYSTEM_ADMIN'],
        reason: 'User administration and pending approval requests require Approver or System Admin role.',
        reasonTh: 'การจัดการผู้ใช้และการอนุมัติสงวนสิทธิ์เฉพาะ Approver หรือ System Admin'
      };

    case 'audit-log':
    case 'system-settings':
      if (permissions.canAdministerSystem || permissions.canManageUsersAndRoles) {
        return { allowed: true };
      }
      return {
        allowed: false,
        requiredPermission: 'canAdministerSystem',
        requiredRoles: ['SYSTEM_ADMIN'],
        reason: 'System administration and immutable audit logs require System Administrator privileges.',
        reasonTh: 'การตั้งค่าระบบและบันทึกประวัติการเปลี่ยนแปลงระดับลึกสงวนสิทธิ์เฉพาะ System Admin'
      };

    default:
      return { allowed: true };
  }
}
