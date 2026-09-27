import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import { FaLeaf } from "react-icons/fa";
import {
  FiBell,
  FiChevronDown,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiUser,
  FiX,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

    socket.on("new-notification", (notification) => {
      console.log(
        "New notification received:",
        notification
      );

      setUnreadCount(
        (previousCount) => previousCount + 1
      );
    });

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
    setMobileMenuOpen(false);

    logout();

    navigate("/login");
  };

  /*
   * Check if navbar link is active
   */
  const isActive = (path) => {
    return location.pathname === path;
  };

  /*
   * Close mobile menu after navigation
   */
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-container">

        {/* Logo */}
        <Link
          to="/"
          className="navbar-logo"
          onClick={closeMobileMenu}
        >
          <span className="navbar-logo-icon">
            <FaLeaf />
          </span>

          <span className="navbar-logo-text">
            ShardaFind
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="navbar-links">
          <Link
            to="/browse"
            className={`navbar-link ${
              isActive("/browse") ? "active" : ""
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

        {/* Desktop Right Side */}
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
                      menuOpen ? "rotate" : ""
                    }
                  />
                </button>

                {menuOpen && (
                  <div className="navbar-user-dropdown">

                    <Link
                      to="/dashboard"
                      className="user-dropdown-item"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      <FiGrid />
                      <span>Dashboard</span>
                    </Link>

                    <Link
                      to="/my-items"
                      className="user-dropdown-item"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      <span>My Items</span>
                    </Link>

                    <Link
                      to="/my-claims"
                      className="user-dropdown-item"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      <span>My Claims</span>
                    </Link>

                    <Link
                      to="/messages"
                      className="user-dropdown-item"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      <FiMessageSquare />
                      <span>Messages</span>
                    </Link>

                    <div className="user-dropdown-divider" />

                    <button
                      type="button"
                      className="user-dropdown-item logout-item"
                      onClick={handleLogout}
                    >
                      <FiLogOut />
                      <span>Logout</span>
                    </button>

                  </div>
                )}
              </div>

            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="navbar-login-button"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="navbar-register-button"
              >
                Register
              </Link>
            </>
          )}

        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="navbar-mobile-button"
          onClick={() =>
            setMobileMenuOpen(
              (previous) => !previous
            )
          }
          aria-label={
            mobileMenuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>

      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-menu">

          <nav className="navbar-mobile-links">

            {/* Logged-in account section */}
            {isAuthenticated && (
              <>
                <div className="navbar-mobile-user">

                  <div className="navbar-mobile-user-icon">
                    <FiUser />
                  </div>

                  <div className="navbar-mobile-user-info">
                    <span className="navbar-mobile-user-name">
                      {user?.name || "Account"}
                    </span>

                    <span className="navbar-mobile-user-role">
                      Student
                    </span>
                  </div>

                </div>

                <div className="navbar-mobile-divider" />
              </>
            )}

            {/* Common navigation */}
            <Link
              to="/browse"
              className={`navbar-mobile-link ${
                isActive("/browse") ? "active" : ""
              }`}
              onClick={closeMobileMenu}
            >
              Browse
            </Link>

            <Link
              to="/#how-it-works"
              className="navbar-mobile-link"
              onClick={closeMobileMenu}
            >
              How It Works
            </Link>

            <Link
              to="/#about"
              className="navbar-mobile-link"
              onClick={closeMobileMenu}
            >
              About
            </Link>

            {/* Authenticated navigation */}
            {isAuthenticated && (
              <>
                <div className="navbar-mobile-divider" />

                {/* Dashboard */}
                <Link
                  to="/dashboard"
                  className="navbar-mobile-link navbar-mobile-link-with-icon"
                  onClick={closeMobileMenu}
                >
                  <span>
                    <FiGrid />
                    Dashboard
                  </span>
                </Link>

                {/* Notifications */}
                <Link
                  to="/notifications"
                  className="navbar-mobile-link navbar-mobile-link-with-icon"
                  onClick={closeMobileMenu}
                >
                  <span>
                    <FiBell />
                    Notifications
                  </span>

                  {unreadCount > 0 && (
                    <span className="mobile-notification-badge">
                      {unreadCount > 99
                        ? "99+"
                        : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Messages */}
                <Link
                  to="/messages"
                  className="navbar-mobile-link navbar-mobile-link-with-icon"
                  onClick={closeMobileMenu}
                >
                  <span>
                    <FiMessageSquare />
                    Messages
                  </span>
                </Link>

                <div className="navbar-mobile-divider" />

                {/* Logout */}
                <button
                  type="button"
                  className="navbar-mobile-link navbar-mobile-logout"
                  onClick={handleLogout}
                >
                  <span>
                    <FiLogOut />
                    Logout
                  </span>
                </button>
              </>
            )}

            {/* Logged-out navigation */}
            {!isAuthenticated && (
              <>
                <div className="navbar-mobile-divider" />

                <div className="navbar-mobile-auth">

                  <Link
                    to="/login"
                    className="navbar-login-button"
                    onClick={closeMobileMenu}
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    className="navbar-register-button"
                    onClick={closeMobileMenu}
                  >
                    Register
                  </Link>

                </div>
              </>
            )}

          </nav>

        </div>
      )}
    </header>
  );
};

export default Navbar;