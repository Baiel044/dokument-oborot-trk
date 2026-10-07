const { rateLimit } = require("express-rate-limit");

function limiter({ windowMinutes, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ message }),
  });
}

// Failed logins only: an employee who signs in correctly is never blocked.
const loginLimiter = limiter({
  windowMinutes: 15,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Өтө көп ийгиликсиз аракет. 15 мүнөттөн кийин кайра аракет кылыңыз.",
});

const registrationLimiter = limiter({
  windowMinutes: 60,
  limit: 10,
  message: "Өтө көп катталуу аракети. Бир сааттан кийин кайра аракет кылыңыз.",
});

const passwordResetLimiter = limiter({
  windowMinutes: 60,
  limit: 5,
  message: "Өтө көп суроо. Бир сааттан кийин кайра аракет кылыңыз.",
});

module.exports = { loginLimiter, registrationLimiter, passwordResetLimiter };
