import {
  FaLeaf,
  FaGithub,
  FaInstagram,
  FaLinkedin,
} from "react-icons/fa";
import { Link } from "react-router-dom";

import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">

        <div className="footer-main">

          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="footer-logo-icon">
                <FaLeaf />
              </span>

              <span>ShardaFind</span>
            </Link>

            <p>
              A simple and trusted lost & found platform
              built for the Sharda University community.
            </p>
          </div>

          <div className="footer-column">
            <h3>Explore</h3>

            <Link to="/browse">
              Browse Items
            </Link>

            <Link to="/#how-it-works">
              How It Works
            </Link>

            <Link to="/#about">
              About
            </Link>
          </div>

          <div className="footer-column">
            <h3>Report</h3>

            <Link to="/report-lost">
              Report Lost Item
            </Link>

            <Link to="/report-found">
              Report Found Item
            </Link>

            <Link to="/login">
              Login
            </Link>
          </div>

          <div className="footer-column">
            <h3>Connect</h3>

            <div className="footer-socials">
              <a
                href="#"
                aria-label="GitHub"
              >
                <FaGithub />
              </a>

              <a
                href="#"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>

              <a
                href="#"
                aria-label="LinkedIn"
              >
                <FaLinkedin />
              </a>
            </div>
          </div>

        </div>

        <div className="footer-bottom">
          <p>
            © 2026 ShardaFind. Built for the Sharda University community.
          </p>

        </div>

      </div>
    </footer>
  );
};

export default Footer;
