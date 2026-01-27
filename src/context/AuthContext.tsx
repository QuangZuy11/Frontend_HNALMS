import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types/auth.types';

interface AuthContextType extends AuthState {
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
    });

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                // Validate user object has required fields
                if (user && user.email && user.role) {
                    setAuthState({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } else {
                    // Invalid user object, clear storage
                    console.warn('Invalid user object in localStorage:', user);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setAuthState({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                }
            } catch (error) {
                console.error('Error parsing user from localStorage:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setAuthState({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        } else {
            setAuthState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const login = (token: string, user: User) => {
        // Clean and validate token before storing
        const cleanToken = token?.trim();
        if (!cleanToken) {
            console.error('Invalid token provided to login');
            return;
        }
        
        // Validate user object
        if (!user || !user.email || !user.role) {
            console.error('Invalid user object provided to login:', user);
            return;
        }
        
        localStorage.setItem('token', cleanToken);
        localStorage.setItem('user', JSON.stringify(user));
        setAuthState({
            user,
            token: cleanToken,
            isAuthenticated: true,
            isLoading: false,
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });
    };

    return (
        <AuthContext.Provider value={{ ...authState, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
