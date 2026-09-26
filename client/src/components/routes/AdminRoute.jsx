import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AdminRoute = () => {
  const location = useLocation();

  const {
    user,
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from:
            location.pathname +
            location.search +
            location.hash,
        }}
      />
    );
  }

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
