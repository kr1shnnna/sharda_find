import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import api from "../../api/axios";

import {
  FiSearch,
  FiSliders,
  FiChevronDown,
} from "react-icons/fi";

import ItemCard from "../../components/ItemCard/ItemCard";

import "./Browse.css";

const Browse = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

 
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [sort, setSort] = useState("latest");

  const [search,setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError("");

        
        const response = await api.get("/items");

        setItems(response.data.items || []);
      } catch (error) {
        console.error("Error fetching items:", error);

        setError(
          "Unable to load items. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const filteredItems = items
    .filter((item) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        item.title?.toLowerCase().includes(searchValue) ||
        item.location?.toLowerCase().includes(searchValue) ||
        item.category?.toLowerCase().includes(searchValue);

      const matchesType =
        type === "all" || item.type === type;

      const matchesCategory =
        category === "all" ||
        item.category === category;

      const matchesLocation =
        location === "all" ||
        item.location === location;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesLocation
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.itemDate);
      const dateB = new Date(b.itemDate);

      return sort === "latest"
        ? dateB - dateA
        : dateA - dateB;
    });

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
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        {/* Filters */}

        <div className="browse-toolbar">

          <div className="browse-tabs">

            <button
              type="button"
              className={`browse-tab ${
                type === "all" ? "active" : ""
              }`}
              onClick={() => setType("all")}
            >
              All
            </button>

            <button
              type="button"
              className={`browse-tab ${
                type === "lost" ? "active" : ""
              }`}
              onClick={() => setType("lost")}
            >
              Lost
            </button>

            <button
              type="button"
              className={`browse-tab ${
                type === "found" ? "active" : ""
              }`}
              onClick={() => setType("found")}
            >
              Found
            </button>

          </div>

          <div className="browse-filter-controls">

            <div className="filter-select">
              <FiSliders />

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
              >
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

              <select
                value={location}
                onChange={(event) =>
                  setLocation(event.target.value)
                }
              >
                <option value="all">
                  All Locations
                </option>

                <option value="Block 3">
                  Block 3
                </option>

                <option value="Academic Block">
                  Academic Block
                </option>

                <option value="University Library">
                  University Library
                </option>

                <option value="Hostel">
                  Hostel
                </option>

                <option value="Cafeteria">
                  Cafeteria
                </option>

                <option value="Parking">
                  Parking
                </option>
              </select>

              <FiChevronDown className="select-arrow" />
            </div>

            <div className="filter-select">

              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value)
                }
              >
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

        {!loading && !error && (
          <div className="browse-results-header">
            <p>
              <strong>
                {filteredItems.length}
              </strong>{" "}
              {filteredItems.length === 1
                ? "item"
                : "items"}{" "}
              found
            </p>
          </div>
        )}

        {/* Loading */}

        {loading && (
          <div className="browse-loading">
            {[1, 2, 3].map((item) => (
              <div
                className="browse-loading-card"
                key={item}
              >
                <div className="browse-loading-image"></div>

                <div className="browse-loading-content">
                  <div className="browse-loading-line"></div>

                  <div className="browse-loading-line short"></div>

                  <div className="browse-loading-line short"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}

        {!loading && error && (
          <div className="browse-empty">
            <div className="browse-empty-icon">
              <FiSearch />
            </div>

            <h3>
              Something went wrong
            </h3>

            <p>
              {error}
            </p>
          </div>
        )}

        {/* Items */}

        {!loading &&
          !error &&
          filteredItems.length > 0 && (
            <div className="browse-grid">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                />
              ))}
            </div>
          )}

        {/* Empty */}

        {!loading &&
          !error &&
          filteredItems.length === 0 && (
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
