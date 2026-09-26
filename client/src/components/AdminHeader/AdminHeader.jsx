import { FiArrowLeft, FiLogOut, FiShield } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import "./AdminHeader.css";

const AdminHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();

    toast.success("Logged out successfully");

    navigate("/admin/login", { replace: true });
  };

  return (
    <header className="admin-header">
      <div className="admin-header-container">
        {/* Logo / Dashboard Navigation */}
        <Link to="/admin" className="admin-header-logo">
          <span className="admin-header-logo-icon">
            <FiShield />
          </span>

          <div className="admin-header-logo-text">
            <span className="admin-header-brand">
              ShardaFind
            </span>
            <span className="admin-header-label">
              Admin Portal
            </span>
          </div>
        </Link>

        {/* Admin Actions */}
        <div className="admin-header-actions">
          <div className="admin-header-user">
            <div className="admin-header-avatar">
              {user?.name?.charAt(0).toUpperCase() || "A"}
            </div>

            <div className="admin-header-user-info">
              <span className="admin-header-user-name">
                {user?.name || "Admin"}
              </span>

              <span className="admin-header-user-role">
                Administrator
              </span>
            </div>
          </div>

          <div className="admin-header-divider" />

          <Link
            to="/admin"
            className="admin-header-dashboard-link"
          >
            <FiArrowLeft />
            <span>Dashboard</span>
          </Link>

          <button
            type="button"
            className="admin-header-logout"
            onClick={handleLogout}
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;