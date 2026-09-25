import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiAlertCircle,
} from "react-icons/fi";

import "./Register.css";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const validateForm = () => {
    const newErrors = {};

    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!name) {
      newErrors.name = "Name is required.";
    } else if (name.length < 2) {
      newErrors.name =
        "Name must be at least 2 characters.";
    }

    if (!email) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email =
        "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 6) {
      newErrors.password =
        "Password must be at least 6 characters.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setServerError("");

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/api/auth/register",
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }
      );

      console.log("Registration successful:", response.data);

      navigate("/verify-email", {
        state: {
          email: formData.email.trim(),
        },
      });
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setServerError(
        error.response?.data?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <div className="register-container">

        <div className="register-card">

          <div className="register-header">

            <div className="register-icon">
              <FiUser />
            </div>

            <p className="register-label">
              ShardaFind
            </p>

            <h1>
              Create your account
            </h1>

            <p>
              Create an account to report, find and
              recover lost items.
            </p>

          </div>

          {serverError && (
            <div className="register-server-error">
              <FiAlertCircle />

              <p>
                {serverError}
              </p>
            </div>
          )}

          <form
            className="register-form"
            onSubmit={handleSubmit}
          >

            {/* Name */}

            <div className="form-group">

              <label htmlFor="name">
                Full Name
              </label>

              <div
                className={`input-wrapper ${
                  errors.name
                    ? "input-error"
                    : ""
                }`}
              >
                <FiUser />

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              {errors.name && (
                <p className="field-error">
                  {errors.name}
                </p>
              )}

            </div>

            {/* Email */}

            <div className="form-group">

              <label htmlFor="email">
                Email Address
              </label>

              <div
                className={`input-wrapper ${
                  errors.email
                    ? "input-error"
                    : ""
                }`}
              >
                <FiMail />

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              {errors.email && (
                <p className="field-error">
                  {errors.email}
                </p>
              )}

            </div>

            {/* Password */}

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <div
                className={`input-wrapper ${
                  errors.password
                    ? "input-error"
                    : ""
                }`}
              >
                <FiLock />

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>

              </div>

              {errors.password && (
                <p className="field-error">
                  {errors.password}
                </p>
              )}

            </div>

            {/* Confirm Password */}

            <div className="form-group">

              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <div
                className={`input-wrapper ${
                  errors.confirmPassword
                    ? "input-error"
                    : ""
                }`}
              >
                <FiLock />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>

              </div>

              {errors.confirmPassword && (
                <p className="field-error">
                  {errors.confirmPassword}
                </p>
              )}

            </div>

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}

              {!loading && <FiArrowRight />}
            </button>

          </form>

          <div className="register-footer">

            <p>
              Already have an account?

              <Link to="/login">
                Login
              </Link>
            </p>

            <Link
              to="/verify-email"
              className="otp-link"
            >
              Already registered? Verify your email
            </Link>

          </div>

        </div>

      </div>
    </main>
  );
};

export default Register;