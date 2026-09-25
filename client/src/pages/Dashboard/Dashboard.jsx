import { useEffect, useMemo, useState } from "react";
import {
  FiBell,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiGrid,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiXCircle,
} from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

import "./Dashboard.css";

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

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

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

const getUserName = (user) => {
  if (user?.name) {
    return user.name.split(" ")[0];
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Student";
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

const getNotificationDescription = (notification) => {
  if (notification?.message) {
    return notification.message;
  }

  if (notification?.claim?.status) {
    return `Claim ${notification.claim.status}.`;
  }

  if (notification?.item?.title) {
    return `Update for ${notification.item.title}.`;
  }

  return "";
};

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        itemsResponse,
        claimsResponse,
        notificationsResponse,
      ] = await Promise.all([
        api.get("/items/my-items"),
        api.get("/claims/my-claims"),
        api.get("/notifications"),
      ]);

      setItems(itemsResponse.data?.items || []);

      setClaims(itemsResponse.data?.claims || []);

      setNotifications(
        notificationsResponse.data?.notifications || []
      );

      setUnreadCount(
        notificationsResponse.data?.unreadCount || 0
      );
    } catch (error) {
      console.error("Fetch dashboard data error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to load your dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification?._id) {
      return;
    }

    // Already read — nothing to update.
    if (notification.read) {
      return;
    }

    try {
      await api.patch(
        `/notifications/${notification._id}/read`
      );

      setNotifications((previousNotifications) =>
        previousNotifications.map((currentNotification) =>
          currentNotification._id === notification._id
            ? {
                ...currentNotification,
                read: true,
              }
            : currentNotification
        )
      );

      setUnreadCount((previousCount) =>
        Math.max(previousCount - 1, 0)
      );
    } catch (error) {
      console.error(
        "Mark notification as read error:",
        error
      );
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statistics = useMemo(() => {
    return {
      totalItems: items.length,

      activeItems: items.filter(
        (item) => item.status === "active"
      ).length,

      returnedItems: items.filter(
        (item) => item.status === "returned"
      ).length,

      pendingClaims: claims.filter(
        (claim) => claim.status === "pending"
      ).length,

      approvedClaims: claims.filter(
        (claim) => claim.status === "approved"
      ).length,

      rejectedClaims: claims.filter(
        (claim) => claim.status === "rejected"
      ).length,

      unreadNotifications: unreadCount,
    };
  }, [items, claims, unreadCount]);

  const recentItems = useMemo(() => {
    return [...items]
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(0, 3);
  }, [items]);

  const recentClaims = useMemo(() => {
    return [...claims]
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(0, 3);
  }, [claims]);

  const recentNotifications = useMemo(() => {
    return [...notifications]
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(0, 4);
  }, [notifications]);

  const recentActivity = useMemo(() => {
    const activities = [];

    recentItems.forEach((item) => {
      activities.push({
        id: `item-${item._id}`,
        type: "item",
        title: `You reported ${item.title}`,
        description:
          item.type === "lost"
            ? "Lost item reported"
            : "Found item reported",
        date: item.createdAt,
        icon: FiPackage,
      });
    });

    recentClaims.forEach((claim) => {
      let description = "Waiting for review";
      let icon = FiClock;

      if (claim.status === "approved") {
        description = "Claim approved";
        icon = FiCheckCircle;
      }

      if (claim.status === "rejected") {
        description = "Claim rejected";
        icon = FiXCircle;
      }

      activities.push({
        id: `claim-${claim._id}`,
        type: "claim",
        title: `Claim submitted for ${
          claim.item?.title || "an item"
        }`,
        description,
        date: claim.createdAt,
        icon,
      });
    });

    notifications.forEach((notification) => {
      activities.push({
        id: `notification-${notification._id}`,
        type: "notification",
        title: notification.title || "Notification",
        description:
          getNotificationDescription(notification),
        date: notification.createdAt,
        icon: getNotificationIcon(notification.type),
      });
    });

    return activities
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(0, 5);
  }, [recentItems, recentClaims, notifications]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <div className="dashboard-loading">
            <div className="dashboard-spinner"></div>

            <p>Loading your dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <div className="dashboard-error">
            <div className="dashboard-state-icon error">
              <FiRefreshCw />
            </div>

            <h2>Unable to load dashboard</h2>

            <p>{error}</p>

            <button
              type="button"
              className="dashboard-retry-button"
              onClick={fetchDashboardData}
            >
              <FiRefreshCw />
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar-header">
            <span className="dashboard-sidebar-label">
              Student
            </span>

            <h2>My Account</h2>
          </div>

          <nav className="dashboard-navigation">
            <Link
              to="/dashboard"
              className={`dashboard-nav-item ${
                isActive("/dashboard")
                  ? "active"
                  : ""
              }`}
            >
              <FiGrid />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/my-items"
              className={`dashboard-nav-item ${
                isActive("/my-items")
                  ? "active"
                  : ""
              }`}
            >
              <FiPackage />
              <span>My Items</span>

              {statistics.totalItems > 0 && (
                <span className="dashboard-nav-count">
                  {statistics.totalItems}
                </span>
              )}
            </Link>

            <Link
              to="/my-claims"
              className={`dashboard-nav-item ${
                isActive("/my-claims")
                  ? "active"
                  : ""
              }`}
            >
              <FiFileText />
              <span>My Claims</span>

              {statistics.pendingClaims > 0 && (
                <span className="dashboard-nav-count">
                  {statistics.pendingClaims}
                </span>
              )}
            </Link>

            <Link
              to="/notifications"
              className={`dashboard-nav-item ${
                isActive("/notifications")
                  ? "active"
                  : ""
              }`}
            >
              <FiBell />
              <span>Notifications</span>

              {statistics.unreadNotifications > 0 && (
                <span className="dashboard-nav-count">
                  {statistics.unreadNotifications}
                </span>
              )}
            </Link>
          </nav>

          <div className="dashboard-sidebar-divider" />

          <div className="dashboard-sidebar-actions">
            <Link
              to="/report-lost"
              className="dashboard-sidebar-button secondary"
            >
              <FiPlus />
              Report Lost
            </Link>

            <Link
              to="/report-found"
              className="dashboard-sidebar-button primary"
            >
              <FiPlus />
              Report Found
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <section className="dashboard-content">

          {/* Header */}
          <div className="dashboard-header">
            <div>
              <p className="dashboard-label">
                ShardaFind
              </p>

              <h1>
                Welcome back, {getUserName(user)}
              </h1>

              <p className="dashboard-description">
                Here's what's happening with your lost
                and found activity.
              </p>
            </div>

            <Link
              to="/browse"
              className="dashboard-browse-button"
            >
              <FiSearch />
              Browse Items
            </Link>
          </div>

          {/* Overview Cards */}
          <div className="dashboard-stats">

            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">
                <FiPackage />
              </div>

              <div>
                <span>Items Reported</span>
                <strong>
                  {statistics.totalItems}
                </strong>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">
                <FiClock />
              </div>

              <div>
                <span>Pending Claims</span>
                <strong>
                  {statistics.pendingClaims}
                </strong>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">
                <FiCheckCircle />
              </div>

              <div>
                <span>Items Returned</span>
                <strong>
                  {statistics.returnedItems}
                </strong>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">
                <FiBell />
              </div>

              <div>
                <span>Unread Notifications</span>
                <strong>
                  {statistics.unreadNotifications}
                </strong>
              </div>
            </div>

          </div>

          {/* Main Dashboard Grid */}
          <div className="dashboard-main-grid">

            {/* Recent Activity */}
            <section className="dashboard-panel activity-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Recent Activity</h2>

                  <p>
                    Your latest activity on ShardaFind.
                  </p>
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <div className="dashboard-panel-empty">
                  <div className="dashboard-empty-icon">
                    <FiGrid />
                  </div>

                  <h3>No activity yet</h3>

                  <p>
                    Your reported items, claims, and
                    notifications will appear here.
                  </p>
                </div>
              ) : (
                <div className="activity-list">
                  {recentActivity.map((activity) => {
                    const Icon = activity.icon;

                    return (
                      <div
                        className="activity-item"
                        key={activity.id}
                      >
                        <div className="activity-icon">
                          <Icon />
                        </div>

                        <div className="activity-content">
                          <h3>{activity.title}</h3>

                          <p>
                            {activity.description}
                          </p>
                        </div>

                        <span className="activity-date">
                          {formatRelativeDate(
                            activity.date
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Notifications */}
            <section className="dashboard-panel notifications-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Notifications</h2>

                  <p>Your latest updates.</p>
                </div>

                <Link
                  to="/notifications"
                  className="dashboard-panel-link"
                >
                  View all
                </Link>
              </div>

              {recentNotifications.length === 0 ? (
                <div className="dashboard-panel-empty">
                  <div className="dashboard-empty-icon">
                    <FiBell />
                  </div>

                  <h3>No notifications</h3>

                  <p>
                    You're all caught up.
                  </p>
                </div>
              ) : (
                <div className="notification-list">
                  {recentNotifications.map(
                    (notification) => {
                      const Icon =
                        getNotificationIcon(
                          notification.type
                        );

                      return (
                        <button
                          type="button"
                          className={`dashboard-notification ${
                            notification.read === false
                              ? "unread"
                              : ""
                          }`}
                          key={notification._id}
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                        >
                          <div className="notification-icon">
                            <Icon />
                          </div>

                          <div className="notification-content">
                            <h3>
                              {notification.title}
                            </h3>

                            <p>
                              {notification.message}
                            </p>

                            {notification.item?.title && (
                              <span className="notification-item">
                                {notification.item.title}
                              </span>
                            )}

                            <span className="notification-date">
                              {formatRelativeDate(
                                notification.createdAt
                              )}
                            </span>
                          </div>

                          {notification.read === false && (
                            <span className="notification-unread-dot" />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Quick Actions */}
          <section className="dashboard-panel quick-actions-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Quick Actions</h2>

                <p>
                  Common things you may want to do.
                </p>
              </div>
            </div>

            <div className="dashboard-quick-actions">

              <Link
                to="/report-lost"
                className="dashboard-quick-action"
              >
                <div className="quick-action-icon">
                  <FiPlus />
                </div>

                <div>
                  <h3>Report Lost Item</h3>

                  <p>
                    Report something you've lost.
                  </p>
                </div>
              </Link>

              <Link
                to="/report-found"
                className="dashboard-quick-action"
              >
                <div className="quick-action-icon">
                  <FiPackage />
                </div>

                <div>
                  <h3>Report Found Item</h3>

                  <p>
                    Help someone find their item.
                  </p>
                </div>
              </Link>

              <Link
                to="/browse"
                className="dashboard-quick-action"
              >
                <div className="quick-action-icon">
                  <FiSearch />
                </div>

                <div>
                  <h3>Browse Items</h3>

                  <p>
                    Search through reported items.
                  </p>
                </div>
              </Link>

              <Link
                to="/my-claims"
                className="dashboard-quick-action"
              >
                <div className="quick-action-icon">
                  <FiFileText />
                </div>

                <div>
                  <h3>View My Claims</h3>

                  <p>
                    Track your submitted claims.
                  </p>
                </div>
              </Link>

            </div>
          </section>

        </section>
      </div>
    </main>
  );
};

export default Dashboard;
