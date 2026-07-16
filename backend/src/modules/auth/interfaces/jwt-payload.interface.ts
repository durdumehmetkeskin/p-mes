/** Minimal, non-sensitive JWT payload. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
}
