/** Strip sensitive fields from a user/profile record before sending to the client. */
export function sanitizeUser<T extends Record<string, unknown>>(user: T): Omit<T, 'passwordHash' | 'emailVerificationToken' | 'emailVerificationExpires'> {
  const { passwordHash, emailVerificationToken, emailVerificationExpires, ...safe } = user as any;
  return safe;
}
