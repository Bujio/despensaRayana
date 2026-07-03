import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Configuración de Swagger/OpenAPI.
 *
 * Los comentarios `@openapi` dentro de los archivos indicados en `apis`
 * alimentan la especificación generada y la UI en /api/docs.
 *
 * Los `components.schemas` listados aquí sirven como tipos reutilizables
 * en las definiciones de ruta: basta con referenciarlos con `$ref`.
 */
const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Despensa Rayana API',
            version: '1.0.0',
            description:
                'API REST para la tienda online Despensa Rayana — tienda pública, clientes, proveedores, productos, carrito, pedidos y backoffice.',
        },
        servers: [
            {
                url: '/api',
                description: 'API base path',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description:
                        'JWT de acceso emitido por POST /auth/login. Se renueva con POST /auth/refresh.',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                },
                Address: {
                    type: 'object',
                    properties: {
                        country: { type: 'string' },
                        street: { type: 'string' },
                        codePostal: { type: 'string' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        role: {
                            type: 'string',
                            enum: ['user', 'supplier', 'admin'],
                        },
                        phone: { type: 'string' },
                        address: { $ref: '#/components/schemas/Address' },
                        emailVerified: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                RegisterInput: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                        name: { type: 'string', minLength: 2, maxLength: 100 },
                        email: { type: 'string', format: 'email' },
                        password: {
                            type: 'string',
                            minLength: 6,
                            maxLength: 128,
                            description:
                                'Debe contener al menos una mayúscula y un número.',
                        },
                        phone: { type: 'string' },
                        address: { $ref: '#/components/schemas/Address' },
                    },
                },
                LoginInput: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                    },
                },
                Product: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        sku: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        stock: { type: 'integer' },
                        category: {
                            oneOf: [
                                { type: 'string' },
                                {
                                    type: 'object',
                                    properties: {
                                        _id: { type: 'string' },
                                        name: { type: 'string' },
                                        slug: { type: 'string' },
                                    },
                                },
                            ],
                        },
                    },
                },
                Supplier: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        userId: { type: 'string' },
                        supplierCode: {
                            type: 'string',
                            minLength: 6,
                            maxLength: 6,
                        },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        legalName: { type: 'string' },
                        shortDescription: { type: 'string' },
                        description: { type: 'string' },
                        story: { type: 'string' },
                        specialties: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                        status: {
                            type: 'string',
                            enum: [
                                'pending_review',
                                'active',
                                'inactive',
                                'draft',
                                'rejected',
                            ],
                        },
                        featured: { type: 'boolean' },
                        origin: { type: 'string' },
                        location: { type: 'object' },
                        contact: { type: 'object' },
                        business: { type: 'object' },
                        logo: { type: 'object' },
                        mainImage: { type: 'object' },
                        gallery: {
                            type: 'array',
                            items: { type: 'object' },
                        },
                        certifications: { type: 'object' },
                        reviewedAt: { type: 'string', format: 'date-time' },
                        rejectionReason: { type: 'string' },
                    },
                },
                SupplierReport: {
                    type: 'object',
                    properties: {
                        totalRevenueFromOwnProducts: { type: 'number' },
                        totalUnitsSoldFromOwnProducts: { type: 'number' },
                        ordersWithOwnProducts: { type: 'number' },
                        pendingOrdersContainingOwnProducts: { type: 'number' },
                        bestSellingOwnProducts: {
                            type: 'array',
                            items: { type: 'object' },
                        },
                        revenueByProduct: {
                            type: 'array',
                            items: { type: 'object' },
                        },
                        revenueByDate: {
                            type: 'array',
                            items: { type: 'object' },
                        },
                    },
                },
                Category: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                    },
                },
                OrderLine: {
                    type: 'object',
                    required: ['sku', 'count'],
                    properties: {
                        sku: { type: 'string' },
                        count: { type: 'integer', minimum: 1 },
                        price: { type: 'number' },
                    },
                },
                Order: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        products: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/OrderLine' },
                        },
                        total: { type: 'number' },
                        status: {
                            type: 'string',
                            enum: [
                                'pending',
                                'processing',
                                'shipped',
                                'delivered',
                                'cancelled',
                            ],
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                CartItem: {
                    type: 'object',
                    required: ['sku', 'quantity'],
                    properties: {
                        sku: { type: 'string' },
                        quantity: { type: 'integer', minimum: 1 },
                        price: { type: 'number' },
                    },
                },
                Cart: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/CartItem' },
                        },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
