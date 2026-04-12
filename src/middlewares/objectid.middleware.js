import mongoose from 'mongoose';

/**
 * Middleware que valida que req.params.id sea un ObjectId válido de MongoDB.
 * Si no lo es, devuelve 400 antes de que Mongoose lance un CastError interno.
 *
 * Uso en una ruta:
 *   router.get('/:id', validateObjectId, getProductController)
 */
export const validateObjectId = (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }
    next();
};
