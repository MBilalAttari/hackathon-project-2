"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ROLES, DEFAULT_ORG_SETTINGS } from "@/lib/constants";
import { auth as clientAuth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(DEFAULT_ORG_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const getDashboardPath = useCallback((targetRole) => {
    const r = (targetRole || user?.role || ROLES.EMPLOYEE).toLowerCase();
    if (r === "admin") return "/admin/dashboard";
    if (r === "hr") return "/hr/dashboard";
    return "/employee/dashboard";
  }, [user]);

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    const idToken = typeof window !== "undefined" ? localStorage.getItem("hcm_id_token") : null;
    if (idToken) {
      headers.set("authorization", `Bearer ${idToken}`);
    }
    if (user) {
      headers.set("x-hcm-session", encodeURIComponent(JSON.stringify(user)));
    }
    return fetch(url, { ...options, headers });
  }, [user]);

  const loadOrgSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/org");
      if (res.ok) {
        const data = await res.json();
        setOrganization(data);
      }
    } catch (err) {
      console.warn("Failed to load org settings:", err);
    }
  }, []);

  // Re-verify session on mount against server-side authorization
  useEffect(() => {
    async function initAuth() {
      await loadOrgSettings();
      const savedUserStr = typeof window !== "undefined" ? localStorage.getItem("hcm_user") : null;
      const idToken = typeof window !== "undefined" ? localStorage.getItem("hcm_id_token") : null;

      if (savedUserStr || idToken) {
        try {
          const parsed = savedUserStr ? JSON.parse(savedUserStr) : null;
          // Verify with server endpoint /api/auth/me
          const headers = new Headers();
          if (idToken) headers.set("authorization", `Bearer ${idToken}`);
          if (parsed) headers.set("x-hcm-session", encodeURIComponent(JSON.stringify(parsed)));

          const res = await fetch("/api/auth/me", { headers });
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              setUser(data.user);
              localStorage.setItem("hcm_user", JSON.stringify(data.user));
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Session re-verification failed:", e);
        }
      }

      // If invalid or no saved session, clear state
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("hcm_user");
        localStorage.removeItem("hcm_id_token");
      }
      setLoading(false);
    }

    initAuth();
  }, [loadOrgSettings]);

  const login = async (email, password) => {
    setAuthError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      setUser(data.user);
      localStorage.setItem("hcm_user", JSON.stringify(data.user));
      if (data.user.idToken) {
        localStorage.setItem("hcm_id_token", data.user.idToken);
      }
      await loadOrgSettings();
      return data.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const register = async ({ name, email, password, role }) => {
    setAuthError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }
      setUser(data.user);
      localStorage.setItem("hcm_user", JSON.stringify(data.user));
      if (data.user.idToken) {
        localStorage.setItem("hcm_id_token", data.user.idToken);
      }
      await loadOrgSettings();
      return data.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const forgotPassword = async (email) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset request failed");
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("hcm_user");
      localStorage.removeItem("hcm_id_token");
    }
    if (clientAuth) {
      try {
        await signOut(clientAuth);
      } catch (e) {
        // ignore
      }
    }
  };

  const completeSetup = async (orgPayload) => {
    const res = await fetchWithAuth("/api/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...orgPayload, isSetupComplete: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Setup update failed");
    setOrganization(data.organization);
    return data.organization;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || ROLES.EMPLOYEE,
        organization,
        loading,
        authError,
        login,
        register,
        forgotPassword,
        logout,
        getDashboardPath,
        completeSetup,
        refreshOrg: loadOrgSettings,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
