import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type PermissionAction = 
  | "users:manage"
  | "roles:manage"
  | "quotes:view_all"
  | "quotes:edit_any"
  | "quotes:delete"
  | "catalog:manage"
  | "settings:manage"
  | "analytics:view"
  | "admin:view_analytics"
  | "admin:audit_view"
  | "admin:permissions_view"
  | "quotes:view"
  | "quotes:create"
  | "quotes:edit"
  | "quotes:share"
  | "audit:view";

/**
 * Check if the current user has a specific permission.
 * Works in Server Components and API routes.
 */
export async function hasPermission(permission: PermissionAction): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) return false;
  
  const user = session.user as any;
  
  // Admins have all permissions by default
  if (user.role === "ADMIN") return true;
  
  return user.permissions?.includes(permission) || false;
}

/**
 * Check if the user is the owner of a quote or has permission to edit any quote.
 */
export async function canEditQuote(quoteCreatedById: string | null): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) return false;
  
  const user = session.user as any;
  
  if (user.role === "ADMIN" || user.permissions?.includes("quotes:edit_any")) {
    return true;
  }
  
  // Estimators can only edit their own quotes
  return user.id === quoteCreatedById && user.role === "ESTIMATOR";
}
