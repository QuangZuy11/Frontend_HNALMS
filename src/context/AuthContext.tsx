import {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { authService } from "../services/authService";

/* ===================== TYPES ===================== */

export type Role = "admin" | "manager" | "owner" | "tenant" | "accountant";

export interface User {
  id?: string;
  user_id?: string;
  email: string;
  name?: string;
  fullname?: string | null;
  role: Role;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  isAdmin: boolean;
  isManager: boolean;
  isAdminOrManager: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<Pick<User, "fullname" | "name">>) => void;
}

/* ===================== CONTEXT ===================== */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ===================== PROVIDER ===================== */

export const AuthProvider = ({ children }: PropsWithChildren) => {
  console.log("🏗️ AuthProvider: Component rendering/mounting");

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  /* ---------- Load auth from localStorage ---------- */
  useEffect(() => {
    console.log("🔄 AuthContext: Loading auth from localStorage...");
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    console.log("🔄 AuthContext: LocalStorage data:", {
      hasToken: !!token,
      tokenLength: token?.length,
      hasUserStr: !!userStr,
      userStr: userStr,
    });

    // No token or user - set unauthenticated state WITHOUT clearing storage
    if (!token || !userStr) {
      console.log("⚠️ AuthContext: No token or user in localStorage");
      setAuthState((prev) => ({
        ...prev,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      }));
      return;
    }

    // Try to parse and validate user
    try {
      const user: User = JSON.parse(userStr);

      console.log("🔄 AuthContext: Parsed user:", {
        user,
        hasEmail: !!user?.email,
        hasRole: !!user?.role,
        hasId: !!user?.id,
        hasUserId: !!user?.user_id,
      });

      // Validate user has required fields
      if (!user || typeof user !== "object") {
        console.error("❌ AuthContext: Invalid user object");
        throw new Error("Invalid user object");
      }

      if (!user.email || !user.role) {
        console.error("❌ AuthContext: User missing required fields", {
          hasEmail: !!user?.email,
          hasRole: !!user?.role,
        });
        throw new Error("User missing required fields");
      }

      // Valid user - set authenticated state
      console.log(
        "✅ AuthContext: User validated, setting authenticated state",
      );
      setAuthState((prev) => ({
        ...prev,
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (error) {
      console.error("❌ AuthContext: Failed to parse/validate user", error);

      // Clear invalid data
      console.log("🧹 AuthContext: Clearing invalid localStorage data");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setAuthState((prev) => ({
        ...prev,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      }));
    }
  }, []);

  /* ---------- Login ---------- */
  const login = (token: string, user: User) => {
    console.log("🔐 AuthContext Login: Received data:", {
      hasToken: !!token,
      tokenLength: token?.length,
      user: user,
      hasEmail: !!user?.email,
      hasRole: !!user?.role,
      hasUserId: !!user?.user_id,
      hasId: !!user?.id,
      has_id: !!(user as any)?._id,
    });

    if (!token || !user || !user.email || !user.role) {
      console.error("❌ AuthContext Login: Invalid login data", {
        token: !!token,
        user,
      });
      return;
    }

    // Normalize user data from backend response
    // Backend may send role as "Tenant", "Admin", etc. - convert to lowercase
    const normalizedRole = (user.role as string).toLowerCase() as Role;
    
    const userToSave = {
      ...user,
      // Support both _id and user_id for ID
      id: (user as any)._id || user.user_id || user.id,
      user_id: (user as any)._id || user.user_id,
      role: normalizedRole, // Normalize role to lowercase
    };

    console.log("💾 AuthContext Login: Saving to localStorage:", {
      token: token.substring(0, 20) + "...",
      user: userToSave,
    });

    localStorage.setItem("token", token.trim());
    localStorage.setItem("user", JSON.stringify(userToSave));

    // Verify what was actually saved
    const savedUser = localStorage.getItem("user");
    console.log("✅ AuthContext Login: Verified saved user:", savedUser);

    setAuthState((prev) => ({
      ...prev,
      user: userToSave,
      token,
      isAuthenticated: true,
      isLoading: false,
    }));
  };

  /* ---------- Logout ---------- */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setAuthState((prev) => ({
      ...prev,
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    }));
  };

  /* ---------- Update user (e.g. sau khi cập nhật họ tên ở profile) ---------- */
  const updateUser = (updates: Partial<Pick<User, "fullname" | "name">>) => {
    setAuthState((prev) => {
      if (!prev.user) return prev;
      const nextUser = { ...prev.user, ...updates };
      try {
        localStorage.setItem("user", JSON.stringify(nextUser));
      } catch (e) {
        console.warn("Could not persist user update to localStorage", e);
      }
      return { ...prev, user: nextUser };
    });
  };

  /* ---------- Role helpers ---------- */
  const isAdmin = authState.user?.role === "admin";
  const isManager = authState.user?.role === "manager";
  const isAdminOrManager = isAdmin || isManager;

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        isAdmin,
        isManager,
        isAdminOrManager,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ===================== HOOK ===================== */

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
