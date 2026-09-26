import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

let isRedirectingToLogin = false;

/*
 * Request interceptor
 * Adds JWT to authenticated API requests.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/*
 * Response interceptor
 * Handles expired/invalid JWT sessions.
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url;

    const isLoginRequest =
      requestUrl === "/auth/login" ||
      requestUrl?.endsWith("/auth/login");

    const isAlreadyOnLoginPage =
      window.location.pathname === "/login";

    if (
      status === 401 &&
      !isLoginRequest &&
      !isAlreadyOnLoginPage &&
      !isRedirectingToLogin
    ) {
      isRedirectingToLogin = true;

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.replace("/login");
    }

    return Promise.reject(error);
  }
);

export default api;
