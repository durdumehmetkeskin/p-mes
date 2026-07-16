import type { AuthProvider } from "@refinedev/core";
import type { AxiosError } from "axios";
import { resetAccessControl } from "./access-control";
import { axiosInstance } from "./axios";
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from "./constants";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface Identity {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as AxiosError<{ message?: string | string[] }>)
    ?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return message ?? fallback;
}

function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const { data } = await axiosInstance.post<AuthTokens>("/auth/login", {
        email,
        password,
      });
      storeTokens(data);
      resetAccessControl(); // load fresh permissions for the new session
      return { success: true, redirectTo: "/" };
    } catch (error) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: errorMessage(error, "Invalid email or password"),
        },
      };
    }
  },

  register: async ({ email, password }) => {
    try {
      // The backend requires a name; derive one from the email local-part.
      const name = String(email).split("@")[0];
      await axiosInstance.post("/users", { email, name, password });

      // Log the new user straight in.
      const { data } = await axiosInstance.post<AuthTokens>("/auth/login", {
        email,
        password,
      });
      storeTokens(data);
      resetAccessControl(); // load fresh permissions for the new session
      return { success: true, redirectTo: "/" };
    } catch (error) {
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: errorMessage(error, "Could not create the account"),
        },
      };
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    try {
      if (refreshToken) {
        await axiosInstance.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Best-effort revocation; clear local state regardless.
    }
    clearTokens();
    resetAccessControl();
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      return { authenticated: true };
    }
    return { authenticated: false, redirectTo: "/login" };
  },

  getIdentity: async () => {
    try {
      const { data } = await axiosInstance.get<Identity>("/auth/me");
      return { ...data, fullName: data.name };
    } catch {
      return null;
    }
  },

  getPermissions: async () => {
    try {
      const { data } = await axiosInstance.get<Identity>("/auth/me");
      return data.roles;
    } catch {
      return [];
    }
  },

  forgotPassword: async ({ email }) => {
    try {
      const { data } = await axiosInstance.post<{
        success: boolean;
        resetToken?: string;
      }>("/auth/forgot-password", { email });

      // In dev the backend returns the token (no email service); jump straight
      // to the reset page so the flow is usable end-to-end.
      if (data.resetToken) {
        return {
          success: true,
          redirectTo: `/reset-password?token=${encodeURIComponent(
            data.resetToken,
          )}`,
        };
      }

      return {
        success: true,
        successNotification: {
          message: "If that email exists, a reset link has been sent.",
          description: "Check your inbox",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: "ForgotPasswordError",
          message: errorMessage(error, "Could not start password reset"),
        },
      };
    }
  },

  updatePassword: async ({ password }) => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      return {
        success: false,
        error: {
          name: "ResetPasswordError",
          message: "Missing or invalid reset token.",
        },
      };
    }

    try {
      await axiosInstance.post("/auth/reset-password", { token, password });
      return { success: true, redirectTo: "/login" };
    } catch (error) {
      return {
        success: false,
        error: {
          name: "ResetPasswordError",
          message: errorMessage(error, "Could not reset password"),
        },
      };
    }
  },

  onError: async (error) => {
    if ((error as AxiosError)?.response?.status === 401) {
      return { logout: true, redirectTo: "/login", error };
    }
    return { error };
  },
};
