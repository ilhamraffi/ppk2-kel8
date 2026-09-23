/**
 * Authentication middleware.
 * Verifies that the user has an active server-side session.
 * Rejects unauthenticated requests with 401 Unauthorized.
 * Populates req.user strictly from server session data.
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication required',
    });
  }

  req.user = {
    id: req.session.userId,
    email: req.session.userEmail,
    name: req.session.userName,
  };

  next();
};

module.exports = { requireAuth };

