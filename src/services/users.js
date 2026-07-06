import bcrypt from 'bcryptjs';
import { User } from '../db/models/user.model.js';
import { Order } from '../db/models/order.model.js';

const buildOrderCountFilter = (user) => ({
    $or: [
        { userId: user._id },
        { email: user.email, userId: { $exists: false } },
        { email: user.email, userId: null },
    ],
});

const attachOrderCounts = async (users) => {
    const counts = await Promise.all(
        users.map((user) => Order.countDocuments(buildOrderCountFilter(user))),
    );

    return users.map((user, index) => ({
        ...user.toObject(),
        orderCount: counts[index],
    }));
};

/**
 * Obtiene un usuario por su ID.
 * Excluye el campo password de la respuesta para no exponerlo nunca al cliente.
 *
 * @param {string} id - ID de MongoDB del usuario
 * @returns {Promise<User|null>} El usuario encontrado o null si no existe
 */
export const getUserService = async (id) => {
    return await User.findById(id).select('-password');
};

/**
 * Devuelve una página de usuarios registrados.
 * Excluye el campo password de todos los documentos y añade orderCount para
 * que el backoffice pueda mostrar cuántos pedidos ha hecho cada usuario.
 *
 * @param {{ skip: number, limit: number }} pagination - Parámetros de paginación
 * @returns {Promise<{ data: User[], total: number }>}
 */
export const listUsersService = async ({ skip, limit }) => {
    const [users, total] = await Promise.all([
        User.find().select('-password').skip(skip).limit(limit),
        User.countDocuments(),
    ]);
    const data = await attachOrderCounts(users);
    return { data, total };
};

/**
 * Actualiza los datos de un usuario existente.
 * Si viene una nueva contraseña en los datos, la hashea antes de guardarla.
 *
 * @param {string} id - ID de MongoDB del usuario
 * @param {object} data - Campos a actualizar (parcial)
 * @returns {Promise<User|null>} El usuario actualizado sin password, o null si no existe
 */
export const updateUserService = async (id, data) => {
    // Construimos un nuevo objeto en lugar de mutar el `data` recibido,
    // para no modificar el req.body del caller.
    const update = { ...data };
    if (update.password) {
        update.password = await bcrypt.hash(update.password, 10);
    }
    return await User.findByIdAndUpdate(id, update, {
        returnDocument: 'after', // devuelve el documento actualizado, no el original
        runValidators: true, // aplica las validaciones del schema de Mongoose
    }).select('-password');
};

/**
 * Marca un usuario como borrado (soft delete).
 * El documento permanece en la BD con `deletedAt` fijado pero deja de
 * aparecer en las queries normales. Para casos de GDPR / derecho al olvido
 * habría que hacer un hard delete real en una tarea separada.
 *
 * @param {string} id - ID de MongoDB del usuario
 * @returns {Promise<User|null>} El usuario borrado o null si no existía
 */
export const deleteUserService = async (id) => {
    const user = await User.findById(id);
    if (!user) return null;
    await user.softDelete();
    return user;
};
