import { useEffect, useMemo, useState } from "react";

import {
  FiAlertCircle,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiExternalLink,
  FiPackage,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

import toast from "react-hot-toast";

import api from "../../api/axios";

import AdminHeader from "../../components/AdminHeader/AdminHeader";

import { io } from "socket.io-client";

import "./AdminDashboard.css";

const SOCKET_URL = "http://localhost:5000";

/* =========================
   Helpers
========================= */

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

const formatCategory = (category) => {
  if (!category) {
    return "Other";
  }

  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatItemType = (type) => {
  if (!type) {
    return "Unknown";
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
};

const formatItemLocation = (location) => {
  if (location === "with-finder") {
    return "With Finder";
  }

  if (location === "lost-found-department") {
    return "Lost & Found Department";
  }

  return "Location unavailable";
};

const getImageUrl = (image) => {
  if (typeof image === "string") {
    return image;
  }

  if (image?.url) {
    return image.url;
  }

  return "";
};

/* =========================
   Component
========================= */

const AdminDashboard = () => {
  /* =========================
     Dashboard State
  ========================= */

  const [claims, setClaims] = useState([]);
  const [handovers, setHandovers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================
     Claim Review State
  ========================= */

  const [selectedClaim, setSelectedClaim] = useState(null);

  const [reviewNote, setReviewNote] = useState("");

  const [reviewNoteError, setReviewNoteError] = useState("");

  const [reviewingClaim, setReviewingClaim] = useState(false);

  /* =========================
     Handover Review State
  ========================= */

  const [selectedHandover, setSelectedHandover] = useState(null);

  const [handoverReviewNote, setHandoverReviewNote] = useState("");

  const [handoverReviewNoteError, setHandoverReviewNoteError] = useState("");

  const [reviewingHandover, setReviewingHandover] = useState(false);

  /* =========================
     Fetch Dashboard Data
  ========================= */

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [claimsResponse, handoversResponse] = await Promise.all([
        api.get("/admin/claims"),
        api.get("/admin/handovers"),
      ]);

      setClaims(claimsResponse.data?.claims || claimsResponse.data?.data || []);

      setHandovers(
        handoversResponse.data?.handovers || handoversResponse.data?.data || [],
      );
    } catch (error) {
      console.error("Unable to load admin dashboard:", error);

      setError(
        error.response?.data?.message || "Unable to load the admin dashboard.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchHandovers = async () => {
    try {
      const response = await api.get("/admin/handovers");

      setHandovers(response.data?.handovers || response.data?.data || []);
    } catch (error) {
      console.error("Unable to refresh handovers:", error);
    }
  };

  // initial fetch of dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleAdminNotification = (event) => {
      const notification = event.detail;

      if (notification?.type === "handover-submitted") {
        fetchHandovers();
      }
    };

    window.addEventListener("admin-new-notification", handleAdminNotification);

    return () => {
      window.removeEventListener(
        "admin-new-notification",
        handleAdminNotification,
      );
    };
  }, []);

  // real time handover notifications
  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    });

    socket.on("connect", () => {
      console.log("Admin dashboard socket connected:", socket.id);
    });

    socket.on("new-notification", (data) => {
      const notification = data?.notification;

      if (notification?.type === "handover-submitted") {
        fetchHandovers();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Admin dashboard socket error:", error.message);
    });

    return () => {
      socket.off("new-notification");
      socket.disconnect();
    };
  }, []);

  /* =========================
     Filter Pending Data
  ========================= */

  const pendingClaims = useMemo(() => {
    return claims.filter((claim) => claim.status === "pending");
  }, [claims]);

  const pendingHandovers = useMemo(() => {
    return handovers.filter((handover) => handover.status === "pending");
  }, [handovers]);

  /* =========================
     Summary Statistics
  ========================= */

  const statistics = useMemo(() => {
    return {
      totalClaims: claims.length,

      pendingClaims: pendingClaims.length,

      pendingHandovers: pendingHandovers.length,
    };
  }, [claims, pendingClaims, pendingHandovers]);

  /* =========================
     Claim Review
  ========================= */

  const handleOpenClaimReview = (claim) => {
    setSelectedClaim(claim);

    setReviewNote("");

    setReviewNoteError("");
  };

  const handleCloseClaimReview = () => {
    if (reviewingClaim) {
      return;
    }

    setSelectedClaim(null);

    setReviewNote("");

    setReviewNoteError("");
  };

  const handleReviewClaim = async (decision) => {
    if (!selectedClaim) {
      return;
    }

    if (decision === "rejected" && !reviewNote.trim()) {
      setReviewNoteError("Please provide a reason for rejecting this claim.");

      return;
    }

    setReviewNoteError("");

    try {
      setReviewingClaim(true);

      await api.patch(`/admin/claims/${selectedClaim._id}`, {
        decision,
        reviewNote: reviewNote.trim(),
      });

      toast.success(
        decision === "approved"
          ? "Claim approved successfully."
          : "Claim rejected successfully.",
      );

      setSelectedClaim(null);

      setReviewNote("");

      setReviewNoteError("");

      await fetchDashboardData();
    } catch (error) {
      console.error("Unable to review claim:", error);

      const message =
        error.response?.data?.message || "Unable to review the claim.";

      toast.error(message);
    } finally {
      setReviewingClaim(false);
    }
  };

  /* =========================
     Handover Review
  ========================= */

  const handleOpenHandoverReview = (handover) => {
    setSelectedHandover(handover);

    setHandoverReviewNote("");

    setHandoverReviewNoteError("");
  };

  const handleCloseHandoverReview = () => {
    if (reviewingHandover) {
      return;
    }

    setSelectedHandover(null);

    setHandoverReviewNote("");

    setHandoverReviewNoteError("");
  };

  const handleReviewHandover = async (status) => {
    if (!selectedHandover) {
      return;
    }

    if (status === "rejected" && !handoverReviewNote.trim()) {
      setHandoverReviewNoteError(
        "Please provide a reason for rejecting this handover.",
      );

      return;
    }

    setHandoverReviewNoteError("");

    try {
      setReviewingHandover(true);

      await api.patch(`/admin/handovers/${selectedHandover._id}`, {
        status,
        note: handoverReviewNote.trim(),
      });

      toast.success(
        status === "confirmed"
          ? "Handover confirmed successfully."
          : "Handover rejected successfully.",
      );

      setSelectedHandover(null);

      setHandoverReviewNote("");

      setHandoverReviewNoteError("");

      await fetchDashboardData();
    } catch (error) {
      console.error("Unable to review handover:", error);

      const message =
        error.response?.data?.message || "Unable to review the handover.";

      toast.error(message);
    } finally {
      setReviewingHandover(false);
    }
  };

  /* =========================
     Loading State
  ========================= */

  if (loading) {
    return (
      <div className="admin-dashboard-page">
        <AdminHeader />

        <main className="admin-dashboard-container">
          <div className="admin-dashboard-loading">
            <FiRefreshCw className="admin-loading-icon" />

            <p>Loading admin dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  /* =========================
     Dashboard
  ========================= */

  return (
    <div className="admin-dashboard-page">
      <AdminHeader />

      <main className="admin-dashboard-container">
        {/* =========================
            Dashboard Heading
        ========================= */}

        <div className="admin-dashboard-heading">
          <div>
            <h1>Admin Dashboard</h1>

            <p>Review and manage claims and department handover requests.</p>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={fetchDashboardData}
          >
            <FiRefreshCw />

            <span>Refresh</span>
          </button>
        </div>

        {/* =========================
            Error
        ========================= */}

        {error && (
          <div className="admin-dashboard-error" role="alert">
            <FiAlertCircle />

            <span>{error}</span>
          </div>
        )}

        {/* =========================
            Summary Cards
        ========================= */}

        <div className="admin-summary-grid">
          {/* Total Claims */}

          <div className="admin-summary-card">
            <div className="admin-summary-icon">
              <FiClipboard />
            </div>

            <div className="admin-summary-content">
              <span className="admin-summary-label">Total Claims</span>

              <strong className="admin-summary-value">
                {statistics.totalClaims}
              </strong>
            </div>
          </div>

          {/* Pending Claims */}

          <div className="admin-summary-card">
            <div className="admin-summary-icon admin-summary-icon-warning">
              <FiClock />
            </div>

            <div className="admin-summary-content">
              <span className="admin-summary-label">Pending Claims</span>

              <strong className="admin-summary-value">
                {statistics.pendingClaims}
              </strong>
            </div>
          </div>

          {/* Pending Handovers */}

          <div className="admin-summary-card">
            <div className="admin-summary-icon admin-summary-icon-package">
              <FiPackage />
            </div>

            <div className="admin-summary-content">
              <span className="admin-summary-label">Pending Handovers</span>

              <strong className="admin-summary-value">
                {statistics.pendingHandovers}
              </strong>
            </div>
          </div>
        </div>

        {/* =========================
            Pending Claims
        ========================= */}

        <section className="admin-dashboard-section">
          <div className="admin-section-header">
            <div>
              <h2>Pending Claims</h2>

              <p>Claims waiting for department review.</p>
            </div>

            <span className="admin-section-count">
              {statistics.pendingClaims}
            </span>
          </div>

          {pendingClaims.length === 0 ? (
            <div className="admin-empty-state">
              <FiCheckCircle />

              <p>No pending claims.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>

                    <th>Claimant</th>

                    <th>Category</th>

                    <th>Submitted</th>

                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingClaims.map((claim) => (
                    <tr key={claim._id}>
                      <td>
                        <div className="admin-table-item">
                          <strong>
                            {claim.item?.title || "Item unavailable"}
                          </strong>

                          <span>{formatItemType(claim.item?.type)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="admin-table-user">
                          <strong>{claim.claimant?.name || "Student"}</strong>

                          <span>
                            {claim.claimant?.email || "Email unavailable"}
                          </span>
                        </div>
                      </td>

                      <td>{formatCategory(claim.item?.category)}</td>

                      <td>{formatDate(claim.createdAt)}</td>

                      <td>
                        <button
                          type="button"
                          className="admin-table-action"
                          onClick={() => handleOpenClaimReview(claim)}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* =========================
            Pending Handovers
        ========================= */}

        <section className="admin-dashboard-section">
          <div className="admin-section-header">
            <div>
              <h2>Pending Handovers</h2>

              <p>
                Requests to hand items over to the Lost &amp; Found Department.
              </p>
            </div>

            <span className="admin-section-count">
              {statistics.pendingHandovers}
            </span>
          </div>

          {pendingHandovers.length === 0 ? (
            <div className="admin-empty-state">
              <FiCheckCircle />

              <p>No pending handovers.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>

                    <th>Submitted By</th>

                    <th>Current Location</th>

                    <th>Submitted</th>

                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingHandovers.map((handover) => (
                    <tr key={handover._id}>
                      <td>
                        <div className="admin-table-item">
                          <strong>
                            {handover.item?.title || "Item unavailable"}
                          </strong>

                          <span>{formatItemType(handover.item?.type)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="admin-table-user">
                          <strong>
                            {handover.submittedBy?.name || "Student"}
                          </strong>

                          <span>
                            {handover.submittedBy?.email || "Email unavailable"}
                          </span>
                        </div>
                      </td>

                      <td>{formatItemLocation(handover.item?.itemLocation)}</td>

                      <td>{formatDate(handover.createdAt)}</td>

                      <td>
                        <button
                          type="button"
                          className="admin-table-action"
                          onClick={() => handleOpenHandoverReview(handover)}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ==================================================
          CLAIM REVIEW MODAL
      ================================================== */}

      {selectedClaim && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseClaimReview();
            }
          }}
        >
          <div
            className="admin-claim-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="claim-review-title"
          >
            {/* Modal Header */}

            <div className="admin-modal-header">
              <div>
                <h2 id="claim-review-title">Claim Review</h2>

                <p>Review the ownership claim before making a decision.</p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={handleCloseClaimReview}
                disabled={reviewingClaim}
                aria-label="Close claim review"
              >
                <FiX />
              </button>
            </div>

            {/* Claim Details */}

            <div className="admin-claim-details">
              <div className="admin-claim-detail">
                <span className="admin-detail-label">Item</span>

                <strong>
                  {selectedClaim.item?.title || "Item unavailable"}
                </strong>
              </div>

              <div className="admin-claim-detail">
                <span className="admin-detail-label">Claimant</span>

                <strong>{selectedClaim.claimant?.name || "Student"}</strong>
              </div>

              <div className="admin-claim-detail">
                <span className="admin-detail-label">Category</span>

                <strong>{formatCategory(selectedClaim.item?.category)}</strong>
              </div>

              <div className="admin-claim-detail">
                <span className="admin-detail-label">Submitted</span>

                <strong>{formatDate(selectedClaim.createdAt)}</strong>
              </div>
            </div>

            {/* Claimant Information */}

            <div className="admin-review-section">
              <div className="admin-review-section-heading">
                <h3>Claimant Information</h3>
              </div>

              <div className="admin-table-user">
                <strong>{selectedClaim.claimant?.name || "Student"}</strong>

                <span>
                  {selectedClaim.claimant?.email || "Email unavailable"}
                </span>
              </div>
            </div>

            {/* Ownership Proof */}

            <div className="admin-review-section">
              <div className="admin-review-section-heading">
                <h3>Ownership Proof</h3>
              </div>

              <div className="admin-ownership-proof">
                {selectedClaim.ownershipProof || "No ownership proof provided."}
              </div>
            </div>

            {/* Evidence Images */}

            <div className="admin-review-section">
              <div className="admin-review-section-heading">
                <h3>Evidence Images</h3>

                {Array.isArray(selectedClaim.evidenceImages) &&
                  selectedClaim.evidenceImages.length > 0 && (
                    <span>{selectedClaim.evidenceImages.length}</span>
                  )}
              </div>

              {Array.isArray(selectedClaim.evidenceImages) &&
              selectedClaim.evidenceImages.length > 0 ? (
                <div className="admin-evidence-grid">
                  {selectedClaim.evidenceImages.map((image, index) => {
                    const imageUrl = getImageUrl(image);

                    if (!imageUrl) {
                      return null;
                    }

                    return (
                      <a
                        key={`${imageUrl}-${index}`}
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-evidence-image"
                      >
                        <img src={imageUrl} alt={`Evidence ${index + 1}`} />

                        <span>
                          <FiExternalLink />
                        </span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="admin-no-evidence">
                  No evidence images were provided.
                </div>
              )}
            </div>

            {/* Review Note */}

            <div className="admin-review-section">
              <label
                htmlFor="claim-review-note"
                className="admin-review-note-label"
              >
                <span>Review Note</span>

                <span className="admin-required-note">
                  Required when rejecting
                </span>
              </label>

              <textarea
                id="claim-review-note"
                value={reviewNote}
                onChange={(event) => {
                  setReviewNote(event.target.value);

                  if (event.target.value.trim()) {
                    setReviewNoteError("");
                  }
                }}
                placeholder="Add a note about your decision..."
                rows={4}
                disabled={reviewingClaim}
                aria-describedby="claim-review-note-help"
                aria-invalid={Boolean(reviewNoteError)}
              />

              <p id="claim-review-note-help" className="admin-review-note-help">
                A review note is required when rejecting a claim.
              </p>

              {reviewNoteError && (
                <p className="admin-review-note-error" role="alert">
                  {reviewNoteError}
                </p>
              )}
            </div>

            {/* Modal Actions */}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                onClick={handleCloseClaimReview}
                disabled={reviewingClaim}
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-modal-reject"
                onClick={() => handleReviewClaim("rejected")}
                disabled={reviewingClaim}
              >
                {reviewingClaim ? "Processing..." : "Reject Claim"}
              </button>

              <button
                type="button"
                className="admin-modal-approve"
                onClick={() => handleReviewClaim("approved")}
                disabled={reviewingClaim}
              >
                {reviewingClaim ? "Processing..." : "Approve Claim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          HANDOVER REVIEW MODAL
      ================================================== */}

      {selectedHandover && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseHandoverReview();
            }
          }}
        >
          <div
            className="admin-claim-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="handover-review-title"
          >
            {/* Modal Header */}

            <div className="admin-modal-header">
              <div>
                <h2 id="handover-review-title">Handover Review</h2>

                <p>
                  Review the request to hand this item over to the Lost &amp;
                  Found Department.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={handleCloseHandoverReview}
                disabled={reviewingHandover}
                aria-label="Close handover review"
              >
                <FiX />
              </button>
            </div>

            {/* Handover Details */}

            <div className="admin-claim-details">
              <div className="admin-claim-detail">
                <span className="admin-detail-label">Item</span>

                <strong>
                  {selectedHandover.item?.title || "Item unavailable"}
                </strong>
              </div>

              <div className="admin-claim-detail">
                <span className="admin-detail-label">Type</span>

                <strong>{formatItemType(selectedHandover.item?.type)}</strong>
              </div>

              <div className="admin-claim-detail">
                <span className="admin-detail-label">Category</span>

                <strong>
                  {formatCategory(selectedHandover.item?.category)}
                </strong>
              </div>

              <div className="admin-claim-detail">
                <span className="admin-detail-label">Submitted</span>

                <strong>{formatDate(selectedHandover.createdAt)}</strong>
              </div>
            </div>

            {/* Submitted By */}

            <div className="admin-review-section">
              <div className="admin-review-section-heading">
                <h3>Submitted By</h3>
              </div>

              <div className="admin-review-person">
                <div className="admin-review-person-avatar">
                  {selectedHandover.submittedBy?.name
                    ?.charAt(0)
                    .toUpperCase() || "S"}
                </div>

                <div className="admin-review-person-info">
                  <strong>
                    {selectedHandover.submittedBy?.name || "Student"}
                  </strong>

                  <span>
                    {selectedHandover.submittedBy?.email || "Email unavailable"}
                  </span>
                </div>
              </div>
            </div>

            {/* Item Information */}

            <div className="admin-review-section">
              <div className="admin-review-section-heading">
                <h3>Item Information</h3>
              </div>

              <div className="admin-handover-info">
                <div className="admin-handover-info-item">
                  <span className="admin-detail-label">Current Location</span>

                  <strong>
                    {formatItemLocation(selectedHandover.item?.itemLocation)}
                  </strong>
                </div>

                <div className="admin-handover-info-item">
                  <span className="admin-detail-label">Item Location</span>

                  <strong>
                    {selectedHandover.item?.location || "Location unavailable"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Item Image */}

            {Array.isArray(selectedHandover.item?.images) &&
              selectedHandover.item.images.length > 0 && (
                <div className="admin-review-section">
                  <div className="admin-review-section-heading">
                    <h3>Item Image</h3>
                  </div>

                  <div className="admin-evidence-grid">
                    {selectedHandover.item.images
                      .slice(0, 4)
                      .map((image, index) => {
                        const imageUrl = getImageUrl(image);

                        if (!imageUrl) {
                          return null;
                        }

                        return (
                          <a
                            key={`${imageUrl}-${index}`}
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-evidence-image"
                          >
                            <img src={imageUrl} alt={`Item ${index + 1}`} />

                            <span>
                              <FiExternalLink />
                            </span>
                          </a>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Review Note */}

            <div className="admin-review-section">
              <label
                htmlFor="handover-review-note"
                className="admin-review-note-label"
              >
                <span>Review Note</span>

                <span className="admin-required-note">
                  Required when rejecting
                </span>
              </label>

              <textarea
                id="handover-review-note"
                value={handoverReviewNote}
                onChange={(event) => {
                  setHandoverReviewNote(event.target.value);

                  if (event.target.value.trim()) {
                    setHandoverReviewNoteError("");
                  }
                }}
                placeholder="Add a note about your decision..."
                rows={4}
                disabled={reviewingHandover}
                aria-describedby="handover-review-note-help"
                aria-invalid={Boolean(handoverReviewNoteError)}
              />

              <p
                id="handover-review-note-help"
                className="admin-review-note-help"
              >
                A review note is required when rejecting a handover.
              </p>

              {handoverReviewNoteError && (
                <p className="admin-review-note-error" role="alert">
                  {handoverReviewNoteError}
                </p>
              )}
            </div>

            {/* Modal Actions */}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                onClick={handleCloseHandoverReview}
                disabled={reviewingHandover}
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-modal-reject"
                onClick={() => handleReviewHandover("rejected")}
                disabled={reviewingHandover}
              >
                {reviewingHandover ? "Processing..." : "Reject Handover"}
              </button>

              <button
                type="button"
                className="admin-modal-approve"
                onClick={() => handleReviewHandover("confirmed")}
                disabled={reviewingHandover}
              >
                {reviewingHandover ? "Processing..." : "Confirm Handover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
