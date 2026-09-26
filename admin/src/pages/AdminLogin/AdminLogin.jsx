import { useEffect, useState } from "react";
import { FiLock, FiLogIn, FiMail } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";

import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import "./AdminLogin.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    isAuthenticated,
    loading: authLoading,
    login,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /*
    If an admin is already logged in,
    don't show the login page again.
  */
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user?.role === "admin"
    ) {
      navigate("/admin", {
        replace: true,
      });
    }
  }, [
    authLoading,
    isAuthenticated,
    user,
    navigate,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError(
        "Please enter your email and password."
      );

      return;
    }

    try {
      setSubmitting(true);

      const response = await login(
        email.trim(),
        password
      );

      /*
        AuthContext already verifies that the
        logged-in account has role === "admin".
      */

      const loggedInUser =
        response?.user || user;

      if (loggedInUser?.role !== "admin") {
        setError(
          "You do not have permission to access the admin portal."
        );

        return;
      }

      toast.success(
        "Welcome to the Admin Portal"
      );

      /*
        If AdminRoute redirected the user to
        login from another protected admin page,
        return them there.

        Otherwise go to /admin.
      */
      const redirectPath =
        location.state?.from || "/admin";

      navigate(redirectPath, {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Admin login error:",
        error
      );

      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to log in. Please try again.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">

          {/* Header */}

          <div className="admin-login-header">

            <div className="admin-login-logo">
              <span className="admin-login-logo-icon">
               <FaLeaf />
              </span>

              <span>ShardaFind</span>
            </div>

            <div className="admin-login-heading">
              <h1>Admin Portal</h1>

              <p>
                Sign in to manage claims and
                handovers.
              </p>
            </div>

          </div>

          {/* Error */}

          {error && (
            <div
              className="admin-login-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Login Form */}

          <form
            className="admin-login-form"
            onSubmit={handleSubmit}
          >

            {/* Email */}

            <div className="admin-login-field">

              <label htmlFor="admin-email">
                Email address
              </label>

              <div className="admin-login-input-wrapper">
                <FiMail />

                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter admin email"
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>

            </div>

            {/* Password */}

            <div className="admin-login-field">

              <label htmlFor="admin-password">
                Password
              </label>

              <div className="admin-login-input-wrapper">
                <FiLock />

                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={submitting}
                />
              </div>

            </div>

            {/* Submit */}

            <button
              type="submit"
              className="admin-login-button"
              disabled={submitting}
            >
              <FiLogIn />

              {submitting
                ? "Signing in..."
                : "Sign in"}
            </button>

          </form>

          {/* Footer */}

          <div className="admin-login-footer">
            <p>
              Authorized administrators only.
            </p>
          </div>

        </div>
      </div>
    </main>
  );
};

export default AdminLogin;
