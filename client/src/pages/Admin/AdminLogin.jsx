import { useEffect, useState } from "react";
import { FiArrowLeft, FiLock, FiMail, FiLogIn } from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
    logout,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /*
   * If an admin is already logged in,
   * send them directly to the admin dashboard.
   */
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role === "admin") {
        navigate("/admin", { replace: true });
      }
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
      setError("Please enter your email and password.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await login(
        email.trim(),
        password
      );

      const loggedInUser =
        response?.user || user;

      /*
       * Only admins are allowed to continue.
       */
      if (loggedInUser?.role !== "admin") {
        logout();
        setError(
          "You do not have permission to access the admin portal."
        );

        /*
         * The AuthContext has already stored the
         * login session. Remove it because this
         * login page is only for administrators.
         */
        return;
      }

      toast.success("Welcome to the Admin Portal");

      const redirectPath =
        location.state?.from || "/admin";

      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error("Admin login error:", error);

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

          {/* HEADER */}

          <div className="admin-login-header">
            <Link
              to="/"
              className="admin-login-logo"
            >
              <span className="admin-login-logo-icon">
                <FiLock />
              </span>

              <span>ShardaFind</span>
            </Link>

            <div className="admin-login-heading">
              <h1>Admin Portal</h1>

              <p>
                Sign in to manage claims and handovers.
              </p>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div
              className="admin-login-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* FORM */}

          <form
            className="admin-login-form"
            onSubmit={handleSubmit}
          >
            {/* EMAIL */}

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

            {/* PASSWORD */}

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

            {/* SUBMIT */}

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

          {/* FOOTER */}

          <div className="admin-login-footer">
            <Link to="/">
              <FiArrowLeft />
              Back to ShardaFind
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
};

export default AdminLogin;
