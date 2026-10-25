const { HttpError } = require('./error');

// Hasil validasi disimpan di req.valid.{params,query,body}
// (req.query di Express 5 bersifat read-only).
const validate = (schemas) => (req, res, next) => {
  req.valid = req.valid || {};
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return next(new HttpError(400, 'VALIDATION_ERROR', details[0].message, { details }));
    }
    req.valid[key] = result.data;
  }
  next();
};

module.exports = { validate };
