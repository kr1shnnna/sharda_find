import { useEffect, useMemo, useState } from "react";

import {
  FiAlertCircle,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiEye,
  FiGrid,
  FiPackage,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiX,
} from "react-icons/fi";

import { FaHandHolding } from "react-icons/fa";

import toast from "react-hot-toast";

import api from "../../api/axios";
import AdminHeader from "../../components/AdminHeader/AdminHeader";

import "./AdminDashboard.css";

/* ==================================================
Helpers
================================================== */

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

const formatDateTime = (dateString) => {
  if (!dateString) {
    return "Date unavailable";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

const formatType = (type) => {
  if (!type) {
    return "Unknown";
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
};

const formatLocation = (location) => {
  if (location === "with-finder") {
    return "With Finder";
  }

  if (location === "lost-found-department") {
    return "Lost & Found Department";
  }

  return "Not specified";
};

const formatStatus = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/*

* A claim needs admin review ONLY when
* the physical item is currently at the
* Lost & Found Department.
  */
const isDepartmentClaim = (currentCase, claim) => {
  return (
    currentCase?.item?.itemLocation === "lost-found-department" &&
    claim?.status === "pending"
  );
};

/* ==================================================
Component
================================================== */

const AdminDashboard = () => {
  const [cases, setCases] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("overview");

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCase, setSelectedCase] = useState(null);

  const [caseLoading, setCaseLoading] = useState(false);

  const [returningItem, setReturningItem] = useState(false);

  /* ==================================================
Claim Review State
================================================== */

  const [reviewingClaim, setReviewingClaim] = useState(false);

  const [claimReviewNote, setClaimReviewNote] = useState("");

  const [claimReviewNoteError, setClaimReviewNoteError] = useState("");

  /* ==================================================
Handover Review State
================================================== */

  const [reviewingHandover, setReviewingHandover] = useState(false);

  const [handoverReviewNote, setHandoverReviewNote] = useState("");

  const [handoverReviewNoteError, setHandoverReviewNoteError] = useState("");

  /* ==================================================
Fetch Cases
================================================== */

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/cases");

      setCases(response.data?.cases || []);
    } catch (error) {
      console.error("Unable to load admin cases:", error);

      setError(error.response?.data?.message || "Unable to load admin cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    const handleCaseUpdate = () => {
      fetchCases();

      /*
       * If a case is currently open,
       * refresh that case too.
       */
      if (selectedCase?.item?._id) {
        api
          .get(`/admin/cases/${selectedCase.item._id}`)
          .then((response) => {
            setSelectedCase(response.data?.case || null);
          })
          .catch((error) => {
            console.error("Unable to refresh selected case:", error);
          });
      }
    };

    window.addEventListener("admin-case-updated", handleCaseUpdate);

    return () => {
      window.removeEventListener("admin-case-updated", handleCaseUpdate);
    };
  }, [selectedCase?.item?._id]);

  /* ==================================================
Statistics
================================================== */

  const statistics = useMemo(() => {
    const totalCases = cases.length;

    /*
     * Only department-held pending claims
     * require administrator action.
     */
    const pendingDepartmentClaims = cases.reduce(
      (count, currentCase) =>
        count +
        (currentCase.claims || []).filter((claim) =>
          isDepartmentClaim(currentCase, claim),
        ).length,
      0,
    );

    const pendingHandovers = cases.reduce(
      (count, currentCase) =>
        count +
        (currentCase.handovers || []).filter(
          (handover) => handover.status === "pending",
        ).length,
      0,
    );

    const atDepartment = cases.filter(
      (currentCase) =>
        currentCase.item?.itemLocation === "lost-found-department" &&
        currentCase.item?.status !== "returned",
    ).length;

    const returned = cases.filter(
      (currentCase) => currentCase.item?.status === "returned",
    ).length;

    return {
      totalCases,
      pendingDepartmentClaims,
      pendingHandovers,
      atDepartment,
      returned,
    };
  }, [cases]);

  /* ==================================================
Needs Attention
================================================== */

  const attentionCases = useMemo(() => {
    return cases.filter((currentCase) => {
      const pendingHandover = (currentCase.handovers || []).some(
        (handover) => handover.status === "pending",
      );

      const pendingDepartmentClaim = (currentCase.claims || []).some((claim) =>
        isDepartmentClaim(currentCase, claim),
      );

      return pendingHandover || pendingDepartmentClaim;
    });
  }, [cases]);

  /* ==================================================
Search
================================================== */

  const filteredCases = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return cases;
    }

    return cases.filter((currentCase) => {
      const item = currentCase.item;

      const title = item?.title?.toLowerCase() || "";

      const location = item?.location?.toLowerCase() || "";

      const category = item?.category?.toLowerCase() || "";

      const reporter = item?.reportedBy?.name?.toLowerCase() || "";

      const claimantNames = (currentCase.claims || [])
        .map((claim) => claim.claimant?.name?.toLowerCase() || "")
        .join(" ");

      return (
        title.includes(search) ||
        location.includes(search) ||
        category.includes(search) ||
        reporter.includes(search) ||
        claimantNames.includes(search)
      );
    });
  }, [cases, searchTerm]);

  /* ==================================================
Open Case
================================================== */

  const handleOpenCase = async (itemId) => {
    try {
      setCaseLoading(true);

      const response = await api.get(`/admin/cases/${itemId}`);

      setSelectedCase(response.data?.case || null);
    } catch (error) {
      console.error("Unable to load case:", error);

      toast.error(
        error.response?.data?.message || "Unable to load case details.",
      );
    } finally {
      setCaseLoading(false);
    }
  };

  const handleCloseCase = () => {
    if (returningItem || reviewingHandover || reviewingClaim) {
      return;
    }

    setSelectedCase(null);

    setClaimReviewNote("");
    setClaimReviewNoteError("");

    setHandoverReviewNote("");
    setHandoverReviewNoteError("");
  };

  /* ==================================================
Give Item To Owner
================================================== */

  const handleReturnItem = async () => {
    if (!selectedCase?.item?._id) {
      return;
    }

    try {
      setReturningItem(true);

      await api.patch(`/admin/items/${selectedCase.item._id}/return`);

      toast.success("Item returned to the owner successfully.");

      const response = await api.get(`/admin/cases/${selectedCase.item._id}`);

      setSelectedCase(response.data?.case || null);

      await fetchCases();
    } catch (error) {
      console.error("Unable to return item:", error);

      toast.error(error.response?.data?.message || "Unable to return item.");
    } finally {
      setReturningItem(false);
    }
  };

  /* ==================================================
Review Department Claim
================================================== */

  const handleReviewClaim = async (decision) => {
    if (!selectedCase?.item?._id) {
      return;
    }

    const pendingClaim = selectedCase.claims?.find(
      (claim) => claim.status === "pending",
    );

    if (!pendingClaim) {
      return;
    }

    if (selectedCase.item.itemLocation !== "lost-found-department") {
      toast.error("This claim is not eligible for department review.");

      return;
    }

    /*
     * A rejection must contain a reason.
     */
    if (decision === "rejected" && !claimReviewNote.trim()) {
      setClaimReviewNoteError(
        "Please provide a reason for rejecting this claim.",
      );

      return;
    }

    try {
      setReviewingClaim(true);
      setClaimReviewNoteError("");

      await api.patch(`/admin/claims/${pendingClaim._id}`, {
        decision,
        reviewNote: claimReviewNote.trim(),
      });

      toast.success(
        decision === "approved"
          ? "Claim approved. The claimant has been notified."
          : "Claim rejected. The claimant has been notified.",
      );

      setClaimReviewNote("");

      const response = await api.get(`/admin/cases/${selectedCase.item._id}`);

      setSelectedCase(response.data?.case || null);

      await fetchCases();
    } catch (error) {
      console.error("Unable to review claim:", error);

      toast.error(
        error.response?.data?.message || "Unable to review the claim.",
      );
    } finally {
      setReviewingClaim(false);
    }
  };

  /* ==================================================
Review Department Handover
================================================== */

  const handleReviewHandover = async (status) => {
    const pendingHandover = selectedCase?.handovers?.find(
      (handover) => handover.status === "pending",
    );

    if (!pendingHandover) {
      return;
    }

    if (status === "rejected" && !handoverReviewNote.trim()) {
      setHandoverReviewNoteError(
        "Please provide a reason for rejecting this handover.",
      );

      return;
    }

    try {
      setReviewingHandover(true);
      setHandoverReviewNoteError("");

      await api.patch(`/admin/handovers/${pendingHandover._id}`, {
        status,
        note: handoverReviewNote.trim(),
      });

      toast.success(
        status === "confirmed"
          ? "Handover confirmed successfully."
          : "Handover rejected successfully.",
      );

      setHandoverReviewNote("");

      const response = await api.get(`/admin/cases/${selectedCase.item._id}`);

      setSelectedCase(response.data?.case || null);

      await fetchCases();
    } catch (error) {
      console.error("Unable to review handover:", error);

      toast.error(
        error.response?.data?.message || "Unable to review the handover.",
      );
    } finally {
      setReviewingHandover(false);
    }
  };

  /* ==================================================
Build Timeline
================================================== */

  const buildTimeline = (currentCase) => {
    if (!currentCase) {
      return [];
    }

    const timeline = [];

    const item = currentCase.item;

    /* -----------------------------------------------
   Item Posted
------------------------------------------------ */

    if (item?.createdAt) {
      timeline.push({
        date: item.createdAt,
        title: "Item Posted",
        description: `${item.reportedBy?.name || "Student"} posted this item.`,
        icon: "item",
      });
    }

    /* -----------------------------------------------
   Department Handovers
------------------------------------------------ */

    currentCase.handovers?.forEach((handover) => {
      timeline.push({
        date: handover.createdAt,
        title: "Handover Requested",
        description: `${
          handover.submittedBy?.name || "Student"
        } requested department handover.`,
        icon: "handover",
      });

      if (handover.status !== "pending") {
        timeline.push({
          date: handover.reviewedAt || handover.updatedAt || handover.createdAt,

          title:
            handover.status === "confirmed"
              ? "Department Handover Confirmed"
              : "Department Handover Rejected",

          description:
            handover.status === "confirmed"
              ? "The Lost & Found Department confirmed receipt of the item."
              : handover.note || "The department could not confirm receipt.",

          icon: handover.status === "confirmed" ? "success" : "rejected",
        });
      }
    });

    /* -----------------------------------------------
   Ownership Claims
------------------------------------------------ */

    currentCase.claims?.forEach((claim) => {
      const departmentHeld = item?.itemLocation === "lost-found-department";

      timeline.push({
        date: claim.createdAt,

        title: departmentHeld
          ? "Department Claim Submitted"
          : "Claim Submitted",

        description: departmentHeld
          ? `${
              claim.claimant?.name || "Student"
            } submitted an ownership claim for an item currently held by the Lost & Found Department.`
          : `${
              claim.claimant?.name || "Student"
            } submitted an ownership claim.`,

        icon: "claim",
      });

      if (claim.status !== "pending") {
        timeline.push({
          date: claim.updatedAt || claim.createdAt,

          title:
            claim.status === "approved"
              ? departmentHeld
                ? "Department Claim Approved"
                : "Claim Approved"
              : departmentHeld
                ? "Department Claim Rejected"
                : "Claim Rejected",

          description:
            claim.status === "approved"
              ? departmentHeld
                ? "The Lost & Found Department approved the ownership claim."
                : "The finder approved the ownership claim."
              : claim.reviewNote ||
                (departmentHeld
                  ? "The Lost & Found Department rejected the ownership claim."
                  : "The finder rejected the ownership claim."),

          icon: claim.status === "approved" ? "success" : "rejected",
        });
      }
    });

    /* -----------------------------------------------
   Item Returned
------------------------------------------------ */

    if (item?.departmentReturnedAt) {
      timeline.push({
        date: item.departmentReturnedAt,

        title: "Item Returned",

        description: `Item given to ${
          item.departmentReturnedTo?.name || "the approved claimant"
        } by ${item.departmentReturnedBy?.name || "an administrator"}.`,

        icon: "returned",
      });
    }

    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  /* ==================================================
Loading
================================================== */

  if (loading) {
    return (
      <div className="admin-dashboard-page">
        {" "}
        <AdminHeader />
        ```
        <div className="admin-dashboard-shell">
          <aside className="admin-sidebar">
            <div className="admin-sidebar-content">
              <div className="admin-sidebar-section">
                <span className="admin-sidebar-section-title">Workspace</span>

                <div className="admin-sidebar-link active">
                  <FiGrid />
                  <span>Dashboard</span>
                </div>

                <div className="admin-sidebar-link">
                  <FiPackage />
                  <span>All Cases</span>
                </div>

                <div className="admin-sidebar-link">
                  <FiClock />
                  <span>Needs Attention</span>
                </div>
              </div>
            </div>
          </aside>

          <main className="admin-dashboard-container">
            <div className="admin-dashboard-loading">
              <FiRefreshCw className="admin-loading-icon" />

              <p>Loading admin dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ==================================================
Render
================================================== */

  return (
    <div className="admin-dashboard-page">
      {" "}
      <AdminHeader />
      <div className="admin-dashboard-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-content">
            <div className="admin-sidebar-section">
              <span className="admin-sidebar-section-title">Workspace</span>

              <button
                type="button"
                className={
                  activeTab === "overview"
                    ? "admin-sidebar-link active"
                    : "admin-sidebar-link"
                }
                onClick={() => setActiveTab("overview")}
              >
                <FiGrid />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                className={
                  activeTab === "cases"
                    ? "admin-sidebar-link active"
                    : "admin-sidebar-link"
                }
                onClick={() => setActiveTab("cases")}
              >
                <FiPackage />
                <span>All Cases</span>
              </button>

              <button
                type="button"
                className={
                  activeTab === "attention"
                    ? "admin-sidebar-link active"
                    : "admin-sidebar-link"
                }
                onClick={() => setActiveTab("attention")}
              >
                <FiClock />
                <span>Needs Attention</span>

                {attentionCases.length > 0 && (
                  <span className="admin-sidebar-badge">
                    {attentionCases.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-user">
              <div className="admin-sidebar-avatar">A</div>

              <div>
                <strong>Administrator</strong>

                <span>ShardaFind Admin Portal</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="admin-dashboard-container">
          {/* Header */}

          <div className="admin-dashboard-heading">
            <div className="admin-heading-content">
              <span className="admin-heading-eyebrow">Administration</span>

              <h1>Lost &amp; Found Dashboard</h1>

              <p>
                Manage department handovers, ownership claims, and Lost &amp;
                Found cases from one place.
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh-button"
              onClick={fetchCases}
            >
              <FiRefreshCw />

              <span>Refresh</span>
            </button>
          </div>

          {/* Error */}

          {error && (
            <div className="admin-dashboard-error" role="alert">
              <FiAlertCircle />

              <span>{error}</span>
            </div>
          )}

          {/* Statistics */}

          <div className="admin-summary-grid">
            {/* Total Cases */}

            <div className="admin-summary-card">
              <div className="admin-summary-icon">
                <FiPackage />
              </div>

              <div className="admin-summary-content">
                <span className="admin-summary-label">Total Cases</span>

                <strong className="admin-summary-value">
                  {statistics.totalCases}
                </strong>
              </div>
            </div>

            {/* Pending Claims */}

            <div className="admin-summary-card">
              <div className="admin-summary-icon admin-summary-icon-warning">
                <FiUser />
              </div>

              <div className="admin-summary-content">
                <span className="admin-summary-label">Claims to Review</span>

                <strong className="admin-summary-value">
                  {statistics.pendingDepartmentClaims}
                </strong>
              </div>
            </div>

            {/* Pending Handovers */}

            <div className="admin-summary-card">
              <div className="admin-summary-icon admin-summary-icon-warning">
                <FaHandHolding />
              </div>

              <div className="admin-summary-content">
                <span className="admin-summary-label">Pending Handovers</span>

                <strong className="admin-summary-value">
                  {statistics.pendingHandovers}
                </strong>
              </div>
            </div>

            {/* At Department */}

            <div className="admin-summary-card">
              <div className="admin-summary-icon admin-summary-icon-package">
                <FiPackage />
              </div>

              <div className="admin-summary-content">
                <span className="admin-summary-label">At Department</span>

                <strong className="admin-summary-value">
                  {statistics.atDepartment}
                </strong>
              </div>
            </div>

            {/* Returned */}

            <div className="admin-summary-card">
              <div className="admin-summary-icon">
                <FiCheckCircle />
              </div>

              <div className="admin-summary-content">
                <span className="admin-summary-label">Returned</span>

                <strong className="admin-summary-value">
                  {statistics.returned}
                </strong>
              </div>
            </div>
          </div>

          {/* Navigation */}

          <div className="admin-dashboard-tabs">
            <button
              type="button"
              className={
                activeTab === "overview"
                  ? "admin-dashboard-tab active"
                  : "admin-dashboard-tab"
              }
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>

            <button
              type="button"
              className={
                activeTab === "attention"
                  ? "admin-dashboard-tab active"
                  : "admin-dashboard-tab"
              }
              onClick={() => setActiveTab("attention")}
            >
              Needs Attention
              {attentionCases.length > 0 && (
                <span className="admin-tab-count">{attentionCases.length}</span>
              )}
            </button>

            <button
              type="button"
              className={
                activeTab === "cases"
                  ? "admin-dashboard-tab active"
                  : "admin-dashboard-tab"
              }
              onClick={() => setActiveTab("cases")}
            >
              All Cases
            </button>
          </div>

          {/* ==================================================
          OVERVIEW
      ================================================== */}

          {activeTab === "overview" && (
            <section className="admin-dashboard-section">
              <div className="admin-section-header">
                <div>
                  <h2>Needs Attention</h2>

                  <p>
                    Department handovers and ownership claims that currently
                    require administrator action.
                  </p>
                </div>

                <span className="admin-section-count">
                  {attentionCases.length}
                </span>
              </div>

              {attentionCases.length === 0 ? (
                <div className="admin-empty-state">
                  <FiCheckCircle />

                  <p>Nothing requires your attention.</p>
                </div>
              ) : (
                <div className="admin-case-grid">
                  {attentionCases.slice(0, 6).map((currentCase) => (
                    <CaseCard
                      key={currentCase.item?._id}
                      currentCase={currentCase}
                      onOpen={() => handleOpenCase(currentCase.item._id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ==================================================
          NEEDS ATTENTION
      ================================================== */}

          {activeTab === "attention" && (
            <section className="admin-dashboard-section">
              <div className="admin-section-header">
                <div>
                  <h2>Cases Requiring Action</h2>

                  <p>
                    Pending department handovers and claims for items currently
                    held by the Lost &amp; Found Department.
                  </p>
                </div>

                <span className="admin-section-count">
                  {attentionCases.length}
                </span>
              </div>

              {attentionCases.length === 0 ? (
                <div className="admin-empty-state">
                  <FiCheckCircle />

                  <p>No cases require attention.</p>
                </div>
              ) : (
                <div className="admin-case-grid">
                  {attentionCases.map((currentCase) => (
                    <CaseCard
                      key={currentCase.item?._id}
                      currentCase={currentCase}
                      onOpen={() => handleOpenCase(currentCase.item._id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ==================================================
          ALL CASES
      ================================================== */}

          {activeTab === "cases" && (
            <section className="admin-dashboard-section">
              <div className="admin-section-header">
                <div>
                  <h2>All Cases</h2>

                  <p>Complete history of items handled by the department.</p>
                </div>

                <span className="admin-section-count">
                  {filteredCases.length}
                </span>
              </div>

              <div className="admin-case-search">
                <FiSearch />

                <input
                  type="text"
                  placeholder="Search by item, category, location, or student..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              {filteredCases.length === 0 ? (
                <div className="admin-empty-state">
                  <FiPackage />

                  <p>No cases found.</p>
                </div>
              ) : (
                <div className="admin-case-list">
                  {filteredCases.map((currentCase) => (
                    <CaseRow
                      key={currentCase.item?._id}
                      currentCase={currentCase}
                      onOpen={() => handleOpenCase(currentCase.item._id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
      {/* ==================================================
      CASE MODAL
  ================================================== */}
      {selectedCase && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseCase();
            }
          }}
        >
          <div className="admin-case-modal" role="dialog" aria-modal="true">
            <div className="admin-modal-header">
              <div>
                <span className="admin-modal-eyebrow">Case Details</span>

                <h2>{selectedCase.item?.title || "Item"}</h2>

                <p>Complete activity and ownership history.</p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={handleCloseCase}
                disabled={returningItem || reviewingHandover || reviewingClaim}
                aria-label="Close case"
              >
                <FiX />
              </button>
            </div>

            {/* Case Summary */}

            <div className="admin-case-summary">
              <div>
                <span>Type</span>

                <strong>{formatType(selectedCase.item?.type)}</strong>
              </div>

              <div>
                <span>Category</span>

                <strong>{formatCategory(selectedCase.item?.category)}</strong>
              </div>

              <div>
                <span>Status</span>

                <strong>{formatStatus(selectedCase.item?.status)}</strong>
              </div>

              <div>
                <span>Location</span>

                <strong>
                  {formatLocation(selectedCase.item?.itemLocation)}
                </strong>
              </div>
            </div>

            {/* Approved Claim Information */}

            {selectedCase.approvedClaim && (
              <div className="admin-approved-owner">
                <div className="admin-approved-owner-icon">
                  <FiCheckCircle />
                </div>

                <div>
                  <span>Approved Claimant</span>

                  <strong>
                    {selectedCase.approvedClaim.claimant?.name || "Student"}
                  </strong>

                  <small>
                    {selectedCase.approvedClaim.claimant?.email ||
                      "Email unavailable"}
                  </small>
                </div>
              </div>
            )}

            {/* ==================================================
            Pending Department Handover
        ================================================== */}

            {selectedCase.handovers?.some(
              (handover) => handover.status === "pending",
            ) && (
              <div className="admin-action-panel admin-action-panel-warning">
                <div className="admin-action-panel-icon">
                  <FaHandHolding />
                </div>

                <div className="admin-action-panel-content">
                  <span className="admin-action-label">
                    Department Handover Request
                  </span>

                  <h3>Confirm that the department received this item</h3>

                  <p>
                    The student has reported handing over this item to the Lost
                    &amp; Found Department. Confirm only after the item has
                    actually been received.
                  </p>

                  <label
                    htmlFor="handover-review-note"
                    className="admin-review-note-label"
                  >
                    <span>Admin Note</span>

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
                    placeholder="Add a note about this handover..."
                    rows={3}
                    disabled={reviewingHandover}
                    aria-invalid={Boolean(handoverReviewNoteError)}
                  />

                  {handoverReviewNoteError && (
                    <p className="admin-review-note-error" role="alert">
                      {handoverReviewNoteError}
                    </p>
                  )}

                  <div className="admin-action-buttons">
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
                      <FiCheckCircle />

                      {reviewingHandover ? "Processing..." : "Confirm Handover"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================
            Department Ownership Claim Review

            ONLY shown when the item is currently
            at the Lost & Found Department.
        ================================================== */}

            {selectedCase.item?.itemLocation === "lost-found-department" &&
              selectedCase.claims?.some(
                (claim) => claim.status === "pending",
              ) && (
                <div className="admin-action-panel admin-action-panel-claim">
                  <div className="admin-action-panel-icon">
                    <FiUser />
                  </div>

                  <div className="admin-action-panel-content">
                    <span className="admin-action-label">
                      Lost &amp; Found Department
                    </span>

                    <h3>Ownership claim requires department review</h3>

                    <p>
                      This item is currently held by the Lost &amp; Found
                      Department. Review the claimant's ownership proof before
                      approving or rejecting the claim.
                    </p>

                    {selectedCase.claims
                      .filter((claim) => claim.status === "pending")
                      .map((claim) => (
                        <div
                          className="admin-claim-review-card"
                          key={claim._id}
                        >
                          <div className="admin-claim-review-header">
                            <div>
                              <span>Claimant</span>

                              <strong>
                                {claim.claimant?.name || "Student"}
                              </strong>

                              <small>
                                {claim.claimant?.email || "Email unavailable"}
                              </small>
                            </div>

                            <span className="admin-claim-pending-badge">
                              Pending Review
                            </span>
                          </div>

                          <div className="admin-claim-review-proof">
                            <span>Ownership Proof</span>

                            <p>
                              {claim.ownershipProof ||
                                "No ownership proof provided."}
                            </p>
                          </div>

                          {claim.message && (
                            <div className="admin-claim-review-message">
                              <span>Claimant Message</span>

                              <p>{claim.message}</p>
                            </div>
                          )}

                          <label
                            htmlFor={`claim-review-note-${claim._id}`}
                            className="admin-review-note-label"
                          >
                            <span>Review Note</span>

                            <span className="admin-required-note">
                              Required when rejecting
                            </span>
                          </label>

                          <textarea
                            id={`claim-review-note-${claim._id}`}
                            value={claimReviewNote}
                            onChange={(event) => {
                              setClaimReviewNote(event.target.value);

                              if (event.target.value.trim()) {
                                setClaimReviewNoteError("");
                              }
                            }}
                            placeholder="Add a note about your claim decision..."
                            rows={3}
                            disabled={reviewingClaim}
                            aria-invalid={Boolean(claimReviewNoteError)}
                          />

                          {claimReviewNoteError && (
                            <p className="admin-review-note-error" role="alert">
                              {claimReviewNoteError}
                            </p>
                          )}

                          <div className="admin-action-buttons">
                            <button
                              type="button"
                              className="admin-modal-reject"
                              onClick={() => handleReviewClaim("rejected")}
                              disabled={reviewingClaim}
                            >
                              {reviewingClaim
                                ? "Processing..."
                                : "Reject Claim"}
                            </button>

                            <button
                              type="button"
                              className="admin-modal-approve"
                              onClick={() => handleReviewClaim("approved")}
                              disabled={reviewingClaim}
                            >
                              <FiCheckCircle />

                              {reviewingClaim
                                ? "Processing..."
                                : "Approve Claim"}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* ==================================================
            Ownership Claim History

            For finder-held claims, the admin only
            sees history.

            For department-held claims, the actual
            review panel appears above.
        ================================================== */}

            {selectedCase.claims?.length > 0 && (
              <div className="admin-case-info-panel">
                <div className="admin-action-panel-icon">
                  <FiUser />
                </div>

                <div className="admin-action-panel-content">
                  <span className="admin-action-label">
                    Ownership Claim History
                  </span>

                  {selectedCase.item?.itemLocation ===
                  "lost-found-department" ? (
                    <>
                      <h3>Claim handled by the Lost &amp; Found Department</h3>

                      <p>
                        Because this item is currently held by the Lost &amp;
                        Found Department, pending ownership claims are reviewed
                        by the administrator.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>Finder handles direct-owner claims</h3>

                      <p>
                        This item is currently with the finder. Ownership claims
                        are reviewed directly by the student who posted the
                        item. The Lost &amp; Found Department does not approve
                        or reject these direct-owner claims.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}

            <div className="admin-case-timeline-section">
              <div className="admin-review-section-heading">
                <h3>Case Timeline</h3>
              </div>

              <div className="admin-case-timeline">
                {buildTimeline(selectedCase).map((event, index) => (
                  <div
                    className="admin-timeline-item"
                    key={`${event.title}-${index}`}
                  >
                    <div className="admin-timeline-marker">
                      {event.icon === "success" || event.icon === "returned" ? (
                        <FiCheckCircle />
                      ) : event.icon === "rejected" ? (
                        <FiX />
                      ) : event.icon === "handover" ? (
                        <FaHandHolding />
                      ) : event.icon === "claim" ? (
                        <FiUser />
                      ) : (
                        <FiPackage />
                      )}
                    </div>

                    <div className="admin-timeline-content">
                      <div className="admin-timeline-top">
                        <strong>{event.title}</strong>

                        <span>{formatDateTime(event.date)}</span>
                      </div>

                      <p>{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ==================================================
            Department Return Action

            This remains an admin action because
            the item is physically at the department.
        ================================================== */}

            {selectedCase.item?.status === "active" &&
              selectedCase.item?.itemLocation === "lost-found-department" &&
              selectedCase.approvedClaim && (
                <div className="admin-case-final-action">
                  <div>
                    <h3>Ready for Collection</h3>

                    <p>
                      Verify the claimant's Sharda University ID and ownership
                      proof before handing over the item.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-modal-approve"
                    onClick={handleReturnItem}
                    disabled={returningItem}
                  >
                    <FiCheckCircle />

                    {returningItem ? "Returning..." : "Give Item to Owner"}
                  </button>
                </div>
              )}

            {/* Returned */}

            {selectedCase.item?.status === "returned" && (
              <div className="admin-case-returned">
                <FiCheckCircle />

                <div>
                  <strong>Item Returned</strong>

                  <span>
                    Returned to{" "}
                    {selectedCase.item.departmentReturnedTo?.name ||
                      "the approved claimant"}{" "}
                    on {formatDateTime(selectedCase.item.departmentReturnedAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Case Loading Overlay */}
      {caseLoading && (
        <div className="admin-case-loading-overlay">
          <FiRefreshCw />

          <span>Loading case...</span>
        </div>
      )}
    </div>
  );
};

/* ==================================================
Case Card
================================================== */

const CaseCard = ({ currentCase, onOpen }) => {
  const item = currentCase.item;

  const pendingHandover = currentCase.handovers?.find(
    (handover) => handover.status === "pending",
  );

  const pendingDepartmentClaim =
    item?.itemLocation === "lost-found-department" &&
    currentCase.claims?.find((claim) => claim.status === "pending");

  return (
    <div className="admin-case-card">
      {" "}
      <div className="admin-case-card-top">
        {" "}
        <div>
          {" "}
          <span className="admin-case-type">{formatType(item?.type)} </span>
          ```
          <h3>{item?.title || "Item unavailable"}</h3>
        </div>
        <span className="admin-case-status">
          {item?.status === "returned"
            ? "Returned"
            : item?.itemLocation === "lost-found-department"
              ? "At Department"
              : "Active"}
        </span>
      </div>
      <div className="admin-case-card-details">
        <span>{formatCategory(item?.category)}</span>

        <span>{item?.location || "Location unavailable"}</span>
      </div>
      <div className="admin-case-card-alerts">
        {pendingHandover && (
          <span>
            <FaHandHolding />
            Handover pending
          </span>
        )}

        {pendingDepartmentClaim && (
          <span>
            <FiUser />
            Claim requires review
          </span>
        )}
      </div>
      <button type="button" className="admin-case-open-button" onClick={onOpen}>
        <span>View Case</span>

        <FiChevronRight />
      </button>
    </div>
  );
};

/* ==================================================
Case Row
================================================== */

const CaseRow = ({ currentCase, onOpen }) => {
  const item = currentCase.item;

  const hasPendingDepartmentClaim =
    item?.itemLocation === "lost-found-department" &&
    currentCase.claims?.some((claim) => claim.status === "pending");

  return (
    <div className="admin-case-row">
      {" "}
      <div className="admin-case-row-main">
        {" "}
        <div className="admin-case-row-icon">
          {" "}
          <FiPackage />{" "}
        </div>
        <div className="admin-case-row-info">
          <strong>{item?.title || "Item unavailable"}</strong>

          <span>
            {formatType(item?.type)}
            {" · "}
            {formatCategory(item?.category)}
          </span>
        </div>
      </div>
      <div className="admin-case-row-meta">
        <span>{formatLocation(item?.itemLocation)}</span>

        <span>{formatDate(item?.createdAt)}</span>
      </div>
      <div className="admin-case-row-status">
        {hasPendingDepartmentClaim && <span>Claim Review</span>}

        {!hasPendingDepartmentClaim && (
          <span>{formatStatus(item?.status)}</span>
        )}
      </div>
      <button type="button" className="admin-table-action" onClick={onOpen}>
        <FiEye />
        View
      </button>
    </div>
  );
};

export default AdminDashboard;
