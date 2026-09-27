import { useEffect, useState } from "react";

import {
  FiArrowRight,
  FiSearch,
} from "react-icons/fi";

import { Link } from "react-router-dom";

import ItemCard from "../ItemCard/ItemCard";

import api from "../../api/axios";

import "./RecentItems.css";

const RecentItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentItems = async () => {
      try {
        setLoading(true);

        const response = await api.get("/items");

        const fetchedItems =
          response.data?.items || [];

        /*
         * The backend already returns items
         * newest first.
         *
         * We only need the first 6 for
         * the homepage.
         */
        setItems(fetchedItems.slice(0, 6));
      } catch (error) {
        console.error(
          "Unable to fetch recent items:",
          error
        );

        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentItems();
  }, []);

  return (
    <section className="recent-items">
      <div className="recent-items-container">
        {/* Header */}
        <div className="recent-items-header">
          <div>
            <p className="section-label">
              Recently reported
            </p>

            <h2>
              Recent Lost & Found
            </h2>

            <p className="section-description">
              Browse the latest items reported by
              Sharda University students.
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

        {/* Loading State */}
        {loading ? (
          <div className="recent-items-grid">
            {[1, 2, 3].map((item) => (
              <div
                className="item-card-skeleton"
                key={item}
              >
                <div className="skeleton-image"></div>

                <div className="skeleton-content">
                  <div className="skeleton-title"></div>

                  <div className="skeleton-info"></div>

                  <div className="skeleton-info short"></div>

                  <div className="skeleton-footer">
                    <div className="skeleton-category"></div>

                    <div className="skeleton-button"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          /* Items */
          <div className="recent-items-grid">
            {items.map((item) => (
              <ItemCard
                key={item._id}
                item={item}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="recent-items-empty">
            <div className="empty-icon">
              <FiSearch />
            </div>

            <h3>
              No items reported yet
            </h3>

            <p>
              There are no recent lost or found
              items to display. Check back later
              or report an item yourself.
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
