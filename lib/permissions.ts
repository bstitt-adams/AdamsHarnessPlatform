/**
 * Role-based permissions system for Adams Electric Platform
 * 
 * Roles hierarchy:
 * - superadmin: Full control over everything
 * - admin: Can manage users (except superadmin), documents, and most features
 * - team: Internal team members with access to core features
 * - affiliate: External partners with limited access
 * - consultant: External consultants with specific access
 * - client: External clients with access to their own data and services
 */

export type UserRole = "superadmin" | "admin" | "team" | "affiliate" | "consultant" | "client";

export interface Permission {
  canViewSidebar: boolean;
  canConfigureSidebar: boolean;
  canViewL83Tools: boolean;
  canConfigureL83Tools: boolean;
  canManageUsers: boolean;
  canDeleteUsers: boolean;
  canDeleteSuperAdmin: boolean;
  canManageDocuments: boolean;
  canAccessAdmin: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canManageIntegrations: boolean;
  canViewClientDashboard: boolean;
}

// Define permissions for each role
const rolePermissions: Record<UserRole, Permission> = {
  superadmin: {
    canViewSidebar: true,
    canConfigureSidebar: true,
    canViewL83Tools: true,
    canConfigureL83Tools: true,
    canManageUsers: true,
    canDeleteUsers: true,
    canDeleteSuperAdmin: true, // Only superadmin can delete other superadmins
    canManageDocuments: true,
    canAccessAdmin: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canManageIntegrations: true,
    canViewClientDashboard: false,
  },
  admin: {
    canViewSidebar: true,
    canConfigureSidebar: false,
    canViewL83Tools: true,
    canConfigureL83Tools: false,
    canManageUsers: true,
    canDeleteUsers: true,
    canDeleteSuperAdmin: false, // Admin cannot delete superadmin
    canManageDocuments: true,
    canAccessAdmin: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canManageIntegrations: true,
    canViewClientDashboard: false,
  },
  team: {
    canViewSidebar: true,
    canConfigureSidebar: false,
    canViewL83Tools: true,
    canConfigureL83Tools: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canDeleteSuperAdmin: false,
    canManageDocuments: true,
    canAccessAdmin: false,
    canViewAnalytics: true,
    canManageSettings: false,
    canManageIntegrations: false,
    canViewClientDashboard: false,
  },
  affiliate: {
    canViewSidebar: true,
    canConfigureSidebar: false,
    canViewL83Tools: true,
    canConfigureL83Tools: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canDeleteSuperAdmin: false,
    canManageDocuments: false,
    canAccessAdmin: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canManageIntegrations: false,
    canViewClientDashboard: false,
  },
  consultant: {
    canViewSidebar: true,
    canConfigureSidebar: false,
    canViewL83Tools: true,
    canConfigureL83Tools: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canDeleteSuperAdmin: false,
    canManageDocuments: false,
    canAccessAdmin: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canManageIntegrations: false,
    canViewClientDashboard: false,
  },
  client: {
    canViewSidebar: true,
    canConfigureSidebar: false,
    canViewL83Tools: false,
    canConfigureL83Tools: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canDeleteSuperAdmin: false,
    canManageDocuments: false,
    canAccessAdmin: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canManageIntegrations: false,
    canViewClientDashboard: true,
  },
};

/**
 * Get permissions for a given role
 */
export function getPermissions(role: UserRole | string): Permission {
  const normalizedRole = role as UserRole;
  return rolePermissions[normalizedRole] || rolePermissions.affiliate;
}

/**
 * Check if a user can delete another user based on roles
 */
export function canDeleteUser(actorRole: UserRole | string, targetRole: UserRole | string): boolean {
  const actorPerms = getPermissions(actorRole);
  
  // Must have delete permission
  if (!actorPerms.canDeleteUsers) return false;
  
  // Only superadmin can delete superadmin
  if (targetRole === "superadmin") {
    return actorPerms.canDeleteSuperAdmin;
  }
  
  return true;
}

/**
 * Check if a user can edit another user based on roles
 */
export function canEditUser(actorRole: UserRole | string, targetRole: UserRole | string): boolean {
  const actorPerms = getPermissions(actorRole);
  
  // Must have user management permission
  if (!actorPerms.canManageUsers) return false;
  
  // Only superadmin can edit superadmin
  if (targetRole === "superadmin" && actorRole !== "superadmin") {
    return false;
  }
  
  return true;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(role: UserRole | string, permission: keyof Permission): boolean {
  const perms = getPermissions(role);
  return perms[permission];
}

/**
 * Check if role is admin level (superadmin or admin)
 */
export function isAdminRole(role: UserRole | string): boolean {
  return role === "superadmin" || role === "admin";
}

/**
 * Check if role is superadmin
 */
export function isSuperAdmin(role: UserRole | string): boolean {
  return role === "superadmin";
}

/**
 * Sidebar items that can be controlled by superadmin
 */
export interface SidebarVisibilityConfig {
  navigation: boolean;
  work: boolean;
  intelligence: boolean;
  admin: boolean;
  initiatives: boolean;
  // Individual items
  commandCenter: boolean;
  opportunities: boolean;
  projects: boolean;
  affiliates: boolean;
  organizations: boolean;
  calendar: boolean;
  meetings: boolean;
  rocks: boolean;
  proposals: boolean;
  goHighLevel: boolean;
  askAdamsBrain: boolean;
  teamMembers: boolean;
  strategicPartners: boolean;
  settings: boolean;
  activityLog: boolean;
}

/**
 * L83 Tools that can be controlled by superadmin
 */
export interface L83ToolsConfig {
  transcription: boolean;
  imageGen: boolean;
  headshot: boolean;
  youtube: boolean;
  tts: boolean;
  crawler: boolean;
  pdfOcr: boolean;
}

/**
 * Default sidebar visibility (all visible)
 */
export const defaultSidebarVisibility: SidebarVisibilityConfig = {
  navigation: true,
  work: true,
  intelligence: true,
  admin: true,
  initiatives: true,
  commandCenter: true,
  opportunities: true,
  projects: true,
  affiliates: true,
  organizations: true,
  calendar: true,
  meetings: true,
  rocks: true,
  proposals: true,
  goHighLevel: true,
  askAdamsBrain: true,
  teamMembers: true,
  strategicPartners: true,
  settings: true,
  activityLog: true,
};

/**
 * Default L83 Tools visibility (all visible)
 */
export const defaultL83ToolsConfig: L83ToolsConfig = {
  transcription: true,
  imageGen: true,
  headshot: true,
  youtube: true,
  tts: true,
  crawler: true,
  pdfOcr: true,
};
