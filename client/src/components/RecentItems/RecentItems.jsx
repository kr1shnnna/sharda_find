import { FiArrowRight, FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";

import ItemCard from "../ItemCard/ItemCard";
import placeholderItems from "../../data/placeholderItems";

import "./RecentItems.css";

const RecentItems = () => {
  const items = placeholderItems;

  return (
    <section className="recent-items">
      <div className="recent-items-container">

        {/* Section heading */}
        <div className="recent-items-header">
          <div>
            <p className="section-label">
              Recently reported
            </p>

            <h2>
              Recent Lost & Found
            </h2>

            <p className="section-description">
              Browse the latest items reported by Sharda University students.
            </p>
          </div>

          <Link
            to="/browse"
            className="view-all-link"
          >
            View all
            <FiArrowRight />
          </Link>
        </div>

        {/* Items / Empty state */}
        {items.length > 0 ? (
          <div className="recent-items-grid">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
              />
            ))}
          </div>
        ) : (
          <div className="recent-items-empty">
            <div className="empty-icon">
              <FiSearch />
            </div>

            <h3>
              No items reported yet
            </h3>

            <p>
              There are no recent lost or found items to display.
              Check back later or report an item yourself.
            </p>

            <Link
              to="/browse"
              className="empty-action"
            >
              Browse all items
              <FiArrowRight />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
};

export default RecentItems;