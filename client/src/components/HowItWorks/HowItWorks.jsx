import {
  FiEdit3,
  FiSearch,
  FiCheckCircle,
} from "react-icons/fi";

import "./HowItWorks.css";

const HowItWorks = () => {
  const steps = [
    {
      id: 1,
      icon: FiEdit3,
      title: "Report an Item",
      description:
        "Tell us what you lost or found by adding a few details about the item.",
    },
    {
      id: 2,
      icon: FiSearch,
      title: "Find a Match",
      description:
        "Browse or search reported items to find something that matches your description.",
    },
    {
      id: 3,
      icon: FiCheckCircle,
      title: "Connect & Return",
      description:
        "Verify the item, complete the claim process, and safely get it back.",
    },
  ];

  return (
    <section  id="how-it-works" className="how-it-works">
      <div className="how-it-works-container">

        <div className="how-it-works-header">
          <p className="section-label">
            Simple process
          </p>

          <h2>
            How It Works
          </h2>

          <p className="section-description">
            A simple process to help you find or return lost items
            around Sharda University.
          </p>
        </div>

        <div className="how-it-works-grid">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                className="how-it-works-card"
                key={step.id}
              >
                <div className="step-top">
                  <div className="step-icon">
                    <Icon />
                  </div>

                  <span className="step-number">
                    0{step.id}
                  </span>
                </div>

                <h3>
                  {step.title}
                </h3>

                <p>
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
