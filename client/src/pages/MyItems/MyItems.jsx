import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiEye,
  FiMapPin,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";

import api from "../../api/axios";

import "./MyItems.css";

import { useAuth } from "../../context/AuthContext";

const filters = [
  {
    value: "all",
    label: "All Items",
  },
  {
    value: "lost",
    label: "Lost",
  },
  {
    value: "found",
    label: "Found",
  },
];

const statusLabels = {
  active: "Active",
  "claim-pending": "Claim Pending",
  returned: "Returned",
  closed: "Closed",
};

const statusClasses = {
  active: "active",
  "claim-pending": "claim-pending",
  returned: "returned",
  closed: "closed",
};

const formatDate = (dateString) => {
  if (!dateString) {
    return "Date unavailable";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getCategoryLabel = (category) => {
  if (!category) {
    return "Other";
  }

  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getImageUrl = (item) => {
  /*
   * Backend stores images as:
   *
   * images: [
   *   {
   *     url: "...",
   *     publicId: "..."
   *   }
   * ]
   */

  if (
    Array.isArray(item.images) &&
    item.images.length > 0 &&
    item.images[0]?.url
  ) {
    return item.images[0].url;
  }

  return "https://placehold.co/800x600/f1f5f9/64748b?text=No+Image";
};

const MyItems = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [handoverLoading, setHandoverLoading] = useState(null);

  const [ownerHandoverLoading, setOwnerHandoverLoading] = useState(null);

  const [confirmationModal, setConfirmationModal] = useState(null);

  const fetchMyItems = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/items/my-items");

      setItems(response.data?.items || []);
    } catch (error) {
      console.error("Fetch my items error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to load your items. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const openHandoverConfirmation = (item) => {
    setConfirmationModal(item);
  };

  const closeHandoverConfirmation = () => {
    if (handoverLoading) return;

    setConfirmationModal(null);
  };

  useEffect(() => {
    if (!confirmationModal) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeHandoverConfirmation();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [confirmationModal, handoverLoading]);

  const handleHandover = async () => {
    if (!confirmationModal) return;

    const itemId = confirmationModal._id;

    try {
      setHandoverLoading(itemId);

      await api.post(`/handovers/${itemId}`);

      setConfirmationModal(null);

      await fetchMyItems();
    } catch (error) {
      console.error("Report handover error:", error);

      alert(
        error.response?.data?.message ||
          "Unable to report handover. Please try again.",
      );
    } finally {
      setHandoverLoading(null);
    }
  };

  const handleOwnerHandover = async (itemId) => {
    const confirmed = window.confirm(
      "Have you handed this item over to the owner?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setOwnerHandoverLoading(itemId);

      await api.patch(`/items/${itemId}/confirm-handover`);

      await fetchMyItems();
    } catch (error) {
      console.error("Confirm owner handover error:", error);

      alert(
        error.response?.data?.message ||
          "Unable to confirm the handover. Please try again.",
      );
    } finally {
      setOwnerHandoverLoading(null);
    }
  };

  useEffect(() => {
    fetchMyItems();
  }, []);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") {
      return items;
    }

    return items.filter((item) => item.type === activeFilter);
  }, [items, activeFilter]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  return (
    <main className="my-items-page">
      <div className="my-items-container">
        {/* DEPARTMENT HANDOVER CONFIRMATION MODAL */}

        {confirmationModal && (
          <div
            className="confirmation-modal-overlay"
            onClick={closeHandoverConfirmation}
          >
            <div
              className="confirmation-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="confirmation-modal-close"
                onClick={closeHandoverConfirmation}
                disabled={handoverLoading}
                aria-label="Close"
              >
                <FiX />
              </button>

              <div className="confirmation-modal-icon">
                <FiPackage />
              </div>

              <h2>Hand over item?</h2>

              <p className="confirmation-modal-message">
                Are you sure you want to hand over{" "}
                <strong>{confirmationModal.title}</strong> to the Lost & Found
                Department?
              </p>

              <p className="confirmation-modal-note">
                The department will review and confirm the handover. The item's
                location will change to the Lost & Found Department only after
                the department confirms receipt.
              </p>

              <div className="confirmation-modal-actions">
                <button
                  type="button"
                  className="confirmation-modal-cancel"
                  onClick={closeHandoverConfirmation}
                  disabled={handoverLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="confirmation-modal-confirm"
                  onClick={handleHandover}
                  disabled={handoverLoading}
                >
                  <FiCheckCircle />

                  {handoverLoading
                    ? "Submitting..."
                    : "Hand over to Department"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}

        <div className="my-items-header">
          <div>
            <p className="my-items-label">ShardaFind</p>

            <h1>My Items</h1>

            <p className="my-items-description">
              Manage the lost and found items you have reported.
            </p>
          </div>

          <div className="my-items-actions">
            <Link
              to="/report-lost"
              className="my-items-report-button secondary"
            >
              <FiPlus />
              Report Lost
            </Link>

            <Link to="/report-found" className="my-items-report-button primary">
              <FiPlus />
              Report Found
            </Link>
          </div>
        </div>

        {/* FILTERS */}

        <div className="my-items-toolbar">
          <div className="my-items-filters">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`my-items-filter ${
                  activeFilter === filter.value ? "active" : ""
                }`}
                onClick={() => handleFilterChange(filter.value)}
              >
                {filter.label}

                {filter.value === "all" && <span>{items.length}</span>}

                {filter.value === "lost" && (
                  <span>
                    {items.filter((item) => item.type === "lost").length}
                  </span>
                )}

                {filter.value === "found" && (
                  <span>
                    {items.filter((item) => item.type === "found").length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {!loading && items.length > 0 && (
            <span className="my-items-count">
              {filteredItems.length}{" "}
              {filteredItems.length === 1 ? "item" : "items"}
            </span>
          )}
        </div>

        {/* LOADING */}

        {loading && (
          <div className="my-items-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="my-item-skeleton" key={index}>
                <div className="skeleton-image" />

                <div className="skeleton-content">
                  <div className="skeleton-line title" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />

                  <div className="skeleton-footer">
                    <div className="skeleton-small" />
                    <div className="skeleton-button" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="my-items-state">
            <div className="my-items-state-icon error">
              <FiAlertCircle />
            </div>

            <h2>Unable to load your items</h2>

            <p>{error}</p>

            <button
              type="button"
              className="retry-button"
              onClick={fetchMyItems}
            >
              <FiRefreshCw />
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!loading && !error && items.length === 0 && (
          <div className="my-items-state">
            <div className="my-items-state-icon">
              <FiPackage />
            </div>

            <h2>No items reported yet</h2>

            <p>Items that you report will appear here.</p>

            <div className="empty-state-actions">
              <Link to="/report-lost" className="empty-state-button secondary">
                <FiPlus />
                Report Lost Item
              </Link>

              <Link to="/report-found" className="empty-state-button primary">
                <FiPlus />
                Report Found Item
              </Link>
            </div>
          </div>
        )}

        {/* FILTER EMPTY */}

        {!loading &&
          !error &&
          items.length > 0 &&
          filteredItems.length === 0 && (
            <div className="my-items-state filter-empty">
              <div className="my-items-state-icon">
                <FiPackage />
              </div>

              <h2>No {activeFilter} items</h2>

              <p>You haven't reported any {activeFilter} items yet.</p>

              <button
                type="button"
                className="retry-button"
                onClick={() => setActiveFilter("all")}
              >
                View All Items
              </button>
            </div>
          )}

        {/* ITEMS */}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="my-items-grid">
            {filteredItems.map((item) => {
              const isLost = item.type === "lost";

              const currentUserId = user?.id || user?._id;

              const isFinder =
                isLost &&
                item.foundBy?.toString() === currentUserId?.toString();

              const statusClass = statusClasses[item.status] || "active";

              const statusLabel = statusLabels[item.status] || "Active";

              return (
                <article className="my-item-card" key={item._id}>
                  {/* IMAGE */}

                  <div className="my-item-image">
                    <img
                      src={getImageUrl(item)}
                      alt={item.title}
                      onError={(event) => {
                        event.currentTarget.src =
                          "https://placehold.co/800x600/f1f5f9/64748b?text=No+Image";
                      }}
                    />

                    <span
                      className={`my-item-type-badge ${
                        isLost ? "lost" : "found"
                      }`}
                    >
                      {isLost ? "Lost" : "Found"}
                    </span>
                  </div>

                  {/* CONTENT */}

                  <div className="my-item-content">
                    <div className="my-item-title-row">
                      <h2>{item.title}</h2>

                      <span className={`my-item-status ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="my-item-details">
                      <div className="my-item-detail">
                        <FiMapPin />

                        <span>{item.location || "Location unavailable"}</span>
                      </div>

                      <div className="my-item-detail">
                        <FiCalendar />

                        <span>{formatDate(item.itemDate)}</span>
                      </div>
                    </div>

                    <div className="my-item-footer">
                      <span className="my-item-category">
                        {getCategoryLabel(item.category)}
                      </span>

                      <div className="my-item-actions">
                        <button
                          type="button"
                          className="my-item-view-button"
                          onClick={() => navigate(`/items/${item._id}`)}
                        >
                          <FiEye />
                          View
                        </button>

                        {/* OWNER HANDOVER */}

                        {isFinder &&
                          item.status === "active" &&
                          !item.finderHandedOver && (
                            <button
                              type="button"
                              className="my-item-handover-button"
                              disabled={ownerHandoverLoading === item._id}
                              onClick={() => handleOwnerHandover(item._id)}
                            >
                              <FiCheckCircle />

                              {ownerHandoverLoading === item._id
                                ? "Confirming..."
                                : "I Handed Over the Item"}
                            </button>
                          )}

                        {isFinder &&
                          item.status === "active" &&
                          item.finderHandedOver &&
                          !item.returnConfirmedByOwner && (
                            <span className="my-item-handover-status pending">
                              <FiCheckCircle />
                              Handed Over — Waiting for Owner
                            </span>
                          )}

                        {/* DEPARTMENT HANDOVER */}

                        {((item.type === "lost" && item.foundBy) ||
                          item.type === "found") &&
                          item.itemLocation === "with-finder" &&
                          item.status !== "returned" && (
                            <>
                              {/* No previous handover */}

                              {!item.handover ? (
                                <button
                                  type="button"
                                  className="my-item-handover-button"
                                  disabled={handoverLoading === item._id}
                                  onClick={() => openHandoverConfirmation(item)}
                                >
                                  <FiCheckCircle />

                                  {handoverLoading === item._id
                                    ? "Submitting..."
                                    : "Hand over to L&F Department"}
                                </button>
                              ) : item.handover.status === "pending" ? (
                                /* Pending */

                                <span className="my-item-handover-status pending">
                                  <FiAlertCircle />
                                  Waiting for Department
                                </span>
                              ) : item.handover.status === "rejected" ? (
                                /* Rejected */

                                <div className="my-item-handover-rejected">
                                  <span className="my-item-handover-status rejected">
                                    <FiAlertCircle />
                                    Handover Rejected
                                  </span>

                                  <button
                                    type="button"
                                    className="my-item-handover-button"
                                    disabled={handoverLoading === item._id}
                                    onClick={() =>
                                      openHandoverConfirmation(item)
                                    }
                                  >
                                    <FiCheckCircle />

                                    {handoverLoading === item._id
                                      ? "Submitting..."
                                      : "Try Again"}
                                  </button>
                                </div>
                              ) : null}
                            </>
                          )}

                        {/* CONFIRMED */}

                        {item.type === "lost" &&
                          item.itemLocation === "lost-found-department" && (
                            <span className="my-item-handover-status confirmed">
                              <FiCheckCircle />
                              With Department
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default MyItems;
