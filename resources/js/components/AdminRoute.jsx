import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Staff-only gate for the /admin pages. This is convenience, not security —
 * every /api/admin endpoint enforces the same check server-side.
 */
const AdminRoute = ({ children }) => {
    const { isAuthed, user } = useAuth();

    if (!isAuthed) return <Navigate to="/login" replace />;
    if (!user?.is_admin) return <Navigate to="/account" replace />;

    return children;
};

export default AdminRoute;

export { AdminRoute };
