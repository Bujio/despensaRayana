/**
 * Extrae y normaliza los parámetros de paginación desde req.query.
 *
 * Uso en un controller:
 *   const { page, limit, skip } = getPagination(req.query);
 *   const result = await listSomethingService({ page, limit, skip });
 *
 * Query params soportados:
 *   ?page=2        → página a devolver (por defecto 1)
 *   ?limit=20      → documentos por página (por defecto 10, máximo 100)
 *
 * @param {object} query - req.query de Express
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const getPagination = (query) => {
    // parseInt con fallback al default si el valor no es un número válido
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

/**
 * Construye el objeto de metadatos de paginación que se incluye en cada respuesta.
 *
 * @param {number} total - Total de documentos en la colección (sin paginar)
 * @param {number} page  - Página actual
 * @param {number} limit - Documentos por página
 * @returns {{ total: number, page: number, limit: number, totalPages: number }}
 */
export const buildPaginationMeta = (total, page, limit) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
});
