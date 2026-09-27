import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ClaimForm from "../../components/ClaimForm/ClaimForm";

import {
  FiArrowLeft,
  FiMapPin,
  FiCalendar,
  FiUser,
  FiPackage,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiMessageSquare,
  FiX,
  FiShare2,
  FiCopy,
} from "react-icons/fi";

import toast from "react-hot-toast";

import api from "../../api/axios";

import "./ItemDetails.css";

const FALLBACK_IMAGE =
  "https://placehold.co/900x650/f1f5f9/64748b?text=No+Image";

const statusLabels = {
  active: "Active",
  "claim-pending": "Claim Pending",
  returned: "Returned",
  closed: "Closed",
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

const ItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuth();

  /*
   * Redirect logged-out users to login
   * before performing protected actions.
   */
  const requireLogin = () => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/items/${id}`,
        },
      });

      return false;
    }

    return true;
  };

  const [item, setItem] = useState(null);
  const [eligibleClaim, setEligibleClaim] = useState(null);
  const [showClaimForm, setShowClaimForm] = useState(false);

  const handleClaimSuccess = async () => {
    setShowClaimForm(false);

    try {
      const response = await api.get(`/items/${item._id}`);

      setItem(response.data.item);

      setEligibleClaim(response.data.eligibleClaim || null);
    } catch (error) {
      console.error("Refresh item after claim error:", error);
    }
  };

  const [selectedImage, setSelectedImage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reportingFound, setReportingFound] = useState(false);

  const [showReportFoundModal, setShowReportFoundModal] = useState(false);

  const [handoverLoading, setHandoverLoading] = useState(false);

  const [showHandoverModal, setShowHandoverModal] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/items/${id}`);

        setItem(response.data.item);

        setEligibleClaim(response.data.eligibleClaim || null);

        setSelectedImage(0);
      } catch (error) {
        console.error("Error fetching item:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load this item. It may no longer exist.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const formatDate = (date) => {
    if (!date) {
      return "Date unavailable";
    }

    const formattedDate = new Date(date);

    if (Number.isNaN(formattedDate.getTime())) {
      return "Date unavailable";
    }

    return formattedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleReportFound = async () => {
    if (!item?._id || item.type !== "lost") {
      return;
    }

    try {
      setReportingFound(true);

      await api.post(`/items/${item._id}/report-found`);

      const response = await api.get(`/items/${item._id}`);

      setItem(response.data.item);

      setEligibleClaim(response.data.eligibleClaim || null);

      toast.success("Item reported successfully. The owner has been notified.");
    } catch (error) {
      console.error("Report found error:", error);

      const message =
        error.response?.data?.message || "Unable to report this item as found.";

      toast.error(message);
    } finally {
      setReportingFound(false);
    }
  };

  /*
   * Open department handover confirmation modal.
   */
  const openHandoverModal = () => {
    if (!canHandOverToDepartment || handoverLoading) {
      return;
    }

    setShowHandoverModal(true);
  };

  /*
   * Close department handover confirmation modal.
   */
  const closeHandoverModal = () => {
    if (handoverLoading) {
      return;
    }

    setShowHandoverModal(false);
  };

  /*
   * Close department handover modal with Escape.
   */
  useEffect(() => {
    if (!showHandoverModal) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeHandoverModal();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showHandoverModal, handoverLoading]);

  const handleDepartmentHandover = async () => {
    if (!item?._id) {
      return;
    }

    try {
      setHandoverLoading(true);

      await api.post(`/handovers/${item._id}`);

      const response = await api.get(`/items/${item._id}`);

      setItem(response.data.item);

      setEligibleClaim(response.data.eligibleClaim || null);

      setShowHandoverModal(false);

      toast.success(
        "Handover request submitted. Waiting for department confirmation.",
      );
    } catch (error) {
      console.error("Department handover error:", error);

      toast.error(
        error.response?.data?.message || "Unable to submit handover request.",
      );
    } finally {
      setHandoverLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!item?._id) {
      return;
    }

    try {
      const response = await api.get(`/messages/conversation/${item._id}`);

      const conversation = response.data?.conversation;

      if (conversation?._id) {
        navigate(`/messages/${conversation._id}`);
      }
    } catch (error) {
      console.error("Open conversation error:", error);

      toast.error(
        error.response?.data?.message || "Unable to open this conversation.",
      );
    }
  };

  const handleWhatsAppShare = () => {
    if (!item?._id) {
      return;
    }

    const itemUrl = `${window.location.origin}/items/${item._id}`;

    const message = `Check out this ${isLost ? "lost" : "found"} item on ShardaFind:\n\n${item.title}\n${itemUrl}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    if (!item?._id) {
      return;
    }

    const itemUrl = `${window.location.origin}/items/${item._id}`;

    try {
      await navigator.clipboard.writeText(itemUrl);
      toast.success("Item link copied.");
    } catch (error) {
      console.error("Copy link error:", error);
      toast.error("Unable to copy the link.");
    }
  };

  if (loading) {
    return (
      <main className="item-details-page">
        <div className="item-details-container">
          <div className="item-details-loading">
            <div className="details-spinner"></div>

            <p>Loading item...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="item-details-page">
        <div className="item-details-container">
          <div className="item-details-error">
            <div className="details-error-icon">
              <FiPackage />
            </div>

            <h2>Item not found</h2>

            <p>{error || "This item could not be found."}</p>

            <Link to="/browse" className="back-to-browse">
              <FiArrowLeft />
              Back to Browse
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Backend image structure:
   *
   * images: [
   *   {
   *     url: "...",
   *     publicId: "..."
   *   }
   * ]
   *
   * Convert it into an array of URLs
   * for the gallery.
   */

  const images =
    Array.isArray(item.images) && item.images.length > 0
      ? item.images.map((image) => image?.url).filter(Boolean)
      : [FALLBACK_IMAGE];

  const mainImage = images[selectedImage] || FALLBACK_IMAGE;

  const isLost = item.type === "lost";

  const hasMultipleImages = images.length > 1;

  const statusLabel = statusLabels[item.status] || item.status || "Active";

  const categoryLabel =
    categoryLabels[item.category] || item.category || "Other";

  /*
   * Get IDs safely.
   *
   * Depending on whether the backend populated
   * these fields, they may be either:
   *
   * "userId"
   *
   * or:
   *
   * { _id: "userId", name: "..." }
   */

  const currentUserId = user?.id || user?._id;

  const reportedById = item.reportedBy?._id || item.reportedBy;

  const foundById = item.foundBy?._id || item.foundBy;

  const approvedClaim = eligibleClaim?.status === "approved";

  const isApprovedClaimOwner =
    approvedClaim &&
    currentUserId &&
    eligibleClaim?.claimant?._id &&
    currentUserId.toString() === eligibleClaim.claimant._id.toString();

  /*
   * Is the currently logged-in user the person
   * who originally reported this item?
   */

  const isOwnItem =
    currentUserId &&
    reportedById &&
    currentUserId.toString() === reportedById.toString();

  /*
   * FOUND POST
   *
   * The person who created a Found post is
   * the person currently holding the item.
   */

  const isFoundItemOwner =
    !isLost &&
    currentUserId &&
    reportedById &&
    currentUserId.toString() === reportedById.toString();

  /*
   * LOST ITEM
   *
   * If somebody reports a lost item as found,
   * foundBy becomes that person's ID.
   */

  const isLostItemFinder =
    isLost &&
    currentUserId &&
    foundById &&
    currentUserId.toString() === foundById.toString();

  /*
   * Department handover is available when:
   *
   * 1. The current user is holding the item.
   * 2. The item is still with the finder.
   * 3. The item is active.
   */

  const canHandOverToDepartment =
    (isFoundItemOwner || isLostItemFinder) &&
    item.itemLocation === "with-finder" &&
    item.status === "active";

  /*
   * Messaging rules:
   *
   * LOST ITEM
   * -> message becomes available once
   *    somebody has reported finding it.
   *
   * FOUND ITEM
   * -> message becomes available when
   *    there is an active claim.
   *
   * If the item is already with the
   * Lost & Found Department, messaging
   * is disabled.
   */

  const canMessage =
    item.itemLocation !== "lost-found-department" &&
    ((isLost && Boolean(item.foundBy)) ||
      (!isLost && Boolean(eligibleClaim?.claimant)));

  const goToPreviousImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setSelectedImage((currentIndex) =>
      currentIndex === 0 ? images.length - 1 : currentIndex - 1,
    );
  };

  const goToNextImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setSelectedImage((currentIndex) =>
      currentIndex === images.length - 1 ? 0 : currentIndex + 1,
    );
  };

  const handleImageError = (event) => {
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <main className="item-details-page">
      <div className="item-details-container">
        {/* BACK LINK */}

        <Link to="/browse" className="details-back-link">
          <FiArrowLeft />
          Back to Browse
        </Link>

        <div className="item-details-card">
          {/* IMAGE GALLERY */}

          <div className="item-details-gallery">
            <div className="item-details-image">
              <img
                src={mainImage}
                alt={`${item.title} ${selectedImage + 1}`}
                onError={handleImageError}
              />

              <span
                className={`details-type-badge ${isLost ? "lost" : "found"}`}
              >
                {isLost ? "Lost" : "Found"}
              </span>

              <button
                type="button"
                className="gallery-arrow gallery-arrow-left"
                onClick={goToPreviousImage}
                disabled={!hasMultipleImages}
                aria-label="Previous image"
              >
                <FiChevronLeft />
              </button>

              <button
                type="button"
                className="gallery-arrow gallery-arrow-right"
                onClick={goToNextImage}
                disabled={!hasMultipleImages}
                aria-label="Next image"
              >
                <FiChevronRight />
              </button>
            </div>

            {/* THUMBNAILS */}

            {hasMultipleImages && (
              <div className="item-image-thumbnails">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    className={`item-image-thumbnail ${
                      selectedImage === index ? "active" : ""
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img
                      src={image}
                      alt={`${item.title} thumbnail ${index + 1}`}
                      onError={handleImageError}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ITEM CONTENT */}

          <div className="item-details-content">
            <div className="details-heading">
              <div>
                <span className="details-category">{categoryLabel}</span>

                <h1>{item.title}</h1>
              </div>

              <span className={`details-status ${item.status}`}>
                {statusLabel}
              </span>
            </div>

            <p className="details-description">{item.description}</p>

            {/* ITEM INFORMATION */}

            <div className="details-info">
              <div className="details-info-item">
                <div className="details-info-icon">
                  <FiMapPin />
                </div>

                <div>
                  <span>{isLost ? "Lost at" : "Found at"}</span>

                  <strong>{item.location || "Location unavailable"}</strong>
                </div>
              </div>

              <div className="details-info-item">
                <div className="details-info-icon">
                  <FiCalendar />
                </div>

                <div>
                  <span>Date</span>

                  <strong>{formatDate(item.itemDate)}</strong>
                </div>
              </div>

              <div className="details-info-item">
                <div className="details-info-icon">
                  <FiUser />
                </div>

                <div>
                  <span>{isLost ? "Reported by" : "Found by"}</span>

                  <strong>
                    {isOwnItem
                      ? "Me"
                      : item.reportedBy?.name || "Sharda Student"}
                  </strong>
                </div>
              </div>
            </div>

            {/* CURRENT ITEM LOCATION */}

            {!isLost && item.itemLocation && (
              <div className="pickup-box">
                <FiCheckCircle />

                <div>
                  <span>Current location</span>

                  <strong>
                    {item.itemLocation === "lost-found-department"
                      ? "Lost & Found Department"
                      : "With finder"}
                  </strong>
                </div>
              </div>
            )}

            {/* ACTIONS */}

            <div className="details-actions">
              {/* REPORT FOUND / CLAIM */}

              {!isOwnItem && (
                <button
                  type="button"
                  className="claim-button"
                  disabled={
                    item.status !== "active" ||
                    reportingFound ||
                    Boolean(item.foundBy) ||
                    approvedClaim
                  }
                  onClick={() => {
                    /*
                     * Claim and Report Found require login.
                     */
                    if (!requireLogin()) {
                      return;
                    }

                    if (approvedClaim) {
                      return;
                    }

                    if (isLost && !item.foundBy) {
                      setShowReportFoundModal(true);
                      return;
                    }

                    if (!isLost) {
                      setShowClaimForm(true);
                    }
                  }}
                >
                  <FiCheckCircle />

                  {approvedClaim
                    ? isApprovedClaimOwner
                      ? "Claim Approved"
                      : "Item Already Claimed"
                    : item.foundBy
                      ? "Already Reported"
                      : item.status !== "active"
                        ? "Item Unavailable"
                        : isLost
                          ? reportingFound
                            ? "Reporting..."
                            : "Report Found"
                          : "Claim This Item"}
                </button>
              )}

              {/* DEPARTMENT HANDOVER */}

              {canHandOverToDepartment && (
                <>
                  {!item.handover ? (
                    <button
                      type="button"
                      className="department-handover-button"
                      disabled={handoverLoading}
                      onClick={openHandoverModal}
                    >
                      <FiCheckCircle />

                      {handoverLoading
                        ? "Submitting..."
                        : "Hand over to L&F Department"}
                    </button>
                  ) : item.handover.status === "pending" ? (
                    <div className="department-handover-status pending">
                      <FiCheckCircle />
                      Waiting for Department
                    </div>
                  ) : item.handover.status === "rejected" ? (
                    <button
                      type="button"
                      className="department-handover-button"
                      disabled={handoverLoading}
                      onClick={openHandoverModal}
                    >
                      <FiCheckCircle />

                      {handoverLoading ? "Submitting..." : "Try Again"}
                    </button>
                  ) : null}
                </>
              )}

              {/* MESSAGE */}

              {canMessage && (
                <button
                  type="button"
                  className="message-button"
                  onClick={() => {
                    if (!requireLogin()) {
                      return;
                    }

                    handleMessage();
                  }}
                >
                  <FiMessageSquare />
                  Message
                </button>
              )}

              {/* SHARE */}

              <button
                type="button"
                className="share-whatsapp-button"
                onClick={handleWhatsAppShare}
              >
                <FiShare2 />
                Share on WhatsApp
              </button>

              <button
                type="button"
                className="copy-link-button"
                onClick={handleCopyLink}
              >
                <FiCopy />
                Copy Link
              </button> 
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          DEPARTMENT HANDOVER CONFIRMATION MODAL
          ===================================================== */}

      {showHandoverModal && (
        <div
          className="confirmation-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeHandoverModal();
            }
          }}
        >
          <div
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="handover-title"
          >
            <button
              type="button"
              className="confirmation-modal-close"
              onClick={closeHandoverModal}
              disabled={handoverLoading}
              aria-label="Close"
            >
              <FiX />
            </button>

            <div className="confirmation-modal-icon">
              <FiPackage />
            </div>

            <h2 id="handover-title">Hand over item?</h2>

            <p className="confirmation-modal-message">
              Are you sure you want to hand over <strong>{item.title}</strong>{" "}
              to the Lost & Found Department?
            </p>

            <p className="confirmation-modal-note">
              The department will review and confirm the handover. The item's
              location will change to the Lost & Found Department only after the
              department confirms receipt.
            </p>

            <div className="confirmation-modal-actions">
              <button
                type="button"
                className="confirmation-modal-cancel"
                onClick={closeHandoverModal}
                disabled={handoverLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirmation-modal-confirm"
                onClick={handleDepartmentHandover}
                disabled={handoverLoading}
              >
                <FiCheckCircle />

                {handoverLoading ? "Submitting..." : "Hand over to Department"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          REPORT FOUND CONFIRMATION MODAL
          ===================================================== */}

      {showReportFoundModal && (
        <div
          className="report-found-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowReportFoundModal(false);
            }
          }}
        >
          <div
            className="report-found-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-found-title"
          >
            <button
              type="button"
              className="report-found-close"
              onClick={() => setShowReportFoundModal(false)}
              aria-label="Close"
            >
              <FiX />
            </button>

            <div className="report-found-icon">
              <FiCheckCircle />
            </div>

            <h2 id="report-found-title">Report this item as found?</h2>

            <p>
              If you have found this item, the person who reported it will be
              notified and you will be able to message each other.
            </p>

            <div className="report-found-actions">
              <button
                type="button"
                className="report-found-cancel"
                onClick={() => setShowReportFoundModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="report-found-confirm"
                onClick={() => {
                  setShowReportFoundModal(false);

                  handleReportFound();
                }}
                disabled={reportingFound}
              >
                {reportingFound ? "Reporting..." : "Yes, I Found It"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClaimForm && (
        <ClaimForm
          itemId={item._id}
          itemTitle={item.title}
          onClose={() => setShowClaimForm(false)}
          onSuccess={handleClaimSuccess}
        />
      )}
    </main>
  );
};

export default ItemDetails;
