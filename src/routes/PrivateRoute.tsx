import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth.types';

interface PrivateRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
    const { isAuthenticated, isLoading, user } = useAuth();

    // Debug log
    console.log('PrivateRoute check:', {
        isLoading,
        isAuthenticated,
        hasUser: !!user,
        userRole: user?.role,
        path: window.location.pathname
    });

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <div>Đang tải...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        console.warn('PrivateRoute: User not authenticated', {
            token: !!localStorage.getItem('token'),
            user: !!localStorage.getItem('user')
        });
        return <Navigate to="/login" replace />;
    }

    // Check if user exists and has role
    if (!user) {
        console.warn('PrivateRoute: User object is null', {
            token: localStorage.getItem('token'),
            userStr: localStorage.getItem('user')
        });
        return <Navigate to="/login" replace />;
    }

    // Check role permission if allowedRoles is specified
    if (allowedRoles && allowedRoles.length > 0) {
        // If user doesn't have role or role is not in allowedRoles, redirect to unauthorized
        if (!user.role) {
            console.warn('PrivateRoute: User role is missing', { user });
            return <Navigate to="/login" replace />;
        }
        if (!allowedRoles.includes(user.role)) {
            console.warn('PrivateRoute: User role not allowed', { userRole: user.role, allowedRoles });
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <>{children}</>;
};
