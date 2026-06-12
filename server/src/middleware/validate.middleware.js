// src/middleware/validate.middleware.js
// Zod validation middleware factory.
//
// USAGE: validate(zodSchema) returns an Express middleware that validates
// req.body against the schema. On failure, throws ZodError caught by
// the global error handler.
//
// WHY FACTORY PATTERN: Keeps route definitions clean:
//   router.post("/register", validate(registerSchema), authController.register)
// Each route explicitly declares its contract.

function validate(schema) {
  return (req, res, next) => {
    try {
      // parse() throws ZodError if validation fails
      // It also strips unknown fields (safe for req.body)
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err); // ZodError → global error handler formats it
    }
  };
}

module.exports = { validate };
