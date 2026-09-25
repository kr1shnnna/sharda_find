import { FaLeaf } from "react-icons/fa";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSectionClick = (sectionId) => {
    if (location.pathname === "/") {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
      });

      return;
    }

    navigate(`/#${sectionId}`);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">

        <Link
          to="/"
          className="navbar-logo"
        >
          <span className="logo-icon">
            <FaLeaf />
          </span>

          <span>ShardaFind</span>
        </Link>

        <div className="navbar-links">

          <Link to="/browse">
            Browse
          </Link>

          <button
            type="button"
            onClick={() =>
              handleSectionClick("how-it-works")
            }
          >
            How it works
          </button>

          <button
            type="button"
            onClick={() =>
              handleSectionClick("about")
            }
          >
            About
          </button>

        </div>

        <div className="navbar-actions">

          <Link
            to="/login"
            className="login-button"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="register-button"
          >
            Register
          </Link>

        </div>

      </div>
    </nav>
  );
};

export default Navbar;
