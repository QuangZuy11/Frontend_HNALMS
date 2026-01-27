import {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";

/* ===================== TYPES ===================== */

export type Role = "admin" | "manager" | "owner" | "tenant" | "accountant";

export interface User {
  id: string;
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
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  /* ---------- Load auth from localStorage ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const user: User = JSON.parse(userStr);

        if (user && user.email && user.role) {
          setAuthState((prev) => ({
            ...prev,
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          }));
          return;
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
      }
    }

    // fallback: clear invalid storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setAuthState((prev) => ({
      ...prev,
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    }));
  }, []);

  /* ---------- Login ---------- */
  const login = (token: string, user: User) => {
    if (!token || !user || !user.email || !user.role) {
      console.error("Invalid login data", { token, user });
      return;
    }

    localStorage.setItem("token", token.trim());
    localStorage.setItem("user", JSON.stringify(user));

    setAuthState((prev) => ({
      ...prev,
      user,
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
