import { useEffect, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiPackage,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../../api/axios";
import AdminHeader from "../../components/AdminHeader/AdminHeader";

import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [claims, setClaims] = useState([]);
  const [handovers, setHandovers] = useState([]);

  const [loadingClaims, setLoadingClaims] = useState(true);
  const [loadingHandovers, setLoadingHandovers] = useState(true);

  // Claim review state
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimReviewNote, setClaimReviewNote] = useState("");
  const [reviewingClaim, setReviewingClaim] = useState(false);

  const fetchClaims = async () => {
    try {
      setLoadingClaims(true);

      const response = await api.get("/admin/claims");

      setClaims(response.data?.claims || []);
    } catch (error) {
      console.error("Fetch admin claims error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to fetch claims."
      );
    } finally {
      setLoadingClaims(false);
    }
  };

  const fetchHandovers = async () => {
    try {
      setLoadingHandovers(true);

      const response = await api.get("/admin/handovers");

      setHandovers(response.data?.handovers || []);
    } catch (error) {
      console.error("Fetch admin handovers error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to fetch handovers."
      );
    } finally {
      setLoadingHandovers(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    fetchHandovers();
  }, []);

  const pendingClaims = claims.filter(
    (claim) => claim.status === "pending"
  );

  const pendingHandovers = handovers.filter(
    (handover) => handover.status === "pending"
  );

  // =========================
  // Claim Review
  // =========================

  const openClaimReview = (claim) => {
    setSelectedClaim(claim);
    setClaimReviewNote("");
  };

  const closeClaimReview = () => {
    if (reviewingClaim) return;

    setSelectedClaim(null);
    setClaimReviewNote("");
  };

  const handleClaimReview = async (status) => {
    if (!selectedClaim) return;

    try {
      setReviewingClaim(true);

      await api.patch(
        `/admin/claims/${selectedClaim._id}`,
        {
          status,
          reviewNote: claimReviewNote.trim(),
        }
      );

      toast.success(
        status === "approved"
          ? "Claim approved successfully."
          : "Claim rejected successfully."
      );

      setSelectedClaim(null);
      setClaimReviewNote("");

      await fetchClaims();
    } catch (error) {
      console.error("Review claim error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to review claim."
      );
    } finally {
      setReviewingClaim(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <AdminHeader />

      <main className="admin-dashboard-main">
        <div className="admin-dashboard-container">

          {/* =========================
              Page Header
          ========================= */}

          <section className="admin-dashboard-heading">
            <div>
              <p className="admin-dashboard-eyebrow">
                Administration
              </p>

              <h1>Admin Dashboard</h1>

              <p>
                Manage claims and item handovers for
                ShardaFind.
              </p>
            </div>
          </section>

          {/* =========================
              Overview Cards
          ========================= */}

          <section className="admin-dashboard-stats">

            <div className="admin-stat-card">
              <div className="admin-stat-icon pending">
                <FiClock />
              </div>

              <div className="admin-stat-content">
                <span>Pending Claims</span>

                <strong>
                  {pendingClaims.length}
                </strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon handover">
                <FiPackage />
              </div>

              <div className="admin-stat-content">
                <span>Pending Handovers</span>

                <strong>
                  {pendingHandovers.length}
                </strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon total">
                <FiAlertCircle />
              </div>

              <div className="admin-stat-content">
                <span>Total Claims</span>

                <strong>
                  {claims.length}
                </strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon resolved">
                <FiCheckCircle />
              </div>

              <div className="admin-stat-content">
                <span>Total Handovers</span>

                <strong>
                  {handovers.length}
                </strong>
              </div>
            </div>

          </section>

          {/* =========================
              Claims Section
          ========================= */}

          <section className="admin-dashboard-section">

            <div className="admin-section-header">
              <div>
                <h2>Claims</h2>

                <p>
                  Review ownership claims submitted by
                  students.
                </p>
              </div>

              <span className="admin-section-count">
                {pendingClaims.length} pending
              </span>
            </div>

            <div className="admin-table-wrapper">

              {loadingClaims ? (
                <div className="admin-table-message">
                  Loading claims...
                </div>
              ) : pendingClaims.length === 0 ? (
                <div className="admin-table-message">
                  <FiCheckCircle />

                  <span>
                    No pending claims.
                  </span>
                </div>
              ) : (
                <div className="admin-table">

                  <div className="admin-table-header">
                    <span>Item</span>
                    <span>Claimant</span>
                    <span>Category</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>

                  {pendingClaims.map((claim) => (
                    <div
                      className="admin-table-row"
                      key={claim._id}
                    >
                      <div>
                        <strong>
                          {claim.item?.title ||
                            "Unknown item"}
                        </strong>

                        <small>
                          {claim.item?.type ||
                            "Unknown"}
                        </small>
                      </div>

                      <div>
                        <strong>
                          {claim.claimant?.name ||
                            "Unknown user"}
                        </strong>

                        <small>
                          {claim.claimant?.email ||
                            "No email"}
                        </small>
                      </div>

                      <span>
                        {claim.item?.category ||
                          "N/A"}
                      </span>

                      <span className="admin-status pending">
                        Pending
                      </span>

                      <button
                        type="button"
                        className="admin-review-button"
                        onClick={() =>
                          openClaimReview(claim)
                        }
                      >
                        Review
                      </button>
                    </div>
                  ))}

                </div>
              )}

            </div>
          </section>

          {/* =========================
              Handovers Section
          ========================= */}

          <section className="admin-dashboard-section">

            <div className="admin-section-header">
              <div>
                <h2>Handovers</h2>

                <p>
                  Confirm items submitted to the Lost &
                  Found Department.
                </p>
              </div>

              <span className="admin-section-count">
                {pendingHandovers.length} pending
              </span>
            </div>

            <div className="admin-table-wrapper">

              {loadingHandovers ? (
                <div className="admin-table-message">
                  Loading handovers...
                </div>
              ) : pendingHandovers.length === 0 ? (
                <div className="admin-table-message">
                  <FiCheckCircle />

                  <span>
                    No pending handovers.
                  </span>
                </div>
              ) : (
                <div className="admin-table">

                  <div className="admin-table-header">
                    <span>Item</span>
                    <span>Submitted By</span>
                    <span>Type</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>

                  {pendingHandovers.map((handover) => (
                    <div
                      className="admin-table-row"
                      key={handover._id}
                    >
                      <div>
                        <strong>
                          {handover.item?.title ||
                            "Unknown item"}
                        </strong>

                        <small>
                          {handover.item?.category ||
                            "Unknown category"}
                        </small>
                      </div>

                      <div>
                        <strong>
                          {handover.submittedBy?.name ||
                            "Unknown user"}
                        </strong>

                        <small>
                          {handover.submittedBy?.email ||
                            "No email"}
                        </small>
                      </div>

                      <span>
                        {handover.item?.type ||
                          "N/A"}
                      </span>

                      <span className="admin-status pending">
                        Pending
                      </span>

                      <button
                        type="button"
                        className="admin-review-button"
                      >
                        Review
                      </button>
                    </div>
                  ))}

                </div>
              )}

            </div>
          </section>

        </div>
      </main>

      {/* =========================
          Claim Review Modal
      ========================= */}

      {selectedClaim && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeClaimReview();
            }
          }}
        >
          <div className="admin-modal">

            {/* Modal Header */}

            <div className="admin-modal-header">
              <div>
                <p className="admin-modal-eyebrow">
                  Claim Review
                </p>

                <h2>
                  Review ownership claim
                </h2>

                <p>
                  Verify the information and evidence
                  provided by the claimant.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={closeClaimReview}
                disabled={reviewingClaim}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Item Information */}

            <div className="admin-modal-section">

              <div className="admin-modal-section-heading">
                <h3>Item Information</h3>
              </div>

              <div className="admin-modal-info-grid">

                <div className="admin-modal-info-item">
                  <span>Item</span>

                  <strong>
                    {selectedClaim.item?.title ||
                      "Unknown item"}
                  </strong>
                </div>

                <div className="admin-modal-info-item">
                  <span>Category</span>

                  <strong>
                    {selectedClaim.item?.category ||
                      "N/A"}
                  </strong>
                </div>

                <div className="admin-modal-info-item">
                  <span>Type</span>

                  <strong>
                    {selectedClaim.item?.type ||
                      "N/A"}
                  </strong>
                </div>

                <div className="admin-modal-info-item">
                  <span>Location</span>

                  <strong>
                    {selectedClaim.item?.location ||
                      "N/A"}
                  </strong>
                </div>

              </div>
            </div>

            {/* Claimant */}

            <div className="admin-modal-section">

              <div className="admin-modal-section-heading">
                <h3>Claimant</h3>
              </div>

              <div className="admin-modal-info-grid">

                <div className="admin-modal-info-item">
                  <span>Name</span>

                  <strong>
                    {selectedClaim.claimant?.name ||
                      "Unknown"}
                  </strong>
                </div>

                <div className="admin-modal-info-item">
                  <span>Email</span>

                  <strong>
                    {selectedClaim.claimant?.email ||
                      "No email"}
                  </strong>
                </div>

              </div>
            </div>

            {/* Ownership Proof */}

            <div className="admin-modal-section">

              <div className="admin-modal-section-heading">
                <h3>Ownership Proof</h3>
              </div>

              <div className="admin-proof-box">
                {selectedClaim.ownershipProof ||
                  "No ownership proof provided."}
              </div>

            </div>

            {/* Evidence Images */}

            {selectedClaim.evidenceImages?.length > 0 && (
              <div className="admin-modal-section">

                <div className="admin-modal-section-heading">
                  <h3>Evidence Images</h3>
                </div>

                <div className="admin-evidence-grid">

                  {selectedClaim.evidenceImages.map(
                    (image, index) => (
                      <a
                        key={index}
                        href={image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-evidence-image"
                      >
                        <img
                          src={image}
                          alt={`Evidence ${index + 1}`}
                        />
                      </a>
                    )
                  )}

                </div>
              </div>
            )}

            {/* Review Note */}

            <div className="admin-modal-section">

              <div className="admin-modal-section-heading">
                <h3>Review Note</h3>

                <span>Optional</span>
              </div>

              <textarea
                value={claimReviewNote}
                onChange={(event) =>
                  setClaimReviewNote(event.target.value)
                }
                placeholder="Add a note about your decision..."
                rows={4}
                disabled={reviewingClaim}
                className="admin-review-note"
              />

            </div>

            {/* Actions */}

            <div className="admin-modal-actions">

              <button
                type="button"
                className="admin-modal-reject"
                onClick={() =>
                  handleClaimReview("rejected")
                }
                disabled={reviewingClaim}
              >
                {reviewingClaim
                  ? "Processing..."
                  : "Reject Claim"}
              </button>

              <button
                type="button"
                className="admin-modal-approve"
                onClick={() =>
                  handleClaimReview("approved")
                }
                disabled={reviewingClaim}
              >
                {reviewingClaim
                  ? "Processing..."
                  : "Approve Claim"}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
