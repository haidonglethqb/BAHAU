"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import apiClient, { AUTH_UNAUTHORIZED_EVENT } from "../services/api-client";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleLabel: string;
  roles: string[];
  permissions: string[];
  unitsManaged: string[];
  employeeId?: string | null;
  employeeCode?: string | null;
  unitName?: string;
  title?: string;
  code?: string;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  can: (permission: string | string[]) => boolean;
}

const ROLE_ALIAS_MAP: Record<string, string> = {
  ROLE_SYSADMIN: "SYSTEM_ADMIN",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  SYSADMIN: "SYSTEM_ADMIN",
  ADMIN: "SYSTEM_ADMIN",
  ROLE_RECTOR: "RECTOR",
  RECTOR: "RECTOR",
  HIEUTRUONG: "RECTOR",
  ROLE_HR_OFFICER: "HR_SPECIALIST",
  ROLE_HR_SPECIALIST: "HR_SPECIALIST",
  HR_OFFICER: "HR_SPECIALIST",
  HR_SPECIALIST: "HR_SPECIALIST",
  TCHC: "HR_SPECIALIST",
  ROLE_ACCOUNTANT: "ACCOUNTANT",
  ACCOUNTANT: "ACCOUNTANT",
  ROLE_UNIT_HEAD: "DEAN",
  UNIT_HEAD: "DEAN",
  DEAN: "DEAN",
  TRUONGKHOA: "DEAN",
  ROLE_EMPLOYEE: "LECTURER",
  EMPLOYEE: "LECTURER",
  LECTURER: "LECTURER",
  CBGV: "LECTURER",
};

const ROLE_PRIORITY = [
  "SYSTEM_ADMIN",
  "RECTOR",
  "HR_SPECIALIST",
  "ACCOUNTANT",
  "DEAN",
  "LECTURER",
];

const ROLE_LABEL_MAP: Record<string, { roleLabel: string; title: string }> = {
  SYSTEM_ADMIN: { roleLabel: "Quản trị hệ thống", title: "Quản trị viên" },
  RECTOR: { roleLabel: "Hiệu trưởng", title: "Ban Giám hiệu" },
  HR_SPECIALIST: { roleLabel: "Phòng TCHC", title: "Chuyên viên TCHC" },
  ACCOUNTANT: { roleLabel: "Kế toán", title: "Chuyên viên Tài chính" },
  DEAN: { roleLabel: "Trưởng đơn vị", title: "Trưởng khoa / Đơn vị" },
  LECTURER: { roleLabel: "Giảng viên (CBGV)", title: "Giảng viên / Cán bộ" },
};

export function normalizeRoleCode(roleCode: string): string {
  const key = roleCode.trim().toUpperCase();
  return ROLE_ALIAS_MAP[key] || key;
}

function resolvePrimaryRole(roles: string[]): string {
  const normalized = roles.map(normalizeRoleCode);
  for (const candidate of ROLE_PRIORITY) {
    if (normalized.includes(candidate)) {
      return candidate;
    }
  }
  return normalized[0] || "LECTURER";
}

function mapBackendUserToAuthUser(raw: any): AuthUser {
  const rawRoles: string[] = Array.isArray(raw?.roles)
    ? raw.roles
    : raw?.role
      ? [String(raw.role)]
      : [];
  const primaryRole = resolvePrimaryRole(rawRoles);
  const meta = ROLE_LABEL_MAP[primaryRole] || ROLE_LABEL_MAP.LECTURER;

  return {
    id: String(raw?.id || ""),
    email: String(raw?.email || ""),
    fullName: String(raw?.fullName || raw?.email || "Cán bộ DAU"),
    role: primaryRole,
    roleLabel: raw?.roleLabel || meta.roleLabel,
    roles: rawRoles.length > 0 ? rawRoles : [primaryRole],
    permissions: Array.isArray(raw?.permissions) ? raw.permissions : [],
    unitsManaged: Array.isArray(raw?.unitsManaged) ? raw.unitsManaged : [],
    employeeId: raw?.employeeId ?? null,
    employeeCode: raw?.employeeCode ?? null,
    code: raw?.employeeCode ?? raw?.code ?? undefined,
    unitName: raw?.unitName ?? undefined,
    title: raw?.title || meta.title,
  };
}

const STORAGE_KEY = "bahau_auth_user";

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => ({ ok: false, error: "AuthProvider chưa được khởi tạo." }),
  logout: async () => {},
  refreshUser: async () => {},
  hasRole: () => false,
  can: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const persistUser = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    if (typeof window === "undefined") return;
    try {
      if (nextUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await apiClient.auth.getMe();
    if (res.ok && res.data?.user) {
      const mapped = mapBackendUserToAuthUser(res.data.user);
      // Enrich unitName/title if employee profile is accessible
      if (mapped.employeeId && !mapped.unitName) {
        const profileRes = await apiClient.employees.getMyProfile().catch(() => null);
        if (profileRes?.ok && profileRes.data) {
          if (profileRes.data.primaryUnitName) {
            mapped.unitName = profileRes.data.primaryUnitName;
          }
          if (profileRes.data.primaryPositionName) {
            mapped.title = profileRes.data.primaryPositionName;
          }
        }
      }
      persistUser(mapped);
      return;
    }

    if (res.status === 401) {
      apiClient.setSessionId(null);
      persistUser(null);
    }
  }, [persistUser]);

  useEffect(() => {
    let active = true;

    const bootstrapSession = async () => {
      try {
        const hasSessionToken = Boolean(apiClient.getSessionId());
        const res = await apiClient.auth.getMe();
        if (!active) return;

        if (res.ok && res.data?.user) {
          const mapped = mapBackendUserToAuthUser(res.data.user);
          if (mapped.employeeId) {
            const profileRes = await apiClient.employees.getMyProfile().catch(() => null);
            if (active && profileRes?.ok && profileRes.data) {
              if (profileRes.data.primaryUnitName) {
                mapped.unitName = profileRes.data.primaryUnitName;
              }
              if (profileRes.data.primaryPositionName) {
                mapped.title = profileRes.data.primaryPositionName;
              }
            }
          }
          persistUser(mapped);
        } else if (res.status === 401 || !hasSessionToken) {
          if (res.status === 401) {
            apiClient.setSessionId(null);
          }
          persistUser(null);
        } else {
          // Transient 5xx / network outage while a session token is stored: keep token, restore cached user if present
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed?.id && parsed?.email) {
                setUser(mapBackendUserToAuthUser(parsed));
              }
            }
          } catch {
            // ignore corrupt cached user
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrapSession();

    const handleUnauthorized = () => {
      if (active) {
        persistUser(null);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    }

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
      }
    };
  }, [persistUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        return { ok: false, error: "Vui lòng nhập đầy đủ Email và Mật khẩu." };
      }

      const res = await apiClient.auth.login(normalizedEmail, password);
      if (!res.ok || !res.data?.user) {
        return {
          ok: false,
          error: res.error || "Email hoặc mật khẩu không chính xác.",
        };
      }

      const mapped = mapBackendUserToAuthUser(res.data.user);
      if (mapped.employeeId) {
        const profileRes = await apiClient.employees.getMyProfile().catch(() => null);
        if (profileRes?.ok && profileRes.data) {
          if (profileRes.data.primaryUnitName) {
            mapped.unitName = profileRes.data.primaryUnitName;
          }
          if (profileRes.data.primaryPositionName) {
            mapped.title = profileRes.data.primaryPositionName;
          }
        }
      }

      persistUser(mapped);
      return { ok: true, user: mapped };
    },
    [persistUser]
  );

  const logout = useCallback(async () => {
    persistUser(null);
    try {
      await apiClient.auth.logout();
    } catch (e) {
      console.warn("Logout error", e);
    }
  }, [persistUser]);

  const hasRole = useCallback(
    (targetRoles: string | string[]): boolean => {
      if (!user) return false;
      const targets = (Array.isArray(targetRoles) ? targetRoles : [targetRoles]).map(
        normalizeRoleCode
      );
      if (targets.length === 0) return true;
      const userRoles = new Set([
        normalizeRoleCode(user.role),
        ...(user.roles || []).map(normalizeRoleCode),
      ]);
      return targets.some((role) => userRoles.has(role));
    },
    [user]
  );

  const can = useCallback(
    (permission: string | string[]): boolean => {
      if (!user) return false;
      const required = Array.isArray(permission) ? permission : [permission];
      if (required.length === 0) return true;
      return required.some((perm) => user.permissions.includes(perm));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        hasRole,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
