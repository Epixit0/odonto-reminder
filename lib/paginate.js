/**
 * Paginación cursor-based para MongoDB.
 * Más eficiente que offset-based para colecciones grandes.
 */

/**
 * Ejecuta una query paginada usando cursor (_id).
 * 
 * @param {object} model - Modelo de Mongoose
 * @param {object} query - Filtro de búsqueda
 * @param {object} options
 * @param {string} [options.cursor] - ID del último documento de la página anterior
 * @param {number} [options.limit=20] - Cantidad de documentos por página
 * @param {object} [options.sort] - Criterio de ordenamiento
 * @param {string} [options.populate] - Populate string
 * @returns {{ items: Array, nextCursor: string|null, hasMore: boolean, total: number }}
 */
export async function paginate(model, query = {}, { cursor, limit = 20, sort = { createdAt: -1 }, populate } = {}) {
  const findQuery = { ...query };

  if (cursor) {
    findQuery._id = { $lt: cursor };
  }

  let dbQuery = model.find(findQuery).sort(sort).limit(limit + 1).lean();

  if (populate) {
    dbQuery = dbQuery.populate(populate);
  }

  const items = await dbQuery;
  const hasMore = items.length > limit;
  const results = hasMore ? items.slice(0, limit) : items;
  const nextCursor = results.length > 0 ? String(results[results.length - 1]._id) : null;

  return { items: results, nextCursor: hasMore ? nextCursor : null, hasMore };
}
