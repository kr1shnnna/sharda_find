import { useEffect, useMemo, useState } from "react";

import {
  FiBell,
  FiCheckCircle,
  FiFileText,
  FiPackage,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";

import { Link } from "react-router-dom";

import api from "../../api/axios";

import "./Notifications.css";

const formatDate = (dateString) => {
  if (!dateString) {
    return "Date unavailable";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatRelativeDate = (dateString) => {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const difference = now - date;

  const minutes = Math.floor(
    difference / 60000
  );

  const hours = Math.floor(
    difference / 3600000
  );

  const days = Math.floor(
    difference / 86400000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDate(dateString);
};

const getNotificationIcon = (type) => {
  switch (type) {
    case "claim-submitted":
    case "claim-approved":
      return FiCheckCircle;

    case "claim-rejected":
      return FiXCircle;

    case "handover-submitted":
    case "handover-confirmed":
      return FiPackage;

    case "handover-rejected":
      return FiXCircle;

    case "new-message":
      return FiFileText;

    default:
      return FiBell;
  }
};

const Notifications = () => {
  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/notifications"
      );

      setNotifications(
        response.data?.notifications || []
      );

      setUnreadCount(
        response.data?.unreadCount || 0
      );
    } catch (error) {
      console.error(
        "Fetch notifications error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load notifications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (
    notificationId
  ) => {
    try {
      await api.patch(
        `/notifications/${notificationId}/read`
      );

      setNotifications(
        (previousNotifications) =>
          previousNotifications.map(
            (notification) =>
              notification._id ===
              notificationId
                ? {
                    ...notification,
                    read: true,
                  }
                : notification
          )
      );

      setUnreadCount(
        (previousCount) =>
          Math.max(previousCount - 1, 0)
      );

      // Tell Navbar to refresh its unread count.
      window.dispatchEvent(
        new CustomEvent("notification-read")
      );
    } catch (error) {
      console.error(
        "Mark notification as read error:",
        error
      );
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      await api.patch(
        "/notifications/read-all"
      );

      setNotifications(
        (previousNotifications) =>
          previousNotifications.map(
            (notification) => ({
              ...notification,
              read: true,
            })
          )
      );

      setUnreadCount(0);

      // Tell Navbar to refresh its unread count.
      window.dispatchEvent(
        new CustomEvent(
          "notifications-all-read"
        )
      );
    } catch (error) {
      console.error(
        "Mark all notifications as read error:",
        error
      );
    }
  };

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );
  }, [notifications]);

  if (loading) {
    return (
      <main className="notifications-page">
        <div className="notifications-loading">
          <div className="notifications-spinner" />
          <p>
            Loading notifications...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="notifications-page">
        <div className="notifications-error">
          <div className="notifications-state-icon">
            <FiRefreshCw />
          </div>

          <h2>
            Unable to load notifications
          </h2>

          <p>{error}</p>

          <button
            type="button"
            className="notifications-retry-button"
            onClick={fetchNotifications}
          >
            <FiRefreshCw />
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="notifications-page">
      <div className="notifications-container">

        {/* Header */}

        <div className="notifications-header">
          <div>
            <p className="notifications-label">
              ShardaFind
            </p>

            <h1>Notifications</h1>

            <p className="notifications-description">
              Stay updated on your lost and found
              activity.
            </p>
          </div>

          <div className="notifications-header-actions">
            <span className="notifications-count">
              {unreadCount} unread
            </span>

            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-button"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}

        {sortedNotifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">
              <FiBell />
            </div>

            <h2>
              No notifications
            </h2>

            <p>
              You're all caught up. New updates
              will appear here.
            </p>

            <Link
              to="/dashboard"
              className="notifications-dashboard-button"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="notifications-list">
            {sortedNotifications.map(
              (notification) => {
                const Icon =
                  getNotificationIcon(
                    notification.type
                  );

                return (
                  <button
                    type="button"
                    key={notification._id}
                    className={`notification-card ${
                      notification.read === false
                        ? "unread"
                        : ""
                    }`}
                    onClick={() =>
                      markAsRead(
                        notification._id
                      )
                    }
                  >
                    <div className="notification-card-icon">
                      <Icon />
                    </div>

                    <div className="notification-card-content">
                      <div className="notification-card-top">
                        <h2>
                          {notification.title}
                        </h2>

                        <span>
                          {formatRelativeDate(
                            notification.createdAt
                          )}
                        </span>
                      </div>

                      <p>
                        {notification.message}
                      </p>

                      {notification.item
                        ?.title && (
                        <span className="notification-card-item">
                          {
                            notification.item
                              .title
                          }
                        </span>
                      )}
                    </div>

                    {notification.read ===
                      false && (
                      <span className="notification-card-dot" />
                    )}
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default Notifications;
