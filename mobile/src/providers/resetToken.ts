/**
 * Holds the password-reset token captured from a deep link (or the dev
 * forgot-password response), replacing the web's `window.location.search`
 * read in authProvider.updatePassword.
 */
let resetToken: string | null = null;

export function setResetToken(token: string | null): void {
  resetToken = token;
}

export function getResetToken(): string | null {
  return resetToken;
}
