/**
 * Well-known system roles that always exist and are referenced by guards.
 * Roles are dynamic (DB-backed); these two are seeded and protected from
 * rename/deletion.
 */
export enum SystemRole {
  User = 'user',
  Admin = 'admin',
}
