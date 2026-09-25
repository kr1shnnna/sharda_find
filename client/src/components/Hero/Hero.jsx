import { FiSearch, FiPlusCircle, FiPackage } from "react-icons/fi";
import { Link } from "react-router-dom";
import shardaUniversity from "../../assets/images/sharda-university.jpg";
import "./Hero.css";

const Hero = () => {
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
          <div className="hero-search">
            <FiSearch className="search-icon" />

            <input
              type="text"
              placeholder="Search items, locations, categories..."
            />

            <button className="search-button">
              <FiSearch />
            </button>
          </div>

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