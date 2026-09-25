import {
  FiPlusCircle,
  FiPackage,
} from "react-icons/fi";
import { Link } from "react-router-dom";

import "./CTA.css";

const CTA = () => {
  return (
    <section className="cta">
      <div className="cta-container">

        <div className="cta-content">
          <p className="cta-label">
            Help your campus community
          </p>

          <h2>
            Lost something?
            <span>Let ShardaFind help.</span>
          </h2>

          <p className="cta-description">
            Report a lost or found item and help connect
            it with the right person at Sharda University.
          </p>

          <div className="cta-actions">
            <Link
              to="/report-lost"
              className="cta-button primary"
            >
              <FiPlusCircle />
              Report Lost Item
            </Link>

            <Link
              to="/report-found"
              className="cta-button secondary"
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

export default CTA;