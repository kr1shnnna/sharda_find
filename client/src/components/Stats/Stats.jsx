import { FiPackage, FiCheckCircle, FiUsers } from "react-icons/fi";
import "./Stats.css";

const Stats = () => {
  const stats = [
    {
      id: 1,
      value: "500+",
      label: "Items Reported",
      icon: FiPackage,
    },
    {
      id: 2,
      value: "320+",
      label: "Items Returned",
      icon: FiCheckCircle,
    },
    {
      id: 3,
      value: "Trusted",
      label: "By Sharda Students",
      icon: FiUsers,
    },
  ];

  return (
    <section className="stats">
      <div className="stats-container">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="stat-item" key={stat.id}>
              <div className="stat-icon">
                <Icon />
              </div>

              <div className="stat-content">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Stats;
