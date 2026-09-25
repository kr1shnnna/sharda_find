import { FaLeaf } from "react-icons/fa";
import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">

        <Link to="/" className="navbar-logo">
          <span className="logo-icon">
            <FaLeaf />
          </span>

          <span>ShardaFind</span>
        </Link>

        <div className="navbar-links">
          <Link to="/browse">Browse</Link>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/about">About</Link>
        </div>

        <div className="navbar-actions">
          <Link to="/login" className="login-button">
            Login
          </Link>

          <Link to="/register" className="register-button">
            Register
          </Link>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;