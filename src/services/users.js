import bcrypt from 'bcryptjs';
import { User } from '../db/models/user.model.js';

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
 * Excluye el campo password de todos los documentos.
 *
 * @param {{ skip: number, limit: number }} pagination - Parámetros de paginación
 * @returns {Promise<{ data: User[], total: number }>}
 */
export const listUsersService = async ({ skip, limit }) => {
    const [data, total] = await Promise.all([
        User.find().select('-password').skip(skip).limit(limit),
        User.countDocuments(),
    ]);
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
    // Si el cliente envía una nueva contraseña, la hasheamos antes de guardarla
    if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
    }
    return await User.findByIdAndUpdate(id, data, {
        new: true, // devuelve el documento actualizado, no el original
        runValidators: true, // aplica las validaciones del schema de Mongoose
    }).select('-password');
};

/**
 * Elimina un usuario por su ID.
 *
 * @param {string} id - ID de MongoDB del usuario
 * @returns {Promise<User|null>} El usuario eliminado o null si no existía
 */
export const deleteUserService = async (id) => {
    return await User.findByIdAndDelete(id);
};
