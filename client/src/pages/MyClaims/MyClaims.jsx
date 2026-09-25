import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFileText,
  FiImage,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";

import api from "../../api/axios";

import "./MyClaims.css";

const filters = [
  {
    value: "all",
    label: "All Claims",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
];

const statusLabels = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const statusClasses = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
};

const categoryLabels = {
  electronics: "Electronics",
  "id-card": "ID Card",
  documents: "Documents",
  keys: "Keys",
  wallet: "Wallet",
  bag: "Bag",
  bottle: "Bottle",
  clothing: "Clothing",
  accessories: "Accessories",
  other: "Other",
};

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

const getCategoryLabel = (category) => {
  if (!category) {
    return "Other";
  }

  return (
    categoryLabels[category] ||
    category
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ")
  );
};

const getStatusIcon = (status) => {
  if (status === "approved") {
    return <FiCheckCircle />;
  }

  if (status === "rejected") {
    return <FiXCircle />;
  }

  return <FiClock />;
};

const getItemTypeLabel = (type) => {
  if (type === "lost") {
    return "Lost";
  }

  if (type === "found") {
    return "Found";
  }

  return "Item";
};

const MyClaims = () => {
  const navigate = useNavigate();

  const [claims, setClaims] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMyClaims = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/claims/my-claims"
      );

      setClaims(response.data?.claims || []);
    } catch (error) {
      console.error(
        "Fetch my claims error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load your claims. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyClaims();
  }, []);

  const filteredClaims = useMemo(() => {
    if (activeFilter === "all") {
      return claims;
    }

    return claims.filter(
      (claim) =>
        claim.status === activeFilter
    );
  }, [claims, activeFilter]);

  const getClaimCount = (status) => {
    if (status === "all") {
      return claims.length;
    }

    return claims.filter(
      (claim) => claim.status === status
    ).length;
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleViewItem = (claim) => {
    if (!claim.item?._id) {
      return;
    }

    navigate(`/items/${claim.item._id}`);
  };

  return (
    <main className="my-claims-page">
      <div className="my-claims-container">
        {/* Page Header */}
        <div className="my-claims-header">
          <div>
            <p className="my-claims-label">
              ShardaFind
            </p>

            <h1>My Claims</h1>

            <p className="my-claims-description">
              Track the claims you have submitted
              for lost and found items.
            </p>
          </div>

          <Link
            to="/browse"
            className="my-claims-browse-button"
          >
            <FiPackage />
            Browse Items
          </Link>
        </div>

        {/* Filters */}
        <div className="my-claims-toolbar">
          <div className="my-claims-filters">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`my-claims-filter ${
                  activeFilter === filter.value
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleFilterChange(
                    filter.value
                  )
                }
              >
                {filter.label}

                <span>
                  {getClaimCount(
                    filter.value
                  )}
                </span>
              </button>
            ))}
          </div>

          {!loading && claims.length > 0 && (
            <span className="my-claims-count">
              {filteredClaims.length}{" "}
              {filteredClaims.length === 1
                ? "claim"
                : "claims"}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="my-claims-list">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  className="claim-skeleton"
                  key={index}
                >
                  <div className="claim-skeleton-header">
                    <div className="skeleton-line claim-title" />
                    <div className="skeleton-status" />
                  </div>

                  <div className="claim-skeleton-meta">
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                  </div>

                  <div className="claim-skeleton-section">
                    <div className="skeleton-line small" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line medium" />
                  </div>

                  <div className="claim-skeleton-footer">
                    <div className="skeleton-line category" />
                    <div className="skeleton-button" />
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="my-claims-state">
            <div className="my-claims-state-icon error">
              <FiAlertCircle />
            </div>

            <h2>Unable to load your claims</h2>

            <p>{error}</p>

            <button
              type="button"
              className="my-claims-retry-button"
              onClick={fetchMyClaims}
            >
              <FiRefreshCw />
              Try Again
            </button>
          </div>
        )}

        {/* No Claims */}
        {!loading &&
          !error &&
          claims.length === 0 && (
            <div className="my-claims-state">
              <div className="my-claims-state-icon">
                <FiFileText />
              </div>

              <h2>No claims yet</h2>

              <p>
                Claims that you submit for items
                will appear here.
              </p>

              <Link
                to="/browse"
                className="my-claims-empty-button"
              >
                <FiPackage />
                Browse Items
              </Link>
            </div>
          )}

        {/* Filter Empty */}
        {!loading &&
          !error &&
          claims.length > 0 &&
          filteredClaims.length === 0 && (
            <div className="my-claims-state filter-empty">
              <div className="my-claims-state-icon">
                <FiFileText />
              </div>

              <h2>
                No {activeFilter} claims
              </h2>

              <p>
                You don't have any{" "}
                {activeFilter} claims.
              </p>

              <button
                type="button"
                className="my-claims-retry-button"
                onClick={() =>
                  setActiveFilter("all")
                }
              >
                View All Claims
              </button>
            </div>
          )}

        {/* Claims */}
        {!loading &&
          !error &&
          filteredClaims.length > 0 && (
            <div className="my-claims-list">
              {filteredClaims.map((claim) => {
                const statusClass =
                  statusClasses[claim.status] ||
                  "pending";

                const statusLabel =
                  statusLabels[claim.status] ||
                  "Pending";

                const item = claim.item;

                return (
                  <article
                    className="claim-card"
                    key={claim._id}
                  >
                    {/* Claim Header */}
                    <div className="claim-card-header">
                      <div className="claim-item-heading">
                        <div className="claim-item-icon">
                          <FiPackage />
                        </div>

                        <div>
                          <span className="claim-item-type">
                            {getItemTypeLabel(
                              item?.type
                            )}
                          </span>

                          <h2>
                            {item?.title ||
                              "Item unavailable"}
                          </h2>
                        </div>
                      </div>

                      <div
                        className={`claim-status ${statusClass}`}
                      >
                        {getStatusIcon(
                          claim.status
                        )}

                        <span>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Item Information */}
                    <div className="claim-item-info">
                      <div className="claim-info-item">
                        <FiMapPin />

                        <div>
                          <span>
                            Location
                          </span>

                          <strong>
                            {item?.location ||
                              "Location unavailable"}
                          </strong>
                        </div>
                      </div>

                      <div className="claim-info-item">
                        <FiFileText />

                        <div>
                          <span>
                            Category
                          </span>

                          <strong>
                            {getCategoryLabel(
                              item?.category
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="claim-info-item">
                        <FiCalendar />

                        <div>
                          <span>
                            Claim submitted
                          </span>

                          <strong>
                            {formatDate(
                              claim.createdAt
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Ownership Proof */}
                    <div className="claim-section">
                      <div className="claim-section-heading">
                        <FiCheckCircle />

                        <h3>
                          Ownership Proof
                        </h3>
                      </div>

                      <p>
                        {claim.ownershipProof ||
                          "No ownership proof provided."}
                      </p>
                    </div>

                    {/* Message */}
                    {claim.message && (
                      <div className="claim-section">
                        <div className="claim-section-heading">
                          <FiFileText />

                          <h3>
                            Your Message
                          </h3>
                        </div>

                        <p>{claim.message}</p>
                      </div>
                    )}

                    {/* Evidence Images */}
                    {Array.isArray(
                      claim.evidenceImages
                    ) &&
                      claim.evidenceImages.length >
                        0 && (
                        <div className="claim-section">
                          <div className="claim-section-heading">
                            <FiImage />

                            <h3>
                              Evidence
                            </h3>

                            <span>
                              {
                                claim
                                  .evidenceImages
                                  .length
                              }{" "}
                              {claim
                                .evidenceImages
                                .length === 1
                                ? "image"
                                : "images"}
                            </span>
                          </div>

                          <div className="claim-evidence">
                            {claim.evidenceImages.map(
                              (
                                evidence,
                                index
                              ) => (
                                <div
                                  className="claim-evidence-image"
                                  key={
                                    evidence.publicId ||
                                    `${claim._id}-${index}`
                                  }
                                >
                                  <img
                                    src={
                                      evidence.url
                                    }
                                    alt={`Claim evidence ${
                                      index + 1
                                    }`}
                                    onError={(
                                      event
                                    ) => {
                                      event.currentTarget.style.display =
                                        "none";
                                    }}
                                  />
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Review Note */}
                    {(claim.status ===
                      "approved" ||
                      claim.status ===
                        "rejected") &&
                      claim.reviewNote && (
                        <div
                          className={`claim-review-note ${statusClass}`}
                        >
                          <div className="claim-review-note-heading">
                            {claim.status ===
                            "approved" ? (
                              <FiCheckCircle />
                            ) : (
                              <FiXCircle />
                            )}

                            <h3>
                              Department Review
                            </h3>
                          </div>

                          <p>
                            {claim.reviewNote}
                          </p>
                        </div>
                      )}

                    {/* Footer */}
                    <div className="claim-card-footer">
                      <div className="claim-footer-date">
                        <FiCalendar />

                        <span>
                          Last updated{" "}
                          {formatDate(
                            claim.updatedAt
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="claim-view-button"
                        onClick={() =>
                          handleViewItem(claim)
                        }
                        disabled={!item?._id}
                      >
                        <FiEye />
                        View Item
                      </button>
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

export default MyClaims;
