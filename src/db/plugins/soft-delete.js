/**
 * Plugin de Mongoose para soft delete.
 *
 * Añade:
 *  - Campo `deletedAt: Date` (null por defecto = documento activo).
 *  - Método de instancia `softDelete()` que marca el documento en vez de borrarlo.
 *  - Método de instancia `restore()` que lo reactiva poniendo deletedAt a null.
 *  - Middleware que inyecta automáticamente `{ deletedAt: null }` en todas las
 *    queries de lectura, para que los documentos borrados no aparezcan por defecto.
 *  - Helpers de query `withDeleted()` y `onlyDeleted()` para saltarse el filtro
 *    cuando necesitemos acceder a los borrados (ej. panel de admin, restauración).
 *
 * Uso:
 *   import { softDeletePlugin } from '../plugins/soft-delete.js';
 *   schema.plugin(softDeletePlugin);
 */
const READ_HOOKS = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'countDocuments',
    'estimatedDocumentCount',
    'distinct',
];

export const softDeletePlugin = (schema) => {
    schema.add({
        deletedAt: {
            type: Date,
            default: null,
            index: true,
        },
    });

    // Inyectamos el filtro `deletedAt: null` en todas las queries de lectura,
    // salvo que el caller haya pedido explícitamente ver los borrados usando
    // `Model.find().setOptions({ withDeleted: true })`.
    //
    // Mongoose 9 cambió la firma de los pre-hooks: ya no reciben `next`.
    // Usamos la forma async (sin next) devolviendo implícitamente undefined.
    READ_HOOKS.forEach((hook) => {
        schema.pre(hook, async function applySoftDeleteFilter() {
            const options = this.getOptions();
            if (options.withDeleted || options.onlyDeleted) {
                if (options.onlyDeleted) {
                    this.where({ deletedAt: { $ne: null } });
                }
                return;
            }
            // Solo aplicamos el filtro si el caller no ha fijado deletedAt ya.
            const filter = this.getFilter();
            if (!('deletedAt' in filter)) {
                this.where({ deletedAt: null });
            }
        });
    });

    // Métodos de instancia: soft delete y restauración
    schema.methods.softDelete = function softDelete() {
        this.deletedAt = new Date();
        return this.save();
    };

    schema.methods.restore = function restore() {
        this.deletedAt = null;
        return this.save();
    };

    // Helpers de query para usar en cadena: `Model.find().withDeleted()`
    schema.query.withDeleted = function withDeleted() {
        return this.setOptions({ withDeleted: true });
    };

    schema.query.onlyDeleted = function onlyDeleted() {
        return this.setOptions({ onlyDeleted: true });
    };
};
