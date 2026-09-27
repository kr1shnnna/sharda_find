import {
  FiMapPin,
  FiCalendar,
  FiEye,
} from "react-icons/fi";

import { Link } from "react-router-dom";

import "./ItemCard.css";

const ItemCard = ({ item }) => {
  const isLost = item.type === "lost";

  /*
   * Get the first uploaded image.
   *
   * Some items may not have an image, so
   * we provide a fallback.
   */
  const image =
    item.images?.length > 0
      ? item.images[0].url
      : null;

  /*
   * Format the item date.
   *
   * Example:
   * 2026-09-24
   * →
   * 24 Sep 2026
   */
  const formattedDate = item.itemDate
    ? new Date(item.itemDate).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      )
    : "Date unavailable";

  return (
    <article className="item-card">
      {/* Image */}
      <div className="item-card-image">
        {image ? (
          <img
            src={image}
            alt={item.title}
          />
        ) : (
          <div className="item-card-image-placeholder">
            No image available
          </div>
        )}

        <span
          className={`item-type-badge ${
            isLost ? "lost" : "found"
          }`}
        >
          {isLost ? "Lost" : "Found"}
        </span>
      </div>

      {/* Content */}
      <div className="item-card-content">
        <h3 className="item-card-title">
          {item.title}
        </h3>

        <div className="item-card-info">
          <div className="item-info">
            <FiMapPin />
            <span>{item.location}</span>
          </div>

          <div className="item-info">
            <FiCalendar />
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="item-card-footer">
          <span className="item-category">
            {item.category}
          </span>

          <Link
            to={`/items/${item._id}`}
            className="item-view-button"
          >
            <FiEye />
            View
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ItemCard;
