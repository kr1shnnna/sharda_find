import { useEffect, useMemo, useRef, useState } from "react";
import { FaLeaf } from "react-icons/fa";
import {
  FiBell,
  FiCheck,
  FiLogOut,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

import "./AdminHeader.css";

const AdminHeader = () => {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] =
    useState(false);
  const [loadingNotifications, setLoadingNotifications] =
    useState(false);

  const notificationRef = useRef(null);

  /*
   * Store notification IDs that have already
   * been received.
   *
   * This prevents duplicate Socket.IO events
   * from adding the same notification again.
   */
  const notificationIdsRef = useRef(new Set());

  /*
   * Calculate unread notifications directly
   * from the notifications array.
   *
   * This keeps the badge count synchronized
   * with the actual notification state.
   */
  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) => !notification.read
    ).length;
  }, [notifications]);

  /*
   * Fetch notifications when the admin header loads.
   */
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoadingNotifications(true);

        const response = await api.get("/notifications");

        const fetchedNotifications =
          response.data?.notifications || [];

        setNotifications(fetchedNotifications);

        /*
         * Store all existing notification IDs.
         *
         * This prevents a notification that was already
         * loaded from the API from being added again
         * when the same Socket.IO event arrives.
         */
        notificationIdsRef.current = new Set(
          fetchedNotifications.map(
            (notification) => notification._id
          )
        );
      } catch (error) {
        console.error(
          "Unable to fetch notifications:",
          error
        );
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, []);

  /*
   * Listen for real-time notifications.
   */
  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      return;
    }

    const socket = io("http://localhost:5000", {
      auth: {
        token,
      },
    });

    socket.on("connect", () => {
      console.log(
        "Admin notification socket connected:",
        socket.id
      );
    });

    /*
     * New notification received.
     */
    socket.on("new-notification", (data) => {
      const notification = data?.notification;

      /*
       * Ignore invalid notification objects.
       */
      if (!notification?._id) {
        return;
      }

      /*
       * Ignore duplicate notifications.
       *
       * This protects us if the same Socket.IO event
       * is received more than once.
       */
      if (
        notificationIdsRef.current.has(
          notification._id
        )
      ) {
        return;
      }

      /*
       * Remember this notification ID.
       */
      notificationIdsRef.current.add(
        notification._id
      );

      /*
       * Add the new notification to the top
       * of the notification list.
       */
      setNotifications((previous) => [
        notification,
        ...previous,
      ]);

      /*
       * unreadCount is calculated automatically
       * from notifications, so we do NOT manually
       * increment it here.
       */

      /*
       * Tell other admin pages that a new
       * notification has arrived.
       */
      window.dispatchEvent(
        new CustomEvent("admin-new-notification", {
          detail: notification,
        })
      );

      toast.success(
        notification.title || "New notification"
      );
    });

    /*
     * Admin case update.
     *
     * This is used by AdminDashboard to refresh
     * pending claims/handovers.
     */
    socket.on("admin-case-updated", (data) => {
      window.dispatchEvent(
        new CustomEvent("admin-case-updated", {
          detail: data,
        })
      );
    });

    socket.on("connect_error", (error) => {
      console.error(
        "Admin notification socket error:",
        error.message
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /*
   * Close notification dropdown when clicking outside.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
   * Logout admin.
   */
  const handleLogout = () => {
    logout();

    toast.success("Logged out successfully");

    navigate("/admin/login", {
      replace: true,
    });
  };

  /*
   * Mark one notification as read.
   */
  const handleNotificationClick = async (
    notification
  ) => {
    /*
     * If already read, there is nothing to update.
     */
    if (notification.read) {
      return;
    }

    try {
      /*
       * Update notification on the backend.
       */
      await api.patch(
        `/notifications/${notification._id}/read`
      );

      /*
       * Update the local notification.
       *
       * Because unreadCount is calculated from
       * notifications, changing read -> true
       * automatically decreases the badge count.
       */
      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notification._id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Unable to mark notification as read:",
        error
      );

      toast.error(
        "Unable to update notification."
      );
    }
  };

  /*
   * Mark every notification as read.
   */
  const handleMarkAllAsRead = async () => {
    /*
     * No API request is necessary if there
     * are no unread notifications.
     */
    if (unreadCount === 0) {
      return;
    }

    try {
      /*
       * Update all notifications on the backend.
       */
      await api.patch("/notifications/read-all");

      /*
       * Update every notification locally.
       *
       * unreadCount will automatically become 0
       * because every notification now has
       * read: true.
       */
      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      toast.success(
        "All notifications marked as read."
      );
    } catch (error) {
      console.error(
        "Unable to mark all notifications as read:",
        error
      );

      toast.error(
        "Unable to update notifications."
      );
    }
  };

  /*
   * Format notification date/time.
   */
  const formatNotificationTime = (createdAt) => {
    if (!createdAt) {
      return "";
    }

    const date = new Date(createdAt);

    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <header className="admin-header">
      <div className="admin-header-container">
        {/* Logo */}
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

        <div className="admin-header-actions">
          {/* Notifications */}
          <div
            className="admin-notification-wrapper"
            ref={notificationRef}
          >
            <button
              type="button"
              className="admin-notification-button"
              onClick={() =>
                setShowNotifications(
                  (previous) => !previous
                )
              }
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <FiBell />

              {unreadCount > 0 && (
                <span className="admin-notification-count">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="admin-notification-dropdown">
                {/* Notification Header */}
                <div className="admin-notification-header">
                  <div>
                    <h3>Notifications</h3>

                    <span>
                      {unreadCount > 0
                        ? `${unreadCount} unread`
                        : "All caught up"}
                    </span>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="admin-mark-all-read"
                      onClick={
                        handleMarkAllAsRead
                      }
                    >
                      <FiCheck />
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="admin-notification-list">
                  {loadingNotifications ? (
                    <div className="admin-notification-empty">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="admin-notification-empty">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications
                      .slice(0, 10)
                      .map((notification) => (
                        <button
                          type="button"
                          key={notification._id}
                          className={`admin-notification-item ${
                            !notification.read
                              ? "unread"
                              : ""
                          }`}
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                        >
                          <span className="admin-notification-dot" />

                          <div className="admin-notification-content">
                            <strong>
                              {notification.title}
                            </strong>

                            <p>
                              {notification.message}
                            </p>

                            <span>
                              {formatNotificationTime(
                                notification.createdAt
                              )}
                            </span>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin User */}
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

          {/* Logout */}
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