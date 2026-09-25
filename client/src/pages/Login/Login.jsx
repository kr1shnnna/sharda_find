import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiAlertCircle,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";

import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] =
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

    const email = formData.email.trim();
    const password = formData.password;

    if (!email) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email =
        "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password =
        "Password is required.";
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

      await login(
        formData.email.trim(),
        formData.password
      );

      /*
       * ProtectedRoute stores the exact original URL
       * in location.state.from.
       *
       * This can include:
       * - pathname
       * - query parameters
       * - hash
       *
       * Example:
       * /my-items?status=returned#claims
       */

      const redirectPath =
        location.state?.from || "/";

      navigate(redirectPath, {
        replace: true,
      });

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setServerError(
        error.response?.data?.message ||
          error.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">

      <div className="login-container">

        <div className="login-card">

          {/* Header */}

          <div className="login-header">

            <div className="login-icon">
              <FiLock />
            </div>

            <p className="login-label">
              ShardaFind
            </p>

            <h1>
              Welcome back
            </h1>

            <p>
              Login to manage your lost and found
              items.
            </p>

          </div>

          {/* Server Error */}

          {serverError && (
            <div className="login-server-error">

              <FiAlertCircle />

              <p>
                {serverError}
              </p>

            </div>
          )}

          {/* Form */}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

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
                  autoComplete="email"
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

              <div className="password-label-row">

                <label htmlFor="password">
                  Password
                </label>

              </div>

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
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
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

            {/* Submit */}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >

              {loading
                ? "Logging in..."
                : "Login"}

              {!loading && (
                <FiArrowRight />
              )}

            </button>

          </form>

          {/* Footer */}

          <div className="login-footer">

            <p>
              Don't have an account?

              <Link to="/register">
                Create an account
              </Link>
            </p>

            <Link
              to="/verify-email"
              className="verify-link"
            >
              Need to verify your email?
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
};

export default Login;
