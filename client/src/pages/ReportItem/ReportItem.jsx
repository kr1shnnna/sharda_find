import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiImage,
  FiMapPin,
  FiPackage,
  FiTrash2,
} from "react-icons/fi";

import api from "../../api/axios";

import "./ReportItem.css";

const categories = [
  { value: "electronics", label: "Electronics" },
  { value: "id-card", label: "ID Card" },
  { value: "documents", label: "Documents" },
  { value: "keys", label: "Keys" },
  { value: "wallet", label: "Wallet" },
  { value: "bag", label: "Bag" },
  { value: "bottle", label: "Bottle" },
  { value: "clothing", label: "Clothing" },
  { value: "accessories", label: "Accessories" },
  { value: "other", label: "Other" },
];

const ReportItem = ({ type = "lost" }) => {
  const navigate = useNavigate();

  const isLost = type === "lost";

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    itemDate: "",
  });

  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * Create temporary preview URLs whenever images change.
   */
  const imagePreviews = useMemo(
    () =>
      images.map((image) => ({
        file: image,
        url: URL.createObjectURL(image),
      })),
    [images],
  );

  /*
   * Clean up preview URLs when component unmounts
   * or when images change.
   */
  useEffect(() => {
    const previewUrls = imagePreviews.map((preview) => preview.url);

    return () => {
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setServerError("");
  };

  const handleImageChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    if (selectedFiles.length === 0) {
      return;
    }

    setErrors((previous) => ({
      ...previous,
      images: "",
    }));

    setServerError("");

    const remainingSlots = 3 - images.length;

    const filesToAdd = selectedFiles.slice(0, remainingSlots);

    if (filesToAdd.length < selectedFiles.length) {
      setErrors((previous) => ({
        ...previous,
        images: "You can upload a maximum of 3 images.",
      }));
    }

    setImages((previous) => [...previous, ...filesToAdd]);

    /*
     * Reset the input so the same file can be selected
     * again after removing it.
     */
    event.target.value = "";
  };

  const removeImage = (indexToRemove) => {
    setImages((previous) =>
      previous.filter((_, index) => index !== indexToRemove),
    );

    setErrors((previous) => ({
      ...previous,
      images: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    const title = formData.title.trim();
    const description = formData.description.trim();
    const location = formData.location.trim();

    if (!title) {
      newErrors.title = "Item title is required.";
    }

    if (!description) {
      newErrors.description = "Item description is required.";
    }

    if (!formData.category) {
      newErrors.category = "Please select a category.";
    }

    if (!location) {
      newErrors.location = "Location is required.";
    }

    if (!formData.itemDate) {
      newErrors.itemDate = "Please select the date.";
    }
    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setServerError("");
    setSuccessMessage("");

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      /*
       * The backend expects multipart/form-data
       * because it receives files through req.files.
       */
      const requestData = new FormData();

      requestData.append("title", formData.title.trim());

      requestData.append("description", formData.description.trim());

      requestData.append("type", type);

      requestData.append("category", formData.category);

      requestData.append("location", formData.location.trim());

      requestData.append("itemDate", formData.itemDate);

      /*
       * Only send itemLocation for found items.
       * The backend sets it to null for lost items.
       */
      if (!isLost) {
        requestData.append("itemLocation", "with-finder");
      }

      /*
       * The backend route uses:
       *
       * upload.array("images", 3)
       *
       * Therefore every image must use the
       * field name "images".
       */
      images.forEach((image) => {
        requestData.append("images", image);
      });

      const response = await api.post("/items", requestData);

      setSuccessMessage(response.data?.message || "Item posted successfully.");

      /*
       * Backend returns:
       *
       * {
       *   message: "...",
       *   item: {...}
       * }
       *
       * Use the newly created item's _id
       * to open its details page.
       */
      const createdItem = response.data?.item;

      if (createdItem?._id) {
        setTimeout(() => {
          navigate(`/items/${createdItem._id}`);
        }, 1000);

        return;
      }

      /*
       * Fallback in case the backend somehow
       * doesn't return the created item.
       */
      setTimeout(() => {
        navigate("/browse");
      }, 1000);
    } catch (error) {
      console.error("Create item error:", error);

      setServerError(
        error.response?.data?.message ||
          "Unable to post item. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="report-item-page">
      <div className="report-item-container">
        <Link to="/" className="report-back-link">
          <FiArrowLeft />
          Back to home
        </Link>

        <div className="report-item-header">
          <div className="report-item-icon">
            <FiPackage />
          </div>

          <p className="report-item-label">ShardaFind</p>

          <h1>{isLost ? "Report a lost item" : "Report a found item"}</h1>

          <p>
            {isLost
              ? "Tell us about the item you lost so others can help you find it."
              : "Tell us about the item you found so its owner can identify it."}
          </p>
        </div>

        {serverError && (
          <div className="report-server-error">
            <p>{serverError}</p>
          </div>
        )}

        {successMessage && (
          <div className="report-success-message">
            <FiCheckCircle />
            <p>{successMessage}</p>
          </div>
        )}

        <form className="report-item-form" onSubmit={handleSubmit}>
          {/* ITEM INFORMATION */}

          <section className="form-section">
            <div className="form-section-header">
              <h2>Item Information</h2>

              <p>Provide the basic details about the item.</p>
            </div>

            <div className="form-grid">
              {/* TITLE */}

              <div className="form-group form-group-full">
                <label htmlFor="title">Item Title</label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="e.g. Black Backpack"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={loading}
                />

                {errors.title && <p className="field-error">{errors.title}</p>}
              </div>

              {/* DESCRIPTION */}

              <div className="form-group form-group-full">
                <label htmlFor="description">Description</label>

                <textarea
                  id="description"
                  name="description"
                  rows="5"
                  placeholder="Describe the item, including color, brand, identifying marks, contents, etc."
                  value={formData.description}
                  onChange={handleChange}
                  disabled={loading}
                />

                {errors.description && (
                  <p className="field-error">{errors.description}</p>
                )}
              </div>

              {/* CATEGORY */}

              <div className="form-group">
                <label htmlFor="category">Category</label>

                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select category</option>

                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>

                {errors.category && (
                  <p className="field-error">{errors.category}</p>
                )}
              </div>

              {/* DATE */}

              <div className="form-group">
                <label htmlFor="itemDate">Date</label>

                <div className="input-with-icon">
                  <FiCalendar />

                  <input
                    id="itemDate"
                    name="itemDate"
                    type="date"
                    value={formData.itemDate}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                {errors.itemDate && (
                  <p className="field-error">{errors.itemDate}</p>
                )}
              </div>

              {/* LOCATION */}

              <div className="form-group form-group-full">
                <label htmlFor="location">
                  {isLost ? "Where did you lose it?" : "Where did you find it?"}
                </label>

                <div className="input-with-icon">
                  <FiMapPin />

                  <input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="e.g. Library, Block 3"
                    value={formData.location}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                {errors.location && (
                  <p className="field-error">{errors.location}</p>
                )}
              </div>
            </div>
          </section>

          {/* IMAGES */}

          <section className="form-section">
            <div className="form-section-header">
              <div className="images-header-row">
                <div>
                  <h2>Images</h2>

                  <p>Add up to 3 photos that can help identify the item.</p>
                </div>

                <span className="image-count">{images.length}/3</span>
              </div>
            </div>

            <label
              htmlFor="item-images"
              className={`image-upload-box ${
                images.length >= 3 ? "upload-disabled" : ""
              }`}
            >
              <FiImage />

              <span className="image-upload-title">
                {images.length >= 3
                  ? "Maximum images reached"
                  : "Add item images"}
              </span>

              <span className="image-upload-text">
                {images.length >= 3
                  ? "Remove an image to upload another"
                  : "Click to select images"}
              </span>

              <input
                id="item-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                disabled={loading || images.length >= 3}
              />
            </label>

            {errors.images && <p className="field-error">{errors.images}</p>}

            {images.length > 0 && (
              <div className="selected-images">
                {imagePreviews.map((preview, index) => (
                  <div
                    className="selected-image"
                    key={`${preview.file.name}-${index}`}
                  >
                    <img src={preview.url} alt={`Selected item ${index + 1}`} />

                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={() => removeImage(index)}
                      disabled={loading}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SUBMIT */}

          <div className="form-actions">
            <button
              type="submit"
              className="submit-item-button"
              disabled={loading}
            >
              {loading
                ? "Posting..."
                : isLost
                  ? "Report Lost Item"
                  : "Report Found Item"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default ReportItem;
