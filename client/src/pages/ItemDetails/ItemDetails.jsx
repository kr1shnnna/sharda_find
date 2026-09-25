import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import {
  FiArrowLeft,
  FiMapPin,
  FiCalendar,
  FiUser,
  FiPackage,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

import "./ItemDetails.css";

const ItemDetails = () => {
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `http://localhost:5000/api/items/${id}`
        );

        setItem(response.data.item);
        setSelectedImage(0);
      } catch (error) {
        console.error("Error fetching item:", error);

        setError(
          "Unable to load this item. It may no longer exist."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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

            <h2>
              Item not found
            </h2>

            <p>
              {error || "This item could not be found."}
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

  const images = item.images?.length
    ? item.images
    : [
        "https://placehold.co/900x650/f1f5f9/64748b?text=No+Image",
      ];

  const mainImage = images[selectedImage];

  const isLost = item.type === "lost";

  const hasMultipleImages = images.length > 1;

  const goToPreviousImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setSelectedImage((currentIndex) =>
      currentIndex === 0
        ? images.length - 1
        : currentIndex - 1
    );
  };

  const goToNextImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setSelectedImage((currentIndex) =>
      currentIndex === images.length - 1
        ? 0
        : currentIndex + 1
    );
  };

  return (
    <main className="item-details-page">
      <div className="item-details-container">

        <Link
          to="/browse"
          className="details-back-link"
        >
          <FiArrowLeft />
          Back to Browse
        </Link>

        <div className="item-details-card">

          {/* Image Gallery */}

          <div className="item-details-gallery">

            <div className="item-details-image">

              <img
                src={mainImage}
                alt={`${item.title} ${selectedImage + 1}`}
              />

              <span
                className={`details-type-badge ${
                  isLost ? "lost" : "found"
                }`}
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

            {images.length > 1 && (
              <div className="item-image-thumbnails">

                {images.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    className={`item-image-thumbnail ${
                      selectedImage === index
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedImage(index)
                    }
                  >
                    <img
                      src={image}
                      alt={`${item.title} thumbnail ${
                        index + 1
                      }`}
                    />
                  </button>
                ))}

              </div>
            )}

          </div>

          {/* Item Content */}

          <div className="item-details-content">

            <div className="details-heading">

              <div>
                <span className="details-category">
                  {item.category}
                </span>

                <h1>
                  {item.title}
                </h1>
              </div>

              <span
                className={`details-status ${
                  item.status
                }`}
              >
                {item.status}
              </span>

            </div>

            <p className="details-description">
              {item.description}
            </p>

            <div className="details-info">

              <div className="details-info-item">

                <div className="details-info-icon">
                  <FiMapPin />
                </div>

                <div>
                  <span>
                    Location
                  </span>

                  <strong>
                    {item.location}
                  </strong>
                </div>

              </div>

              <div className="details-info-item">

                <div className="details-info-icon">
                  <FiCalendar />
                </div>

                <div>
                  <span>
                    Date
                  </span>

                  <strong>
                    {formatDate(item.itemDate)}
                  </strong>
                </div>

              </div>

              <div className="details-info-item">

                <div className="details-info-icon">
                  <FiUser />
                </div>

                <div>
                  <span>
                    Reported by
                  </span>

                  <strong>
                    {item.reportedBy?.name ||
                      "Sharda Student"}
                  </strong>
                </div>

              </div>

            </div>

            {item.pickupLocation && (
              <div className="pickup-box">

                <FiCheckCircle />

                <div>
                  <span>
                    Pickup location
                  </span>

                  <strong>
                    {item.pickupLocation}
                  </strong>
                </div>

              </div>
            )}

            <div className="details-actions">

              <button
                type="button"
                className="claim-button"
              >
                <FiCheckCircle />
                Claim This Item
              </button>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
};

export default ItemDetails;
