import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiMail,
  FiArrowRight,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

import "./VerifyEmail.css";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");

  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleOtpChange = (event) => {
    const value = event.target.value;

    if (/^\d*$/.test(value) && value.length <= 6) {
      setOtp(value);
      setError("");
      setSuccess("");
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/api/auth/verify-email",
        {
          email: email.trim(),
          otp,
        },
      );

      console.log("Email verification successful:", response.data);

      setSuccess("Your email has been verified successfully.");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      console.error("Email verification error:", error);

      setError(
        error.response?.data?.message ||
          "Invalid or expired OTP. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setResending(true);

      const response = await axios.post(
        "http://localhost:5000/api/auth/resend-otp",
        {
          email: email.trim(),
        },
      );

      console.log("OTP resent:", response.data);

      setSuccess("A new OTP has been sent to your email.");
    } catch (error) {
      console.error("Resend OTP error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to resend OTP. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="verify-page">
      <div className="verify-container">
        <div className="verify-card">
          <div className="verify-header">
            <div className="verify-icon">
              <FiMail />
            </div>

            <p className="verify-label">Email Verification</p>

            <h1>Verify your email</h1>

            <p>Enter the 6-digit OTP sent to your email address.</p>
          </div>

          {(error || success) && (
            <div className={`verify-message ${error ? "error" : "success"}`}>
              {error ? <FiAlertCircle /> : <FiCheckCircle />}

              <p>{error || success}</p>
            </div>
          )}

          <form className="verify-form" onSubmit={handleVerify}>
            {/* Email */}

            <div className="form-group">
              <label htmlFor="verify-email">Email Address</label>

              <div className="verify-input-wrapper">
                <FiMail />

                <input id="verify-email" type="email" value={email} readOnly />
              </div>

              <p className="verify-email-help">
                This is the email address you used to create your account.
              </p>
            </div>

            {/* OTP */}

            <div className="form-group">
              <label htmlFor="otp">Verification Code</label>

              <input
                id="otp"
                className="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={otp}
                onChange={handleOtpChange}
                maxLength={6}
                disabled={loading}
              />

              <p className="otp-help">
                Enter the 6-digit code sent to your email.
                If you don't see it, check your Spam or Promotions folder.
              </p>
            </div>

            <button type="submit" className="verify-submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify Email"}

              {!loading && <FiArrowRight />}
            </button>
          </form>

          <div className="verify-footer">
            <button
              type="button"
              className="resend-button"
              onClick={handleResendOtp}
              disabled={resending}
            >
              {resending ? "Sending..." : "Didn't receive the OTP? Resend"}
            </button>

            <Link to="/register" className="back-register-link">
              Back to registration
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default VerifyEmail;
