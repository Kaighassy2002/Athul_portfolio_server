function pagination(query, defaults = { limit: 20, max: 50 }) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    defaults.max,
    Math.max(1, Number.parseInt(query.limit, 10) || defaults.limit)
  );
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { pagination };
