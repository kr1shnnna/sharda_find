import {
  FiSearch,
  FiSliders,
  FiChevronDown,
} from "react-icons/fi";

import ItemCard from "../../components/ItemCard/ItemCard";
import placeholderItems from "../../data/placeholderItems";

import "./Browse.css";

const Browse = () => {
  const items = placeholderItems;

  return (
    <main className="browse-page">
      <div className="browse-container">

        {/* Header */}

        <div className="browse-header">
          <div>
            <p className="section-label">
              Lost & Found
            </p>

            <h1>
              Browse Items
            </h1>

            <p className="browse-description">
              Find items reported by Sharda University students.
            </p>
          </div>
        </div>

        {/* Search */}

        <div className="browse-search">
          <FiSearch />

          <input
            type="text"
            placeholder="Search items, locations, categories..."
          />
        </div>

        {/* Filters */}

        <div className="browse-toolbar">

          <div className="browse-tabs">
            <button
              type="button"
              className="browse-tab active"
            >
              All
            </button>

            <button
              type="button"
              className="browse-tab"
            >
              Lost
            </button>

            <button
              type="button"
              className="browse-tab"
            >
              Found
            </button>
          </div>

          <div className="browse-filter-controls">

            <div className="filter-select">
              <FiSliders />

              <select defaultValue="all">
                <option value="all">
                  All Categories
                </option>

                <option value="bag">
                  Bags
                </option>

                <option value="electronics">
                  Electronics
                </option>

                <option value="id-card">
                  ID Cards
                </option>

                <option value="documents">
                  Documents
                </option>

                <option value="clothing">
                  Clothing
                </option>

                <option value="keys">
                  Keys
                </option>

                <option value="other">
                  Other
                </option>
              </select>

              <FiChevronDown className="select-arrow" />
            </div>

            <div className="filter-select">
              <select defaultValue="all">
                <option value="all">
                  All Locations
                </option>

                <option value="academic">
                  Academic Block
                </option>

                <option value="library">
                  Library
                </option>

                <option value="hostel">
                  Hostel
                </option>

                <option value="cafeteria">
                  Cafeteria
                </option>

                <option value="parking">
                  Parking
                </option>
              </select>

              <FiChevronDown className="select-arrow" />
            </div>

            <div className="filter-select">
              <select defaultValue="latest">
                <option value="latest">
                  Latest
                </option>

                <option value="oldest">
                  Oldest
                </option>
              </select>

              <FiChevronDown className="select-arrow" />
            </div>

          </div>
        </div>

        {/* Results */}

        <div className="browse-results-header">
          <p>
            <strong>{items.length}</strong> items found
          </p>
        </div>

        {items.length > 0 ? (
          <div className="browse-grid">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
              />
            ))}
          </div>
        ) : (
          <div className="browse-empty">
            <div className="browse-empty-icon">
              <FiSearch />
            </div>

            <h3>
              No items found
            </h3>

            <p>
              Try changing your search or filters.
            </p>
          </div>
        )}

      </div>
    </main>
  );
};

export default Browse;