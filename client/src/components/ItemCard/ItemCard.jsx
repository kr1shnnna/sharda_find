import {
  FiMapPin,
  FiCalendar,
  FiEye,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import "./ItemCard.css";

const ItemCard = ({ item }) => {
  const isLost = item.type === "lost";

  return (
    <article className="item-card">

      {/* Image */}
      <div className="item-card-image">
        <img
          src={item.image}
          alt={item.title}
        />

        <span
          className={`item-type-badge ${
            isLost ? "lost" : "found"
          }`}
        >
          {isLost ? "Lost" : "Found"}
        </span>
      </div>

      {/* Content */}
      <div className="item-card-content">

        <h3 className="item-card-title">
          {item.title}
        </h3>

        <div className="item-card-info">

          <div className="item-info">
            <FiMapPin />
            <span>{item.location}</span>
          </div>

          <div className="item-info">
            <FiCalendar />
            <span>{item.date}</span>
          </div>

        </div>

        <div className="item-card-footer">

          <span className="item-category">
            {item.category}
          </span>

          <Link
            to={`/items/${item.id}`}
            className="item-view-button"
          >
            <FiEye />
            View
          </Link>

        </div>

      </div>
    </article>
  );
};

export default ItemCard;