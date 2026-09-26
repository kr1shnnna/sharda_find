import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

let isRedirectingToLogin = false;

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url;

    const isLoginRequest =
      requestUrl === "/auth/login" ||
      requestUrl?.endsWith("/auth/login");

    if (
      status === 401 &&
      !isLoginRequest &&
      !isRedirectingToLogin
    ) {
      isRedirectingToLogin = true;

      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");

      window.location.replace("/admin/login");
    }

    return Promise.reject(error);
  }
);

export default api;
