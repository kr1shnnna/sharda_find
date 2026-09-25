import {
  FiSearch,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import "./About.css";

const About = () => {
  return (
    <section
      id="about"
      className="about"
    >
      <div className="about-container">

        <div className="about-content">

          <div className="about-text">
            <p className="about-label">
              About ShardaFind
            </p>

            <h2>
              Making Lost & Found
              <span>simpler for students.</span>
            </h2>

            <p className="about-description">
              ShardaFind is a dedicated Lost & Found platform
              built for the Sharda University community. It
              helps students report lost or found belongings,
              discover matching items, and safely connect with
              the right person.
            </p>

            <p className="about-description">
              Instead of relying only on scattered messages
              and WhatsApp groups, ShardaFind brings reported
              items into one organized place.
            </p>
          </div>

          <div className="about-features">

            <div className="about-feature">
              <div className="about-feature-icon">
                <FiSearch />
              </div>

              <div>
                <h3>
                  Easy to Find
                </h3>

                <p>
                  Search and browse reported items in one place.
                </p>
              </div>
            </div>

            <div className="about-feature">
              <div className="about-feature-icon">
                <FiShield />
              </div>

              <div>
                <h3>
                  Safer Process
                </h3>

                <p>
                  Claims can be verified before an item is returned.
                </p>
              </div>
            </div>

            <div className="about-feature">
              <div className="about-feature-icon">
                <FiUsers />
              </div>

              <div>
                <h3>
                  Built for Students
                </h3>

                <p>
                  Designed around the needs of the Sharda community.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default About;