import { useEffect, useState } from "react";

import { FaLeaf } from "react-icons/fa";

import {
  FiBell,
  FiChevronDown,
  FiGrid,
  FiLogOut,
  FiPackage,
  FiFileText,
  FiUser,
} from "react-icons/fi";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    user,
    isAuthenticated,
    logout,
  } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /*
   * Fetch unread notification count
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadNotifications = async () => {
      try {
        const response = await api.get("/notifications");

        setUnreadCount(
          response.data?.unreadCount || 0
        );
      } catch (error) {
        console.error(
          "Fetch notification count error:",
          error
        );
      }
    };

    fetchUnreadNotifications();
  }, [isAuthenticated, location.pathname]);

  const handleSectionClick = (sectionId) => {
    setMenuOpen(false);

    if (location.pathname === "/") {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({
          behavior: "smooth",
        });

      return;
    }

    navigate(`/#${sectionId}`);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setUnreadCount(0);

    navigate("/login", {
      replace: true,
    });
  };

  const getUserName = () => {
    if (user?.name) {
      return user.name;
    }

    if (user?.email) {
      return user.email.split("@")[0];
    }

    return "Account";
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">

        {/* Logo */}
        <Link
          to="/"
          className="navbar-logo"
          onClick={() => setMenuOpen(false)}
        >
          <span className="logo-icon">
            <FaLeaf />
          </span>

          <span>ShardaFind</span>
        </Link>

        {/* Navigation */}
        <div className="navbar-links">
          <Link
            to="/browse"
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </Link>

          <button
            type="button"
            onClick={() =>
              handleSectionClick("how-it-works")
            }
          >
            How it works
          </button>

          <button
            type="button"
            onClick={() =>
              handleSectionClick("about")
            }
          >
            About
          </button>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {!isAuthenticated ? (
            <>
              <Link
                to="/login"
                className="login-button"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="register-button"
              >
                Register
              </Link>
            </>
          ) : (
            <div className="navbar-user">

              {/* Notification Button */}
              <Link
                to="/notifications"
                className="navbar-notification-button"
                aria-label="Notifications"
                title="Notifications"
              >
                <FiBell />

                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              <div className="navbar-user-menu">
                <button
                  type="button"
                  className="user-menu-button"
                  onClick={() =>
                    setMenuOpen(
                      (previous) => !previous
                    )
                  }
                  aria-expanded={menuOpen}
                >
                  <span className="user-avatar">
                    <FiUser />
                  </span>

                  <span className="user-name">
                    {getUserName()}
                  </span>

                  <FiChevronDown
                    className={`user-chevron ${
                      menuOpen ? "open" : ""
                    }`}
                  />
                </button>

                {/* User Dropdown */}
                {menuOpen && (
                  <div className="user-dropdown">

                    {/* User Information */}
                    <div className="user-dropdown-header">
                      <span className="dropdown-user-name">
                        {getUserName()}
                      </span>

                      {user?.email && (
                        <span className="dropdown-user-email">
                          {user.email}
                        </span>
                      )}
                    </div>

                    <div className="user-dropdown-divider" />

                    {/* Dashboard */}
                    <Link
                      to="/dashboard"
                      className="user-dropdown-item"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      <FiGrid />

                      <span>
                        Dashboard
                      </span>
                    </Link>

                    {/* My Items */}
                    <Link
                      to="/my-items"
                      className="user-dropdown-item"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      <FiPackage />

                      <span>
                        My Items
                      </span>
                    </Link>

                    {/* My Claims */}
                    <Link
                      to="/my-claims"
                      className="user-dropdown-item"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      <FiFileText />

                      <span>
                        My Claims
                      </span>
                    </Link>

                    <div className="user-dropdown-divider" />

                    {/* Logout */}
                    <button
                      type="button"
                      className="user-dropdown-item logout-item"
                      onClick={handleLogout}
                    >
                      <FiLogOut />

                      <span>
                        Logout
                      </span>
                    </button>

                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;