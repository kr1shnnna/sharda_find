
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "An account already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the OTP before storing it in the database
    const hashedOtp = await bcrypt.hash(otp, 10);

    // OTP expires after 10 minutes
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      emailVerificationOtpHash: hashedOtp,
      emailVerificationOtpExpires: otpExpires,
    });

    // Send OTP email
    await sendEmail({
      to: email,
      subject: "Verify your ShardaFind account",

      html: `
        <div style="
          font-family: Arial, sans-serif;
          background-color: #f4f6f8;
          padding: 40px 20px;
        ">
          <div style="
            max-width: 520px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            padding: 35px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          ">

            <h1 style="
              margin: 0 0 8px;
              color: #2563eb;
              text-align: center;
            ">
              ShardaFind
            </h1>

            <p style="
              text-align: center;
              color: #666;
              margin-bottom: 30px;
            ">
              Lost & Found Department
            </p>

            <h2 style="color: #222;">
              Verify your email
            </h2>

            <p style="color: #444;">
              Hello ${name},
            </p>

            <p style="color: #444; line-height: 1.6;">
              Thanks for creating your ShardaFind account.
              Use the verification code below to verify your email address.
            </p>

            <div style="
              background-color: #f1f5f9;
              border-radius: 10px;
              padding: 20px;
              margin: 25px 0;
              text-align: center;
            ">
              <span style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #2563eb;
              ">
                ${otp}
              </span>
            </div>

            <p style="
              text-align: center;
              color: #666;
            ">
              This code will expire in <strong>10 minutes</strong>.
            </p>

            <hr style="
              border: none;
              border-top: 1px solid #eee;
              margin: 30px 0;
            ">

            <p style="
              font-size: 13px;
              color: #888;
              line-height: 1.5;
            ">
              If you didn't create a ShardaFind account, you can safely
              ignore this email.
            </p>

            <p style="
              font-size: 13px;
              color: #888;
              text-align: center;
              margin-top: 25px;
            ">
              — ShardaFind Team
            </p>

          </div>
        </div>
      `,
    });

    res.status(201).json({
      message:
        "Registration successful. Please check your email for the verification OTP.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to register user",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = createToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to log in",
      error: error.message,
    });
  }
};

const getMyProfile = async (req, res) => {
  res.status(200).json({
    user: req.user,
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMyProfile,
};
