import { useEffect, useState } from "react";
import axios from "axios";
import { FiSearch, FiSliders } from "react-icons/fi";

import ItemCard from "../../components/ItemCard/ItemCard";

import "./Browse.css";

const Browse = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get("http://localhost:5000/api/items");

        setItems(response.data.items);
      } catch (error) {
        console.error(error);

        setError("Unable to load items. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());

    const matchesType = type === "all" || item.type === type;

    const matchesCategory = category === "all" || item.category === category;

    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <main className="browse-page">
      <div className="browse-container">
        <div className="browse-header">
          <div>
            <p className="section-label">Lost & Found</p>

            <h1>Browse Items</h1>

            <p>Find items reported by Sharda University students.</p>
          </div>
        </div>

        <div className="browse-filters">
          <div className="browse-search">
            <FiSearch />

            <input
              type="text"
              placeholder="Search items or locations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="browse-filter-group">
            <FiSliders />

            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">All Items</option>

              <option value="lost">Lost</option>

              <option value="found">Found</option>
            </select>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All Categories</option>

              <option value="bag">Bags</option>

              <option value="electronics">Electronics</option>

              <option value="id-card">ID Cards</option>

              <option value="documents">Documents</option>

              <option value="clothing">Clothing</option>

              <option value="keys">Keys</option>

              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="browse-loading">
            <div className="browse-spinner"></div>

            <p>Loading items...</p>
          </div>
        ) : error ? (
          <div className="browse-message error">
            <h3>Something went wrong</h3>

            <p>{error}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="browse-message">
            <div className="browse-empty-icon">
              <FiSearch />
            </div>

            <h3>No items found</h3>

            <p>Try changing your search or filters.</p>
          </div>
        ) : (
          <div className="browse-grid">
            {filteredItems.map((item) => (
              <ItemCard
                key={item._id}
                item={{
                  ...item,
                  id: item._id,
                  date: new Date(item.itemDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),

                  image:
                    item.images?.[0] ||
                    "https://placehold.co/800x500/f1f5f9/64748b?text=No+Image",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Browse;
