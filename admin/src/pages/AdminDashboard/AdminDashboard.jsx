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

import "./AdminDashboard.css";


const AdminDashboard = () => {
  const [claims, setClaims] = useState([]);
  const [handovers, setHandovers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewNoteError, setReviewNoteError] = useState("");
  const [reviewingClaim, setReviewingClaim] = useState(false);


  /* =========================
     Fetch Dashboard Data
  ========================= */

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        claimsResponse,
        handoversResponse,
      ] = await Promise.all([
        api.get("/admin/claims"),
        api.get("/admin/handovers"),
      ]);

      const claimsData =
        claimsResponse.data?.claims ||
        claimsResponse.data?.data ||
        [];

      const handoversData =
        handoversResponse.data?.handovers ||
        handoversResponse.data?.data ||
        [];

      setClaims(
        Array.isArray(claimsData)
          ? claimsData
          : []
      );

      setHandovers(
        Array.isArray(handoversData)
          ? handoversData
          : []
      );

    } catch (error) {
      console.error(
        "Unable to load admin dashboard:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Unable to load dashboard data.";

      setError(message);

      toast.error(message);

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchDashboardData();
  }, []);


  /* =========================
     Summary Data
  ========================= */

  const pendingClaims = useMemo(() => {
    return claims.filter(
      (claim) =>
        claim.status === "pending"
    );
  }, [claims]);


  const pendingHandovers = useMemo(() => {
    return handovers.filter(
      (handover) =>
        handover.status === "pending"
    );
  }, [handovers]);


  /* =========================
     Helpers
  ========================= */

  const getItemTitle = (item) => {
    return item?.title || "Unknown item";
  };


  const getUserName = (user) => {
    return user?.name || "Unknown user";
  };


  const getCategory = (item) => {
    if (!item?.category) {
      return "—";
    }

    return (
      item.category.charAt(0).toUpperCase() +
      item.category.slice(1)
    );
  };


  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };


  const getStatusClass = (status) => {
    return `admin-status admin-status-${status}`;
  };


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

    /* Rejection requires a note */

    if (
      decision === "rejected" &&
      !reviewNote.trim()
    ) {
      setReviewNoteError(
        "Please provide a reason for rejecting this claim."
      );

      return;
    }

    setReviewNoteError("");

    try {
      setReviewingClaim(true);

      await api.patch(
        `/admin/claims/${selectedClaim._id}`,
        {
          decision,
          reviewNote: reviewNote.trim(),
        }
      );

      toast.success(
        decision === "approved"
          ? "Claim approved successfully."
          : "Claim rejected successfully."
      );

      setSelectedClaim(null);
      setReviewNote("");
      setReviewNoteError("");

      await fetchDashboardData();

    } catch (error) {
      console.error(
        "Unable to review claim:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Unable to review the claim.";

      toast.error(message);

    } finally {
      setReviewingClaim(false);
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

            <p>
              Loading dashboard...
            </p>

          </div>

        </main>

      </div>
    );
  }


  return (
    <div className="admin-dashboard-page">

      <AdminHeader />


      <main className="admin-dashboard-container">

        {/* =========================
            Dashboard Heading
        ========================= */}

        <section className="admin-dashboard-heading">

          <div>

            <h1>
              Dashboard
            </h1>

            <p>
              Manage claims and department
              handovers.
            </p>

          </div>


          <button
            type="button"
            className="admin-refresh-button"
            onClick={fetchDashboardData}
          >
            <FiRefreshCw />

            <span>
              Refresh
            </span>
          </button>

        </section>


        {/* =========================
            Error
        ========================= */}

        {error && (
          <div
            className="admin-dashboard-error"
            role="alert"
          >
            <FiAlertCircle />

            <span>
              {error}
            </span>
          </div>
        )}


        {/* =========================
            Summary Cards
        ========================= */}

        <section className="admin-summary-grid">

          <div className="admin-summary-card">

            <div className="admin-summary-icon">
              <FiClipboard />
            </div>

            <div className="admin-summary-content">

              <span className="admin-summary-label">
                Total Claims
              </span>

              <strong className="admin-summary-value">
                {claims.length}
              </strong>

            </div>

          </div>


          <div className="admin-summary-card">

            <div className="admin-summary-icon admin-summary-icon-warning">
              <FiClock />
            </div>

            <div className="admin-summary-content">

              <span className="admin-summary-label">
                Pending Claims
              </span>

              <strong className="admin-summary-value">
                {pendingClaims.length}
              </strong>

            </div>

          </div>


          <div className="admin-summary-card">

            <div className="admin-summary-icon admin-summary-icon-package">
              <FiPackage />
            </div>

            <div className="admin-summary-content">

              <span className="admin-summary-label">
                Pending Handovers
              </span>

              <strong className="admin-summary-value">
                {pendingHandovers.length}
              </strong>

            </div>

          </div>

        </section>


        {/* =========================
            Pending Claims
        ========================= */}

        <section className="admin-dashboard-section">

          <div className="admin-section-header">

            <div>

              <h2>
                Pending Claims
              </h2>

              <p>
                Review ownership claims submitted
                by students.
              </p>

            </div>

            <span className="admin-section-count">
              {pendingClaims.length}
            </span>

          </div>


          <div className="admin-table-wrapper">

            {pendingClaims.length === 0 ? (

              <div className="admin-empty-state">

                <FiCheckCircle />

                <p>
                  No pending claims.
                </p>

              </div>

            ) : (

              <table className="admin-table">

                <thead>

                  <tr>

                    <th>
                      Item
                    </th>

                    <th>
                      Student
                    </th>

                    <th>
                      Category
                    </th>

                    <th>
                      Submitted
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {pendingClaims.map(
                    (claim) => (

                      <tr key={claim._id}>

                        <td>

                          <div className="admin-table-item">

                            <strong>
                              {getItemTitle(
                                claim.item
                              )}
                            </strong>

                            <span>
                              {claim.item?.type
                                ? claim.item.type
                                    .charAt(0)
                                    .toUpperCase() +
                                  claim.item.type.slice(1)
                                : "—"}
                            </span>

                          </div>

                        </td>


                        <td>

                          <div className="admin-table-user">

                            <strong>
                              {getUserName(
                                claim.claimant
                              )}
                            </strong>

                            <span>
                              {claim.claimant?.email ||
                                "—"}
                            </span>

                          </div>

                        </td>


                        <td>
                          {getCategory(
                            claim.item
                          )}
                        </td>


                        <td>
                          {formatDate(
                            claim.createdAt
                          )}
                        </td>


                        <td>

                          <span
                            className={getStatusClass(
                              claim.status
                            )}
                          >
                            {claim.status
                              .charAt(0)
                              .toUpperCase() +
                              claim.status.slice(1)}
                          </span>

                        </td>


                        <td>

                          <button
                            type="button"
                            className="admin-table-action"
                            onClick={() =>
                              handleOpenClaimReview(
                                claim
                              )
                            }
                          >
                            Review
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            )}

          </div>

        </section>


        {/* =========================
            Pending Handovers
        ========================= */}

        <section className="admin-dashboard-section">

          <div className="admin-section-header">

            <div>

              <h2>
                Pending Handovers
              </h2>

              <p>
                Review requests to hand items
                over to the department.
              </p>

            </div>

            <span className="admin-section-count">
              {pendingHandovers.length}
            </span>

          </div>


          <div className="admin-table-wrapper">

            {pendingHandovers.length === 0 ? (

              <div className="admin-empty-state">

                <FiCheckCircle />

                <p>
                  No pending handovers.
                </p>

              </div>

            ) : (

              <table className="admin-table">

                <thead>

                  <tr>

                    <th>
                      Item
                    </th>

                    <th>
                      Submitted By
                    </th>

                    <th>
                      Item Location
                    </th>

                    <th>
                      Submitted
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {pendingHandovers.map(
                    (handover) => (

                      <tr
                        key={
                          handover._id
                        }
                      >

                        <td>

                          <div className="admin-table-item">

                            <strong>
                              {getItemTitle(
                                handover.item
                              )}
                            </strong>

                            <span>
                              {handover.item?.type
                                ? handover.item.type
                                    .charAt(0)
                                    .toUpperCase() +
                                  handover.item.type.slice(1)
                                : "—"}
                            </span>

                          </div>

                        </td>


                        <td>

                          <div className="admin-table-user">

                            <strong>
                              {getUserName(
                                handover.submittedBy
                              )}
                            </strong>

                            <span>
                              {handover.submittedBy
                                ?.email || "—"}
                            </span>

                          </div>

                        </td>


                        <td>
                          {handover.item
                            ?.itemLocation
                            ? handover.item
                                .itemLocation
                                .split("-")
                                .map(
                                  (word) =>
                                    word
                                      .charAt(0)
                                      .toUpperCase() +
                                    word.slice(1)
                                )
                                .join(" ")
                            : "—"}
                        </td>


                        <td>
                          {formatDate(
                            handover.createdAt
                          )}
                        </td>


                        <td>

                          <span
                            className={getStatusClass(
                              handover.status
                            )}
                          >
                            {handover.status
                              .charAt(0)
                              .toUpperCase() +
                              handover.status.slice(1)}
                          </span>

                        </td>


                        <td>

                          <button
                            type="button"
                            className="admin-table-action"
                          >
                            Review
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            )}

          </div>

        </section>

      </main>


      {/* ==================================================
          CLAIM REVIEW MODAL
      ================================================== */}

      {selectedClaim && (

        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
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

            {/* =========================
                Modal Header
            ========================= */}

            <div className="admin-modal-header">

              <div>

                <h2 id="claim-review-title">
                  Review Claim
                </h2>

                <p>
                  Verify the student's ownership
                  information before making a decision.
                </p>

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


            {/* =========================
                Claim Information
            ========================= */}

            <div className="admin-claim-details">

              <div className="admin-claim-detail">

                <span className="admin-detail-label">
                  Item
                </span>

                <strong>
                  {getItemTitle(
                    selectedClaim.item
                  )}
                </strong>

              </div>


              <div className="admin-claim-detail">

                <span className="admin-detail-label">
                  Claimant
                </span>

                <strong>
                  {getUserName(
                    selectedClaim.claimant
                  )}
                </strong>

                <span className="admin-detail-secondary">
                  {selectedClaim.claimant?.email ||
                    "—"}
                </span>

              </div>


              <div className="admin-claim-detail">

                <span className="admin-detail-label">
                  Category
                </span>

                <strong>
                  {getCategory(
                    selectedClaim.item
                  )}
                </strong>

              </div>


              <div className="admin-claim-detail">

                <span className="admin-detail-label">
                  Submitted
                </span>

                <strong>
                  {formatDate(
                    selectedClaim.createdAt
                  )}
                </strong>

              </div>

            </div>


            {/* =========================
                Ownership Proof
            ========================= */}

            <div className="admin-review-section">

              <div className="admin-review-section-heading">

                <h3>
                  Ownership Proof
                </h3>

              </div>


              <div className="admin-ownership-proof">

                {selectedClaim.ownershipProof ||
                  "No ownership proof was provided."}

              </div>

            </div>


            {/* =========================
                Evidence Images
            ========================= */}

            <div className="admin-review-section">

              <div className="admin-review-section-heading">

                <h3>
                  Evidence Images
                </h3>

                <span>
                  {selectedClaim.evidenceImages
                    ?.length || 0}
                </span>

              </div>


              {selectedClaim.evidenceImages?.length ? (

                <div className="admin-evidence-grid">

                  {selectedClaim.evidenceImages.map(
                    (image, index) => {

                      const imageUrl =
                        typeof image === "string"
                          ? image
                          : image?.url;

                      if (!imageUrl) {
                        return null;
                      }

                      return (
                        <a
                          key={
                            image?._id ||
                            imageUrl ||
                            index
                          }
                          href={imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-evidence-image"
                        >

                          <img
                            src={imageUrl}
                            alt={`Ownership evidence ${
                              index + 1
                            }`}
                          />

                          <span>
                            <FiExternalLink />
                          </span>

                        </a>
                      );

                    }
                  )}

                </div>

              ) : (

                <div className="admin-no-evidence">
                  No evidence images were submitted.
                </div>

              )}

            </div>


            {/* =========================
                Review Note
            ========================= */}

            <div className="admin-review-section">

              <label
                htmlFor="claim-review-note"
                className="admin-review-note-label"
              >

                <span>
                  Review Note
                </span>

                <span className="admin-required-note">
                  Required when rejecting
                </span>

              </label>


              <textarea
                id="claim-review-note"
                value={reviewNote}
                onChange={(event) => {

                  setReviewNote(
                    event.target.value
                  );

                  if (
                    event.target.value.trim()
                  ) {
                    setReviewNoteError("");
                  }

                }}
                placeholder="Add a note about your decision..."
                rows={4}
                disabled={reviewingClaim}
                aria-describedby="claim-review-note-help"
                aria-invalid={
                  Boolean(reviewNoteError)
                }
              />


              <p
                id="claim-review-note-help"
                className="admin-review-note-help"
              >
                A review note is required when
                rejecting a claim.
              </p>


              {reviewNoteError && (

                <p
                  className="admin-review-note-error"
                  role="alert"
                >
                  {reviewNoteError}
                </p>

              )}

            </div>


            {/* =========================
                Modal Actions
            ========================= */}

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
                onClick={() =>
                  handleReviewClaim(
                    "rejected"
                  )
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
                  handleReviewClaim(
                    "approved"
                  )
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
