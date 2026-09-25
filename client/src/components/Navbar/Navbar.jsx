import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import { FaLeaf } from "react-icons/fa";

import {
  FiBell,
  FiChevronDown,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMessageSquare,
  FiPackage,
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

const SOCKET_URL = "http://localhost:5000";

const Navbar = () => {
  const {
    user,
    isAuthenticated,
    logout,
  } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);

  /*
   * Fetch unread notification count
   * from the database.
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

  /*
   * Real-time notification listener
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    });

    socket.on("connect", () => {
      console.log(
        "Navbar notification socket connected:",
        socket.id
      );
    });

    /*
     * When the backend sends a new notification,
     * increase the unread notification count.
     */
    socket.on(
      "new-notification",
      (notification) => {
        console.log(
          "New notification received:",
          notification
        );

        setUnreadCount(
          (previousCount) => previousCount + 1
        );
      }
    );

    socket.on("connect_error", (error) => {
      console.error(
        "Navbar notification socket connection error:",
        error.message
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  /*
   * Logout
   */
  const handleLogout = () => {
    setMenuOpen(false);

    logout();

    navigate("/login");
  };

  /*
   * Check if navbar link is active
   */
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="navbar">
      <div className="navbar-container">

        {/* Logo */}
        <Link
          to="/"
          className="navbar-logo"
        >
          <span className="navbar-logo-icon">
            <FaLeaf />
          </span>

          <span className="navbar-logo-text">
            ShardaFind
          </span>
        </Link>

        {/* Navigation */}
        <nav className="navbar-links">
          <Link
            to="/browse"
            className={`navbar-link ${
              isActive("/browse")
                ? "active"
                : ""
            }`}
          >
            Browse
          </Link>

          <Link
            to="/#how-it-works"
            className="navbar-link"
          >
            How It Works
          </Link>

          <Link
            to="/#about"
            className="navbar-link"
          >
            About
          </Link>
        </nav>

        {/* Right side */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="navbar-user">

              {/* Notification button */}
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

              {/* User menu */}
              <div className="navbar-user-menu">
                <button
                  type="button"
                  className="navbar-user-button"
                  onClick={() =>
                    setMenuOpen(
                      (previous) => !previous
                    )
                  }
                >
                  <span className="navbar-user-avatar">
                    <FiUser />
                  </span>

                  <span className="navbar-user-name">
                    {user?.name || "Account"}
                  </span>

                  <FiChevronDown
                    className={
                      menuOpen
                        ? "rotate"
                        : ""
                    }
                  />
                </button>

                {menuOpen && (
                  <div className="navbar-user-dropdown">

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

                    {/* Messages */}
                    <Link
                      to="/messages"
                      className="user-dropdown-item"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      <FiMessageSquare />

                      <span>
                        Messages
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
          ) : (
            <>
              {/* Login */}
              <Link
                to="/login"
                className="navbar-login-button"
              >
                Login
              </Link>

              {/* Register */}
              <Link
                to="/register"
                className="navbar-register-button"
              >
                Register
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
