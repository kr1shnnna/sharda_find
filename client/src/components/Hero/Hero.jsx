import { useState } from "react";
import {
  FiSearch,
  FiPlusCircle,
  FiPackage,
} from "react-icons/fi";

import { Link, useNavigate } from "react-router-dom";

import shardaUniversity from "../../assets/images/sharda-university.jpg";

import "./Hero.css";

const Hero = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (event) => {
    event.preventDefault();

    const trimmedSearch = searchTerm.trim();

    if (!trimmedSearch) {
      navigate("/browse");
      return;
    }

    navigate(`/browse?search=${encodeURIComponent(trimmedSearch)}`);
  };

  return (
    <section className="hero">
      {/* University image */}

      <div className="hero-image">
        <img
          src={shardaUniversity}
          alt="Sharda University campus"
        />
      </div>

      {/* White fade over the image */}

      <div className="hero-image-fade"></div>

      <div className="hero-container">
        <div className="hero-content">
          <p className="hero-tagline">
            Sharda University Lost & Found
          </p>

          <h1>
            Lost something?
            <span>Find it here.</span>
          </h1>

          <p className="hero-description">
            A simple and trusted platform for Sharda University
            students to report and find lost & found items.
          </p>

          {/* Search */}

          <form
            className="hero-search"
            onSubmit={handleSearch}
          >
            <input
              type="text"
              placeholder="Search items, locations, categories..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              aria-label="Search lost and found items"
            />

            <button
              type="submit"
              className="search-button"
              aria-label="Search"
            >
              <FiSearch />
            </button>
          </form>

          {/* Action buttons */}

          <div className="hero-actions">
            <Link
              to="/report-lost"
              className="hero-button primary"
            >
              <FiPlusCircle />
              Report Lost Item
            </Link>

            <Link
              to="/report-found"
              className="hero-button secondary"
            >
              <FiPackage />
              Report Found Item
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;