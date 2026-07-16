import type { AuthProvider } from "@refinedev/core";
import type { AxiosError } from "axios";

import { resetAccessControl } from "./access-control";
import { axiosInstance } from "./axios";
import { getResetToken, setResetToken } from "./resetToken";
import { clearTokens, getAccessToken, setTokens } from "./tokenStore";

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

/**
 * Refine authProvider ported from the web. Adaptations for RN:
 *  - tokens persist via tokenStore (SecureStore) instead of localStorage;
 *  - check() reads the synchronous mirror (hydrated at boot);
 *  - updatePassword reads the reset token from the deep-link holder instead of
 *    window.location.search;
 *  - redirectTo strings are handled by the custom expo-router routerProvider.
 */
export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const { data } = await axiosInstance.post<AuthTokens>("/auth/login", {
        email,
        password,
      });
      await setTokens(data);
      resetAccessControl();
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

      const { data } = await axiosInstance.post<AuthTokens>("/auth/login", {
        email,
        password,
      });
      await setTokens(data);
      resetAccessControl();
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
    const { getRefreshToken } = await import("./tokenStore");
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await axiosInstance.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Best-effort revocation; clear local state regardless.
    }
    await clearTokens();
    resetAccessControl();
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const token = getAccessToken();
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

      // In dev the backend returns the token (no mailer); stash it and jump to
      // the reset screen so the flow is usable end-to-end.
      if (data.resetToken) {
        setResetToken(data.resetToken);
        return { success: true, redirectTo: "/reset-password" };
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
    const token = getResetToken();
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
      setResetToken(null);
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
