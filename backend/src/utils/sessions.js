/**
 * A token stays valid only while its user is active and the password has not changed since it was issued.
 * Changing a password (by the user or an administrator) therefore signs out every other session.
 */
function isTokenCurrent(payload, user) {
  if (!payload || !user || user.status !== "active") {
    return false;
  }

  if (!user.passwordChangedAt) {
    return true;
  }

  const issuedAtMs = Number(payload.iat || 0) * 1000;
  // JWT "iat" has one-second precision, so compare on whole seconds.
  const changedAtMs = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000) * 1000;
  return issuedAtMs >= changedAtMs;
}

module.exports = { isTokenCurrent };
