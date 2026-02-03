import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PublicRouteProps {
    children: React.ReactNode;
    redirectAuthenticated?: boolean; // Nếu true, redirect user đã đăng nhập về dashboard
}

/**
 * PublicRoute - Route công khai
 * - Nếu redirectAuthenticated = true: User đã đăng nhập sẽ bị redirect về dashboard của role
 * - Nếu redirectAuthenticated = false (default): Ai cũng truy cập được
 */
export function PublicRoute({ children, redirectAuthenticated = false }: PublicRouteProps) {
    const { user, isAuthenticated } = useAuth();

    // Nếu cần redirect user đã đăng nhập
    if (redirectAuthenticated && isAuthenticated && user) {
        const role = user.role?.toLowerCase();

        // Redirect về dashboard tương ứng với role
        switch (role) {
            case 'admin':
                return <Navigate to="/admin" replace />;
            case 'owner':
                return <Navigate to="/owner" replace />;
            case 'manager':
                return <Navigate to="/manager" replace />;
            case 'accountant':
                return <Navigate to="/accountant" replace />;
            case 'tenant':
                return <Navigate to="/homepage" replace />;
            default:
                return <Navigate to="/homepage" replace />;
        }
    }

    return <>{children}</>;
}
