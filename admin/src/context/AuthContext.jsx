import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem("adminToken")
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken =
      localStorage.getItem("adminToken");

    const storedUser =
      localStorage.getItem("adminUser");

    if (storedToken) {
      setToken(storedToken);
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error(
          "Unable to restore admin session:",
          error
        );

        localStorage.removeItem("adminUser");
      }
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const receivedToken =
      response.data?.token ||
      response.data?.accessToken;

    const receivedUser =
      response.data?.user ||
      response.data?.data?.user;

    if (!receivedToken) {
      throw new Error(
        "Login succeeded but no authentication token was returned."
      );
    }

    /*
      Important:
      The backend has one login endpoint for both
      students and admins.

      We only allow an admin account to continue
      in this separate application.
    */

    if (receivedUser?.role !== "admin") {
      throw new Error(
        "You do not have permission to access the admin portal."
      );
    }

    localStorage.setItem(
      "adminToken",
      receivedToken
    );

    localStorage.setItem(
      "adminUser",
      JSON.stringify(receivedUser)
    );

    setToken(receivedToken);
    setUser(receivedUser);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    setToken(null);
    setUser(null);
  };

  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
