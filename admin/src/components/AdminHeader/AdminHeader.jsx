import {
  FaLeaf,
} from "react-icons/fa";

import {
  FiArrowLeft,
  FiLogOut,
} from "react-icons/fi";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  useAuth,
} from "../../context/AuthContext";

import "./AdminHeader.css";


const AdminHeader = () => {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();


  const handleLogout = () => {
    logout();

    toast.success(
      "Logged out successfully"
    );

    navigate(
      "/admin/login",
      {
        replace: true,
      }
    );
  };


  return (
    <header className="admin-header">

      <div className="admin-header-container">

        {/* =========================
            Branding
        ========================= */}

        <Link
          to="/admin"
          className="admin-header-logo"
        >

          <span className="admin-header-logo-icon">
            <FaLeaf />
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


        {/* =========================
            Right Side
        ========================= */}

        <div className="admin-header-actions">

          {/* Admin information */}

          <div className="admin-header-user">

            <div className="admin-header-avatar">
              {user?.name
                ?.charAt(0)
                .toUpperCase() || "A"}
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


          {/* Dashboard */}

          <Link
            to="/admin"
            className="admin-header-dashboard-link"
          >
            <FiArrowLeft />

            <span>
              Dashboard
            </span>
          </Link>


          {/* Logout */}

          <button
            type="button"
            className="admin-header-logout"
            onClick={handleLogout}
          >
            <FiLogOut />

            <span>
              Logout
            </span>
          </button>

        </div>

      </div>

    </header>
  );
};


export default AdminHeader;
