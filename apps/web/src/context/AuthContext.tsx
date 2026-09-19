"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Role } from "../data";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleLabel: string;
  unitName?: string;
  title?: string;
  code?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (userData: AuthUser) => void;
  loginAsRole: (role: Role) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  loginAsRole: () => {},
  logout: async () => {},
  isAuthenticated: false,
});

export const ROLE_USER_MAP: Record<Role, AuthUser> = {
  cbgv: {
    id: "usr-gv-01",
    email: "an.nv@dau.edu.vn",
    fullName: "ThS. Nguyễn Văn An",
    role: "LECTURER",
    roleLabel: "Giảng viên (CBGV)",
    unitName: "Khoa Kiến trúc",
    title: "Giảng viên",
    code: "DAU260003",
  },
  truongkhoa: {
    id: "usr-tk-02",
    email: "binh.tt@dau.edu.vn",
    fullName: "PGS.TS. Trần Thị Bình",
    role: "DEAN",
    roleLabel: "Trưởng khoa (Khoa KT)",
    unitName: "Khoa Kiến trúc",
    title: "Trưởng khoa",
    code: "DAU260001",
  },
  tchc: {
    id: "usr-hr-03",
    email: "cuong.lm@dau.edu.vn",
    fullName: "ThS. Lê Minh Cường",
    role: "HR_SPECIALIST",
    roleLabel: "Phòng TCHC",
    unitName: "Phòng Tổ chức Hành chính",
    title: "Chuyên viên TCHC",
    code: "DAU260008",
  },
  hieutruong: {
    id: "usr-rector-04",
    email: "dung.hd@dau.edu.vn",
    fullName: "GS.TS. Hoàng Đức Dũng",
    role: "RECTOR",
    roleLabel: "Hiệu trưởng",
    unitName: "Ban Giám hiệu",
    title: "Hiệu trưởng",
    code: "DAU260002",
  },
  admin: {
    id: "usr-admin-05",
    email: "quantri@dau.edu.vn",
    fullName: "KS. Phạm Quản Trị",
    role: "SYSTEM_ADMIN",
    roleLabel: "Admin",
    unitName: "Toàn hệ thống",
    title: "Quản trị viên",
    code: "DAU260000",
  },
};

export const SAMPLE_USERS: Record<string, AuthUser> = {
  "gv.an@dau.edu.vn": ROLE_USER_MAP.cbgv,
  "an.nv@dau.edu.vn": ROLE_USER_MAP.cbgv,
  "tk.binh@dau.edu.vn": ROLE_USER_MAP.truongkhoa,
  "binh.tt@dau.edu.vn": ROLE_USER_MAP.truongkhoa,
  "hr.cuong@dau.edu.vn": ROLE_USER_MAP.tchc,
  "cuong.lm@dau.edu.vn": ROLE_USER_MAP.tchc,
  "rector.dung@dau.edu.vn": ROLE_USER_MAP.hieutruong,
  "dung.hd@dau.edu.vn": ROLE_USER_MAP.hieutruong,
  "admin@dau.edu.vn": ROLE_USER_MAP.admin,
  "quantri@dau.edu.vn": ROLE_USER_MAP.admin,
};

const STORAGE_KEY = "bahau_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check saved session in localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not read auth from storage", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch (e) {
      console.warn("Could not save auth to storage", e);
    }
  };

  const loginAsRole = (role: Role) => {
    const target = ROLE_USER_MAP[role];
    if (target) {
      login(target);
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
      await fetch(`${apiUrl}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    } catch (e) {
      console.warn("Logout error", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginAsRole,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
