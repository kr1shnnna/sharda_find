import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiEye,
  FiFileText,
  FiImage,
  FiMapPin,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiUser,
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
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
};

const getImageUrl = (item) => {
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
  const [claims, setClaims] = useState([]);

  const [activeFilter, setActiveFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(true);

  const [error, setError] = useState("");

  const [handoverLoading, setHandoverLoading] =
    useState(null);

  const [ownerHandoverLoading, setOwnerHandoverLoading] =
    useState(null);

  const [confirmationModal, setConfirmationModal] =
    useState(null);

  // Finder claim review modal
  const [claimModal, setClaimModal] = useState(null);
  const [claimActionLoading, setClaimActionLoading] =
    useState(null);

  // Custom confirmation / feedback modals
  const [ownerHandoverModal, setOwnerHandoverModal] =
    useState(null);

  const [feedbackModal, setFeedbackModal] =
    useState(null);

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

  const fetchClaimsOnMyItems = async () => {
    try {
      setClaimsLoading(true);

      const response = await api.get("/claims/my-items");

      setClaims(response.data?.claims || []);
    } catch (error) {
      console.error(
        "Fetch claims on my items error:",
        error,
      );

      /*
       * Do not make the whole My Items page fail if the
       * claim endpoint has an issue.
       */
      setClaims([]);
    } finally {
      setClaimsLoading(false);
    }
  };

  const refreshPageData = async () => {
    await Promise.all([
      fetchMyItems(),
      fetchClaimsOnMyItems(),
    ]);
  };

  const getPendingClaimForItem = (itemId) => {
    return claims.find(
      (claim) =>
        claim.item?._id?.toString() ===
          itemId?.toString() &&
        claim.status === "pending",
    );
  };

  const openClaimModal = async (item) => {
    const existingClaim = getPendingClaimForItem(
      item._id,
    );

    if (existingClaim) {
      setClaimModal(existingClaim);
      return;
    }

    try {
      setClaimsLoading(true);

      const response = await api.get(
        "/claims/my-items",
      );

      const updatedClaims =
        response.data?.claims || [];

      setClaims(updatedClaims);

      const claim = updatedClaims.find(
        (claimItem) =>
          claimItem.item?._id?.toString() ===
            item._id?.toString() &&
          claimItem.status === "pending",
      );

      if (!claim) {
        setFeedbackModal({
          type: "error",
          title: "No Pending Claim",
          message:
            "No pending claim was found for this item.",
        });

        return;
      }

      setClaimModal(claim);
    } catch (error) {
      console.error("Fetch claim error:", error);

      setFeedbackModal({
        type: "error",
        title: "Unable to Load Claim",
        message:
          error.response?.data?.message ||
          "Unable to load the claim. Please try again.",
      });
    } finally {
      setClaimsLoading(false);
    }
  };

  const closeClaimModal = () => {
    if (claimActionLoading) {
      return;
    }

    setClaimModal(null);
  };

  /*
   * Finder approves/rejects a claim.
   *
   * IMPORTANT:
   * No window.confirm() and no browser alert().
   */
  const handleClaimAction = async (
    claimId,
    action,
  ) => {
    if (!claimId) {
      return;
    }

    const actionText =
      action === "approve"
        ? "approve"
        : "reject";

    try {
      setClaimActionLoading(action);

      if (action === "approve") {
        await api.patch(
          `/claims/${claimId}/approve`,
        );
      } else {
        await api.patch(
          `/claims/${claimId}/reject`,
        );
      }

      setClaimModal(null);

      await refreshPageData();

      setFeedbackModal({
        type: "success",

        title:
          action === "approve"
            ? "Claim Approved"
            : "Claim Rejected",

        message:
          action === "approve"
            ? "The claimant has been notified and messaging is now available."
            : "The claimant has been notified that their claim was rejected.",
      });
    } catch (error) {
      console.error(
        `${action} claim error:`,
        error,
      );

      setFeedbackModal({
        type: "error",

        title:
          action === "approve"
            ? "Unable to Approve Claim"
            : "Unable to Reject Claim",

        message:
          error.response?.data?.message ||
          `Unable to ${actionText} the claim. Please try again.`,
      });
    } finally {
      setClaimActionLoading(null);
    }
  };

  const openHandoverConfirmation = (item) => {
    setConfirmationModal(item);
  };

  const closeHandoverConfirmation = () => {
    if (handoverLoading) {
      return;
    }

    setConfirmationModal(null);
  };

  useEffect(() => {
    if (!confirmationModal) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeHandoverConfirmation();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    confirmationModal,
    handoverLoading,
  ]);

  useEffect(() => {
    if (!claimModal) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeClaimModal();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    claimModal,
    claimActionLoading,
  ]);

  useEffect(() => {
    if (!ownerHandoverModal) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeOwnerHandoverConfirmation();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    ownerHandoverModal,
    ownerHandoverLoading,
  ]);

  useEffect(() => {
    if (!feedbackModal) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setFeedbackModal(null);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [feedbackModal]);

  /*
   * Department handover
   */
  const handleHandover = async () => {
    if (!confirmationModal) {
      return;
    }

    const itemId = confirmationModal._id;

    try {
      setHandoverLoading(itemId);

      await api.post(
        `/handovers/${itemId}`,
      );

      setConfirmationModal(null);

      await fetchMyItems();
    } catch (error) {
      console.error(
        "Report handover error:",
        error,
      );

      setFeedbackModal({
        type: "error",
        title: "Unable to Report Handover",
        message:
          error.response?.data?.message ||
          "Unable to report handover. Please try again.",
      });
    } finally {
      setHandoverLoading(null);
    }
  };

  /*
   * Owner handover confirmation.
   *
   * This replaces window.confirm().
   */
  const openOwnerHandoverConfirmation = (
    itemId,
  ) => {
    if (!itemId) {
      return;
    }

    setOwnerHandoverModal(itemId);
  };

  const closeOwnerHandoverConfirmation = () => {
    if (ownerHandoverLoading) {
      return;
    }

    setOwnerHandoverModal(null);
  };

  /*
   * Finder confirms that the item was physically
   * handed over to the owner.
   */
  const handleOwnerHandover = async () => {
    if (!ownerHandoverModal) {
      return;
    }

    const itemId = ownerHandoverModal;

    try {
      setOwnerHandoverLoading(itemId);

      await api.patch(
        `/items/${itemId}/confirm-handover`,
      );

      setOwnerHandoverModal(null);

      await fetchMyItems();

      setFeedbackModal({
        type: "success",
        title: "Handover Confirmed",
        message:
          "The item has been marked as handed over to the owner.",
      });
    } catch (error) {
      console.error(
        "Confirm owner handover error:",
        error,
      );

      setFeedbackModal({
        type: "error",
        title: "Unable to Confirm Handover",
        message:
          error.response?.data?.message ||
          "Unable to confirm the handover. Please try again.",
      });
    } finally {
      setOwnerHandoverLoading(null);
    }
  };

  useEffect(() => {
    refreshPageData();
  }, []);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") {
      return items;
    }

    return items.filter(
      (item) => item.type === activeFilter,
    );
  }, [items, activeFilter]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  return (
    <main className="my-items-page">
      <div className="my-items-container">

        {/* =====================================================
            FINDER CLAIM REVIEW MODAL
        ====================================================== */}

        {claimModal && (
          <div
            className="claim-review-overlay"
            onClick={closeClaimModal}
          >
            <div
              className="claim-review-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                className="claim-review-close"
                onClick={closeClaimModal}
                disabled={Boolean(
                  claimActionLoading,
                )}
                aria-label="Close"
              >
                <FiX />
              </button>

              <div className="claim-review-icon">
                <FiCheckCircle />
              </div>

              <div className="claim-review-header">
                <p className="claim-review-label">
                  CLAIM REQUEST
                </p>

                <h2>
                  Review this claim
                </h2>

                <p>
                  Someone believes this item belongs
                  to them. Review their proof before
                  making a decision.
                </p>
              </div>

              {/* ITEM */}

              <div className="claim-review-item">
                <img
                  src={getImageUrl(
                    claimModal.item || {},
                  )}
                  alt={
                    claimModal.item?.title ||
                    "Item"
                  }
                  onError={(event) => {
                    event.currentTarget.src =
                      "https://placehold.co/800x600/f1f5f9/64748b?text=No+Image";
                  }}
                />

                <div>
                  <span>Item</span>

                  <strong>
                    {claimModal.item?.title ||
                      "Unknown item"}
                  </strong>

                  <small>
                    {claimModal.item?.category
                      ? getCategoryLabel(
                          claimModal.item
                            .category,
                        )
                      : "Category unavailable"}
                  </small>
                </div>
              </div>

              {/* CLAIMANT */}

              <div className="claim-review-section">
                <div className="claim-review-section-title">
                  <FiUser />
                  <span>Claimant</span>
                </div>

                <div className="claim-review-person">
                  <strong>
                    {claimModal.claimant?.name ||
                      "Name unavailable"}
                  </strong>

                  <span>
                    {claimModal.claimant?.email ||
                      "Email unavailable"}
                  </span>
                </div>
              </div>

              {/* OWNERSHIP PROOF */}

              <div className="claim-review-section">
                <div className="claim-review-section-title">
                  <FiCheckCircle />
                  <span>Ownership Proof</span>
                </div>

                <div className="claim-review-box">
                  {claimModal.ownershipProof ||
                    "No ownership proof provided."}
                </div>
              </div>

              {/* MESSAGE */}

              {claimModal.message && (
                <div className="claim-review-section">
                  <div className="claim-review-section-title">
                    <FiFileText />
                    <span>
                      Additional Message
                    </span>
                  </div>

                  <div className="claim-review-box">
                    {claimModal.message}
                  </div>
                </div>
              )}

              {/* EVIDENCE */}

              {Array.isArray(
                claimModal.evidenceImages,
              ) &&
                claimModal.evidenceImages
                  .length > 0 && (
                  <div className="claim-review-section">
                    <div className="claim-review-section-title">
                      <FiImage />
                      <span>
                        Evidence Images
                      </span>
                    </div>

                    <div className="claim-review-evidence">
                      {claimModal.evidenceImages.map(
                        (image, index) => (
                          <a
                            href={image.url}
                            target="_blank"
                            rel="noreferrer"
                            key={
                              image.publicId ||
                              `${image.url}-${index}`
                            }
                          >
                            <img
                              src={image.url}
                              alt={`Evidence ${
                                index + 1
                              }`}
                            />
                          </a>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* NOTE */}

              <div className="claim-review-note">
                <FiAlertCircle />

                <p>
                  Only approve the claim if you are
                  satisfied that the person can prove
                  ownership. After approval, you can
                  communicate with them through
                  messaging and arrange the handover.
                </p>
              </div>

              {/* ACTIONS */}

              <div className="claim-review-actions">
                <button
                  type="button"
                  className="claim-review-reject"
                  onClick={() =>
                    handleClaimAction(
                      claimModal._id,
                      "reject",
                    )
                  }
                  disabled={Boolean(
                    claimActionLoading,
                  )}
                >
                  <FiX />

                  {claimActionLoading ===
                  "reject"
                    ? "Rejecting..."
                    : "Reject Claim"}
                </button>

                <button
                  type="button"
                  className="claim-review-approve"
                  onClick={() =>
                    handleClaimAction(
                      claimModal._id,
                      "approve",
                    )
                  }
                  disabled={Boolean(
                    claimActionLoading,
                  )}
                >
                  <FiCheck />

                  {claimActionLoading ===
                  "approve"
                    ? "Approving..."
                    : "Approve Claim"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            DEPARTMENT HANDOVER CONFIRMATION MODAL
        ====================================================== */}

        {confirmationModal && (
          <div
            className="confirmation-modal-overlay"
            onClick={closeHandoverConfirmation}
          >
            <div
              className="confirmation-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                className="confirmation-modal-close"
                onClick={
                  closeHandoverConfirmation
                }
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
                <strong>
                  {confirmationModal.title}
                </strong>{" "}
                to the Lost & Found Department?
              </p>

              <p className="confirmation-modal-note">
                The department will review and confirm
                the handover. The item's location will
                change to the Lost & Found Department
                only after the department confirms
                receipt.
              </p>

              <div className="confirmation-modal-actions">
                <button
                  type="button"
                  className="confirmation-modal-cancel"
                  onClick={
                    closeHandoverConfirmation
                  }
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

        {/* =====================================================
            OWNER HANDOVER CONFIRMATION MODAL
        ====================================================== */}

        {ownerHandoverModal && (
          <div
            className="confirmation-modal-overlay"
            onClick={
              closeOwnerHandoverConfirmation
            }
          >
            <div
              className="confirmation-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                className="confirmation-modal-close"
                onClick={
                  closeOwnerHandoverConfirmation
                }
                disabled={Boolean(
                  ownerHandoverLoading,
                )}
                aria-label="Close"
              >
                <FiX />
              </button>

              <div className="confirmation-modal-icon">
                <FiCheckCircle />
              </div>

              <h2>Confirm handover?</h2>

              <p className="confirmation-modal-message">
                Have you handed this item over to
                the owner?
              </p>

              <p className="confirmation-modal-note">
                Only confirm this after you have
                actually handed the item to the person
                who claimed it.
              </p>

              <div className="confirmation-modal-actions">
                <button
                  type="button"
                  className="confirmation-modal-cancel"
                  onClick={
                    closeOwnerHandoverConfirmation
                  }
                  disabled={Boolean(
                    ownerHandoverLoading,
                  )}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="confirmation-modal-confirm"
                  onClick={handleOwnerHandover}
                  disabled={Boolean(
                    ownerHandoverLoading,
                  )}
                >
                  <FiCheckCircle />

                  {ownerHandoverLoading
                    ? "Confirming..."
                    : "Confirm Handover"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            SUCCESS / ERROR FEEDBACK MODAL
        ====================================================== */}

        {feedbackModal && (
          <div
            className="feedback-modal-overlay"
            onClick={() =>
              setFeedbackModal(null)
            }
          >
            <div
              className={`feedback-modal ${
                feedbackModal.type === "error"
                  ? "feedback-modal-error"
                  : "feedback-modal-success"
              }`}
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                className="feedback-modal-close"
                onClick={() =>
                  setFeedbackModal(null)
                }
                aria-label="Close"
              >
                <FiX />
              </button>

              <div className="feedback-modal-icon">
                {feedbackModal.type ===
                "error" ? (
                  <FiAlertCircle />
                ) : (
                  <FiCheckCircle />
                )}
              </div>

              <h2>{feedbackModal.title}</h2>

              <p>{feedbackModal.message}</p>

              <button
                type="button"
                className="feedback-modal-button"
                onClick={() =>
                  setFeedbackModal(null)
                }
              >
                Okay
              </button>
            </div>
          </div>
        )}

        {/* HEADER */}

        <div className="my-items-header">
          <div>
            <p className="my-items-label">
              ShardaFind
            </p>

            <h1>My Items</h1>

            <p className="my-items-description">
              Manage the lost and found items you
              have reported.
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

            <Link
              to="/report-found"
              className="my-items-report-button primary"
            >
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
                  activeFilter ===
                  filter.value
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleFilterChange(
                    filter.value,
                  )
                }
              >
                {filter.label}

                {filter.value === "all" && (
                  <span>{items.length}</span>
                )}

                {filter.value === "lost" && (
                  <span>
                    {
                      items.filter(
                        (item) =>
                          item.type === "lost",
                      ).length
                    }
                  </span>
                )}

                {filter.value === "found" && (
                  <span>
                    {
                      items.filter(
                        (item) =>
                          item.type === "found",
                      ).length
                    }
                  </span>
                )}
              </button>
            ))}
          </div>

          {!loading &&
            items.length > 0 && (
              <span className="my-items-count">
                {filteredItems.length}{" "}
                {filteredItems.length === 1
                  ? "item"
                  : "items"}
              </span>
            )}
        </div>

        {/* LOADING */}

        {loading && (
          <div className="my-items-grid">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <div
                  className="my-item-skeleton"
                  key={index}
                >
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
              ),
            )}
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="my-items-state">
            <div className="my-items-state-icon error">
              <FiAlertCircle />
            </div>

            <h2>
              Unable to load your items
            </h2>

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

        {!loading &&
          !error &&
          items.length === 0 && (
            <div className="my-items-state">
              <div className="my-items-state-icon">
                <FiPackage />
              </div>

              <h2>No items reported yet</h2>

              <p>
                Items that you report will appear
                here.
              </p>

              <div className="empty-state-actions">
                <Link
                  to="/report-lost"
                  className="empty-state-button secondary"
                >
                  <FiPlus />
                  Report Lost Item
                </Link>

                <Link
                  to="/report-found"
                  className="empty-state-button primary"
                >
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

              <h2>
                No {activeFilter} items
              </h2>

              <p>
                You haven't reported any{" "}
                {activeFilter} items yet.
              </p>

              <button
                type="button"
                className="retry-button"
                onClick={() =>
                  setActiveFilter("all")
                }
              >
                View All Items
              </button>
            </div>
          )}

        {/* ITEMS */}

        {!loading &&
          !error &&
          filteredItems.length > 0 && (
            <div className="my-items-grid">
              {filteredItems.map((item) => {
                const isLost =
                  item.type === "lost";

                const currentUserId =
                  user?.id || user?._id;

                const isFinder =
                  isLost &&
                  item.foundBy?.toString() ===
                    currentUserId?.toString();

                const pendingClaim =
                  getPendingClaimForItem(
                    item._id,
                  );

                const statusClass =
                  statusClasses[item.status] ||
                  "active";

                const statusLabel =
                  statusLabels[item.status] ||
                  "Active";

                return (
                  <article
                    className="my-item-card"
                    key={item._id}
                  >
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
                          isLost
                            ? "lost"
                            : "found"
                        }`}
                      >
                        {isLost
                          ? "Lost"
                          : "Found"}
                      </span>
                    </div>

                    {/* CONTENT */}

                    <div className="my-item-content">
                      <div className="my-item-title-row">
                        <h2>{item.title}</h2>

                        <span
                          className={`my-item-status ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <div className="my-item-details">
                        <div className="my-item-detail">
                          <FiMapPin />

                          <span>
                            {item.location ||
                              "Location unavailable"}
                          </span>
                        </div>

                        <div className="my-item-detail">
                          <FiCalendar />

                          <span>
                            {formatDate(
                              item.itemDate,
                            )}
                          </span>
                        </div>
                      </div>

                      {/* CLAIM ALERT */}

                      {pendingClaim && (
                        <button
                          type="button"
                          className="my-item-claim-button"
                          onClick={() =>
                            openClaimModal(item)
                          }
                        >
                          <span className="my-item-claim-icon">
                            <FiCheckCircle />
                          </span>

                          <span className="my-item-claim-text">
                            <strong>
                              New claim received
                            </strong>

                            <small>
                              Review ownership proof
                            </small>
                          </span>

                          <FiEye />
                        </button>
                      )}

                      <div className="my-item-footer">
                        <span className="my-item-category">
                          {getCategoryLabel(
                            item.category,
                          )}
                        </span>

                        <div className="my-item-actions">
                          <button
                            type="button"
                            className="my-item-view-button"
                            onClick={() =>
                              navigate(
                                `/items/${item._id}`,
                              )
                            }
                          >
                            <FiEye />
                            View
                          </button>

                          {/* OWNER HANDOVER */}

                          {isFinder &&
                            item.status ===
                              "active" &&
                            !item.finderHandedOver && (
                              <button
                                type="button"
                                className="my-item-handover-button"
                                disabled={
                                  ownerHandoverLoading ===
                                  item._id
                                }
                                onClick={() =>
                                  openOwnerHandoverConfirmation(
                                    item._id,
                                  )
                                }
                              >
                                <FiCheckCircle />

                                {ownerHandoverLoading ===
                                item._id
                                  ? "Confirming..."
                                  : "I Handed Over the Item"}
                              </button>
                            )}

                          {isFinder &&
                            item.status ===
                              "active" &&
                            item.finderHandedOver &&
                            !item.returnConfirmedByOwner && (
                              <span className="my-item-handover-status pending">
                                <FiCheckCircle />
                                Handed Over — Waiting
                                for Owner
                              </span>
                            )}

                          {/* DEPARTMENT HANDOVER */}

                          {((item.type === "lost" &&
                            item.foundBy) ||
                            item.type ===
                              "found") &&
                            item.itemLocation ===
                              "with-finder" &&
                            item.status !==
                              "returned" && (
                              <>
                                {!item.handover ? (
                                  <button
                                    type="button"
                                    className="my-item-handover-button"
                                    disabled={
                                      handoverLoading ===
                                      item._id
                                    }
                                    onClick={() =>
                                      openHandoverConfirmation(
                                        item,
                                      )
                                    }
                                  >
                                    <FiCheckCircle />

                                    {handoverLoading ===
                                    item._id
                                      ? "Submitting..."
                                      : "Hand over to L&F Department"}
                                  </button>
                                ) : item.handover
                                    .status ===
                                  "pending" ? (
                                  <span className="my-item-handover-status pending">
                                    <FiAlertCircle />
                                    Waiting for Department
                                  </span>
                                ) : item.handover
                                    .status ===
                                  "rejected" ? (
                                  <div className="my-item-handover-rejected">
                                    <span className="my-item-handover-status rejected">
                                      <FiAlertCircle />
                                      Handover Rejected
                                    </span>

                                    <button
                                      type="button"
                                      className="my-item-handover-button"
                                      disabled={
                                        handoverLoading ===
                                        item._id
                                      }
                                      onClick={() =>
                                        openHandoverConfirmation(
                                          item,
                                        )
                                      }
                                    >
                                      <FiCheckCircle />

                                      {handoverLoading ===
                                      item._id
                                        ? "Submitting..."
                                        : "Try Again"}
                                    </button>
                                  </div>
                                ) : null}
                              </>
                            )}

                          {/* CONFIRMED */}

                          {item.type === "lost" &&
                            item.itemLocation ===
                              "lost-found-department" && (
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