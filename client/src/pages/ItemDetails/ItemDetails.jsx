import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

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

  const [item, setItem] = useState(null);
  const [eligibleClaim, setEligibleClaim] = useState(null);

  const [selectedImage, setSelectedImage] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reportingFound, setReportingFound] =
    useState(false);

  const [showReportFoundModal, setShowReportFoundModal] =
    useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/items/${id}`,
        );

        setItem(response.data.item);

        setEligibleClaim(
          response.data.eligibleClaim || null,
        );

        setSelectedImage(0);
      } catch (error) {
        console.error(
          "Error fetching item:",
          error,
        );

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

    if (
      Number.isNaN(
        formattedDate.getTime(),
      )
    ) {
      return "Date unavailable";
    }

    return formattedDate.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  };

  const handleReportFound = async () => {
    if (
      !item?._id ||
      item.type !== "lost"
    ) {
      return;
    }

    try {
      setReportingFound(true);

      await api.post(
        `/items/${item._id}/report-found`,
      );

      /*
       * Fetch the item again so the frontend
       * gets the latest foundBy information.
       */
      const response = await api.get(
        `/items/${item._id}`,
      );

      setItem(response.data.item);

      setEligibleClaim(
        response.data.eligibleClaim || null,
      );

      toast.success(
        "Item reported successfully. The owner has been notified.",
      );
    } catch (error) {
      console.error(
        "Report found error:",
        error,
      );

      const message =
        error.response?.data?.message ||
        "Unable to report this item as found.";

      toast.error(message);
    } finally {
      setReportingFound(false);
    }
  };

  const handleMessage = async () => {
    if (!item?._id) {
      return;
    }

    try {
      const response = await api.get(
        `/messages/conversation/${item._id}`,
      );

      const conversation =
        response.data?.conversation;

      if (conversation?._id) {
        navigate(
          `/messages/${conversation._id}`,
        );
      }
    } catch (error) {
      console.error(
        "Open conversation error:",
        error,
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to open this conversation.",
      );
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

            <p>
              {error ||
                "This item could not be found."}
            </p>

            <Link
              to="/browse"
              className="back-to-browse"
            >
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
    Array.isArray(item.images) &&
    item.images.length > 0
      ? item.images
          .map((image) => image?.url)
          .filter(Boolean)
      : [FALLBACK_IMAGE];

  const mainImage =
    images[selectedImage] ||
    FALLBACK_IMAGE;

  const isLost = item.type === "lost";

  const hasMultipleImages =
    images.length > 1;

  const statusLabel =
    statusLabels[item.status] ||
    item.status ||
    "Active";

  const categoryLabel =
    categoryLabels[item.category] ||
    item.category ||
    "Other";

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
    item.itemLocation !==
      "lost-found-department" &&
    (
      (isLost &&
        Boolean(item.foundBy)) ||
      (!isLost &&
        Boolean(
          eligibleClaim?.claimant,
        ))
    );

  const goToPreviousImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setSelectedImage((currentIndex) =>
      currentIndex === 0
        ? images.length - 1
        : currentIndex - 1,
    );
  };

  const goToNextImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setSelectedImage((currentIndex) =>
      currentIndex === images.length - 1
        ? 0
        : currentIndex + 1,
    );
  };

  const handleImageError = (event) => {
    event.currentTarget.src =
      FALLBACK_IMAGE;
  };

  return (
    <main className="item-details-page">
      <div className="item-details-container">

        {/* BACK LINK */}

        <Link
          to="/browse"
          className="details-back-link"
        >
          <FiArrowLeft />
          Back to Browse
        </Link>

        <div className="item-details-card">

          {/* IMAGE GALLERY */}

          <div className="item-details-gallery">

            <div className="item-details-image">
              <img
                src={mainImage}
                alt={`${item.title} ${
                  selectedImage + 1
                }`}
                onError={handleImageError}
              />

              <span
                className={`details-type-badge ${
                  isLost
                    ? "lost"
                    : "found"
                }`}
              >
                {isLost
                  ? "Lost"
                  : "Found"}
              </span>

              <button
                type="button"
                className="gallery-arrow gallery-arrow-left"
                onClick={
                  goToPreviousImage
                }
                disabled={
                  !hasMultipleImages
                }
                aria-label="Previous image"
              >
                <FiChevronLeft />
              </button>

              <button
                type="button"
                className="gallery-arrow gallery-arrow-right"
                onClick={
                  goToNextImage
                }
                disabled={
                  !hasMultipleImages
                }
                aria-label="Next image"
              >
                <FiChevronRight />
              </button>
            </div>

            {/* THUMBNAILS */}

            {hasMultipleImages && (
              <div className="item-image-thumbnails">
                {images.map(
                  (image, index) => (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      className={`item-image-thumbnail ${
                        selectedImage ===
                        index
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedImage(
                          index,
                        )
                      }
                    >
                      <img
                        src={image}
                        alt={`${item.title} thumbnail ${
                          index + 1
                        }`}
                        onError={
                          handleImageError
                        }
                      />
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          {/* ITEM CONTENT */}

          <div className="item-details-content">

            <div className="details-heading">
              <div>
                <span className="details-category">
                  {categoryLabel}
                </span>

                <h1>{item.title}</h1>
              </div>

              <span
                className={`details-status ${
                  item.status
                }`}
              >
                {statusLabel}
              </span>
            </div>

            <p className="details-description">
              {item.description}
            </p>

            {/* ITEM INFORMATION */}

            <div className="details-info">

              <div className="details-info-item">
                <div className="details-info-icon">
                  <FiMapPin />
                </div>

                <div>
                  <span>
                    {isLost
                      ? "Lost at"
                      : "Found at"}
                  </span>

                  <strong>
                    {item.location ||
                      "Location unavailable"}
                  </strong>
                </div>
              </div>

              <div className="details-info-item">
                <div className="details-info-icon">
                  <FiCalendar />
                </div>

                <div>
                  <span>Date</span>

                  <strong>
                    {formatDate(
                      item.itemDate,
                    )}
                  </strong>
                </div>
              </div>

              <div className="details-info-item">
                <div className="details-info-icon">
                  <FiUser />
                </div>

                <div>
                  <span>
                    {isLost
                      ? "Reported by"
                      : "Found by"}
                  </span>

                  <strong>
                    {item.reportedBy?.name ||
                      "Sharda Student"}
                  </strong>
                </div>
              </div>

            </div>

            {/* CURRENT ITEM LOCATION */}

            {!isLost &&
              item.itemLocation && (
                <div className="pickup-box">
                  <FiCheckCircle />

                  <div>
                    <span>
                      Current location
                    </span>

                    <strong>
                      {item.itemLocation ===
                      "lost-found-department"
                        ? "Lost & Found Department"
                        : "With finder"}
                    </strong>
                  </div>
                </div>
              )}

            {/* ACTIONS */}

            <div className="details-actions">

              <button
                type="button"
                className="claim-button"
                disabled={
                  item.status !==
                    "active" ||
                  reportingFound ||
                  Boolean(item.foundBy)
                }
                onClick={() => {
                  if (
                    isLost &&
                    !item.foundBy
                  ) {
                    setShowReportFoundModal(
                      true,
                    );
                  }
                }}
              >
                <FiCheckCircle />

                {item.foundBy
                  ? "Already Reported"
                  : item.status !==
                      "active"
                    ? "Item Unavailable"
                    : isLost
                      ? reportingFound
                        ? "Reporting..."
                        : "Report Found"
                      : "Claim This Item"}
              </button>

              {canMessage && (
                <button
                  type="button"
                  className="message-button"
                  onClick={
                    handleMessage
                  }
                >
                  <FiMessageSquare />
                  Message
                </button>
              )}

            </div>

          </div>
        </div>
      </div>

      {/* REPORT FOUND CONFIRMATION MODAL */}

      {showReportFoundModal && (
        <div
          className="report-found-overlay"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowReportFoundModal(
                false,
              );
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
              onClick={() =>
                setShowReportFoundModal(
                  false,
                )
              }
              aria-label="Close"
            >
              <FiX />
            </button>

            <div className="report-found-icon">
              <FiCheckCircle />
            </div>

            <h2 id="report-found-title">
              Report this item as found?
            </h2>

            <p>
              If you have found this item,
              the person who reported it will
              be notified and you will be able
              to message each other.
            </p>

            <div className="report-found-actions">

              <button
                type="button"
                className="report-found-cancel"
                onClick={() =>
                  setShowReportFoundModal(
                    false,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="report-found-confirm"
                onClick={() => {
                  setShowReportFoundModal(
                    false,
                  );

                  handleReportFound();
                }}
                disabled={reportingFound}
              >
                {reportingFound
                  ? "Reporting..."
                  : "Yes, I Found It"}
              </button>

            </div>

          </div>
        </div>
      )}
    </main>
  );
};

export default ItemDetails;
