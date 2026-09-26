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

  return (
    <div className="admin-dashboard">
      <AdminHeader />

      <main className="admin-dashboard-main">
        <div className="admin-dashboard-container">

          {/* Page Header */}
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

          {/* Overview Cards */}
          <section className="admin-dashboard-stats">

            <div className="admin-stat-card">
              <div className="admin-stat-icon pending">
                <FiClock />
              </div>

              <div className="admin-stat-content">
                <span>Pending Claims</span>
                <strong>{pendingClaims.length}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon handover">
                <FiPackage />
              </div>

              <div className="admin-stat-content">
                <span>Pending Handovers</span>
                <strong>{pendingHandovers.length}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon total">
                <FiAlertCircle />
              </div>

              <div className="admin-stat-content">
                <span>Total Claims</span>
                <strong>{claims.length}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon resolved">
                <FiCheckCircle />
              </div>

              <div className="admin-stat-content">
                <span>Total Handovers</span>
                <strong>{handovers.length}</strong>
              </div>
            </div>

          </section>

          {/* Claims Section */}
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
                      >
                        Review
                      </button>
                    </div>
                  ))}

                </div>
              )}

            </div>
          </section>

          {/* Handovers Section */}
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
    </div>
  );
};

export default AdminDashboard;
