import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../db/models/user.model.js';

/**
 * Registra un nuevo usuario en la base de datos.
 * La contraseña se hashea antes de guardarla; nunca se almacena en texto plano.
 *
 * @param {{ name, password, email, phone }} data - Datos del usuario a crear
 * @returns {Promise<User>} El documento del usuario creado (incluye password hasheado)
 */
export const registerService = async ({ name, password, email, phone }) => {
    // bcrypt con factor 10 es el balance recomendado entre seguridad y rendimiento
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
        name,
        password: hashedPassword,
        email,
        phone,
    });
    // Nunca devolvemos el hash al cliente
    const { password: _, ...safeUser } = newUser.toObject();
    return safeUser;
};

/**
 * Autentica a un usuario y genera un JWT si las credenciales son correctas.
 *
 * @param {{ email, password }} credentials - Credenciales del usuario
 * @returns {Promise<{ token: string, user: object }>} Token JWT y datos del usuario sin password
 * @throws {Error} Si el usuario no existe o la contraseña no coincide
 */
export const loginService = async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    // bcrypt.compare compara el texto plano con el hash almacenado de forma segura
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');

    // El payload del token incluye id, role y email para evitar consultas extra a la BD
    // en los middlewares de autenticación y autorización
    const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
    );

    // Excluimos el password del objeto devuelto al cliente
    const { password: _, ...safeUser } = user.toObject();
    return { token, user: safeUser };
};
