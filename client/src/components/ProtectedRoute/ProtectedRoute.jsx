import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = () => {
  const location = useLocation();

  const {
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    const returnUrl =
      location.pathname +
      location.search +
      location.hash;

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: returnUrl,
        }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
