import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiFileText,
  FiImage,
  FiUpload,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../../api/axios";

import "./ClaimForm.css";

const ClaimForm = ({
  itemId,
  itemTitle,
  onClose,
  onSuccess,
}) => {
  const [ownershipProof, setOwnershipProof] =
    useState("");

  const [message, setMessage] = useState("");

  const [evidenceImages, setEvidenceImages] =
    useState([]);

  const [submitting, setSubmitting] = useState(false);

  const handleEvidenceChange = (event) => {
    const files = Array.from(
      event.target.files || []
    );

    if (files.length > 2) {
      toast.error(
        "You can upload a maximum of 2 evidence images."
      );

      event.target.value = "";
      return;
    }

    setEvidenceImages(files);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!ownershipProof.trim()) {
      toast.error(
        "Please provide ownership proof."
      );
      return;
    }

    if (!itemId) {
      toast.error("Item information is missing.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append(
        "itemId",
        itemId
      );

      formData.append(
        "ownershipProof",
        ownershipProof.trim()
      );

      formData.append(
        "message",
        message.trim()
      );

      evidenceImages.forEach((file) => {
        formData.append(
          "evidenceImages",
          file
        );
      });

      await api.post(
        "/claims",
        formData
      );

      toast.success(
        "Claim submitted successfully."
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(
        "Submit claim error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to submit your claim."
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [onClose, submitting]);

  return (
    <div
      className="claim-form-overlay"
      onClick={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div
        className="claim-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-form-title"
      >
        <button
          type="button"
          className="claim-form-close"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
        >
          <FiX />
        </button>

        <div className="claim-form-icon">
          <FiCheckCircle />
        </div>

        <div className="claim-form-header">
          <h2 id="claim-form-title">
            Claim this item
          </h2>

          <p>
            Submit proof that{" "}
            <strong>
              {itemTitle || "this item"}
            </strong>{" "}
            belongs to you.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="claim-form-field">
            <label htmlFor="ownershipProof">
              Ownership Proof
              <span>*</span>
            </label>

            <div className="claim-form-field-heading">
              <FiCheckCircle />

              <span>
                Explain how you can prove
                ownership of this item.
              </span>
            </div>

            <textarea
              id="ownershipProof"
              value={ownershipProof}
              onChange={(event) =>
                setOwnershipProof(
                  event.target.value
                )
              }
              placeholder="Example: I can identify the unique scratch on the back of the phone and provide the original purchase details."
              rows={4}
              maxLength={1000}
              disabled={submitting}
            />

            <small>
              {ownershipProof.length}/1000
            </small>
          </div>

          <div className="claim-form-field">
            <label htmlFor="claimMessage">
              Message
              <span className="optional">
                Optional
              </span>
            </label>

            <div className="claim-form-field-heading">
              <FiFileText />

              <span>
                Add any additional information
                that may help verify your claim.
              </span>
            </div>

            <textarea
              id="claimMessage"
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              placeholder="Add any additional details..."
              rows={3}
              maxLength={1000}
              disabled={submitting}
            />

            <small>
              {message.length}/1000
            </small>
          </div>

          <div className="claim-form-field">
            <label htmlFor="evidenceImages">
              Evidence Images
              <span className="optional">
                Optional
              </span>
            </label>

            <div className="claim-form-upload-info">
              <FiImage />

              <div>
                <strong>
                  Upload supporting evidence
                </strong>

                <span>
                  Maximum 2 images
                </span>
              </div>
            </div>

            <label
              htmlFor="evidenceImages"
              className="claim-form-upload-button"
            >
              <FiUpload />

              <span>
                Choose Images
              </span>

              <input
                id="evidenceImages"
                type="file"
                accept="image/*"
                multiple
                onChange={
                  handleEvidenceChange
                }
                disabled={submitting}
              />
            </label>

            {evidenceImages.length >
              0 && (
              <div className="claim-form-files">
                {evidenceImages.map(
                  (file, index) => (
                    <div
                      className="claim-form-file"
                      key={`${file.name}-${index}`}
                    >
                      <FiImage />

                      <span>
                        {file.name}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="claim-form-note">
            <FiFileText />

            <p>
              Your claim will be reviewed by
              the Lost & Found Department.
              Providing accurate ownership
              information helps the department
              verify your claim.
            </p>
          </div>

          <div className="claim-form-actions">
            <button
              type="button"
              className="claim-form-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="claim-form-submit"
              disabled={submitting}
            >
              <FiCheckCircle />

              {submitting
                ? "Submitting..."
                : "Submit Claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClaimForm;