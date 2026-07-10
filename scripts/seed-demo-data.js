import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Category } from '../src/db/models/category.model.js';
import { Product } from '../src/db/models/product.model.js';
import { Review } from '../src/db/models/review.model.js';
import { Supplier } from '../src/db/models/supplier.model.js';
import { User } from '../src/db/models/user.model.js';

const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGODB_URI2;

const DEMO_PASSWORD = 'password';
const IMAGE_BY_CATEGORY = {
    alimentacion:
        'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=1200&q=80',
    ibericos:
        'https://images.unsplash.com/photo-1606851682837-019baf2c3ec0?auto=format&fit=crop&w=1200&q=80',
    quesos: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Torta_del_Casar_DOP.jpg',
    dulces: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Selection_of_creamed_honey_jars_from_Europe.jpg',
    bebidas:
        'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
    artesania:
        'https://upload.wikimedia.org/wikipedia/commons/d/d6/Cork_coaster.jpg',
    packs: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80',
};

const categories = [
    [
        'Alimentación',
        'Despensa rayana, básicos, legumbres, conservas y condimentos.',
    ],
    ['Ibéricos', 'Jamones, embutidos y piezas procedentes de dehesa.'],
    ['Quesos', 'Quesos artesanos de oveja, cabra y mezcla.'],
    ['Dulces y miel', 'Mieles, mermeladas y dulcería tradicional.'],
    ['Bebidas', 'Vinos, licores, mostos y bebidas de la zona.'],
    ['Artesanía', 'Objetos de corcho, barro, madera y fibras naturales.'],
    ['Packs regalo', 'Selecciones preparadas para regalo y degustación.'],
];

const supplierSeeds = [
    {
        code: 'RAY234',
        email: 'proveedor.dehesa.demo@rayana.test',
        name: 'Dehesa Rayana',
        legalName: 'Dehesa Rayana S.L.',
        phone: '+34 624 111 001',
        specialty: ['ibéricos', 'embutidos', 'dehesa'],
        origin: 'Valencia de Alcántara, Cáceres',
        town: 'Valencia de Alcántara',
        comarca: 'Sierra de San Pedro',
        province: 'Cáceres',
        summary:
            'Productor de ibéricos de bellota y embutidos tradicionales en dehesa rayana.',
        image: 'https://images.unsplash.com/photo-1516041774595-cc1b79694810?auto=format&fit=crop&w=1200&q=80',
    },
    {
        code: 'QSR235',
        email: 'proveedor.queseria.demo@rayana.test',
        name: 'Quesería Encina Fronteriza',
        legalName: 'Quesería Encina Fronteriza Coop.',
        phone: '+34 624 111 002',
        specialty: ['quesos', 'oveja', 'cabra'],
        origin: 'Alburquerque, Badajoz',
        town: 'Alburquerque',
        comarca: 'Sierra de San Pedro',
        province: 'Badajoz',
        summary:
            'Quesería familiar especializada en tortas, curados y semicurados de leche de oveja y cabra.',
        image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=1200&q=80',
    },
    {
        code: 'MIL236',
        email: 'proveedor.mieles.demo@rayana.test',
        name: 'Mieles del Tajo Internacional',
        legalName: 'Mieles del Tajo Internacional S.C.',
        phone: '+34 624 111 003',
        specialty: ['miel', 'dulces', 'mermeladas'],
        origin: 'Alcántara, Cáceres',
        town: 'Alcántara',
        comarca: 'Tajo-Salor',
        province: 'Cáceres',
        summary:
            'Apicultura y dulcería tradicional junto al Tajo Internacional.',
        image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80',
    },
    {
        code: 'COR237',
        email: 'proveedor.obrador.demo@rayana.test',
        name: 'Obrador y Corcho La Frontera',
        legalName: 'Obrador y Corcho La Frontera S.L.',
        phone: '+34 624 111 004',
        specialty: ['artesanía', 'packs regalo', 'despensa'],
        origin: 'Olivenza, Badajoz',
        town: 'Olivenza',
        comarca: 'Olivenza',
        province: 'Badajoz',
        summary:
            'Obrador rayano con productos de despensa y artesanía de corcho.',
        image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80',
    },
];

const productSeeds = [
    ['Ibéricos', 0, 'Jamón ibérico de bellota de dehesa rayana', 129, 18],
    ['Ibéricos', 0, 'Paleta ibérica de bellota curada', 79, 22],
    ['Ibéricos', 0, 'Lomo ibérico adobado con pimentón de la Vera', 28.5, 45],
    ['Ibéricos', 0, 'Chorizo ibérico vela de dehesa', 6.8, 90],
    ['Ibéricos', 0, 'Salchichón ibérico de bellota', 7.2, 80],
    ['Ibéricos', 0, 'Morcilla patatera dulce extremeña', 4.6, 95],
    ['Ibéricos', 0, 'Panceta ibérica curada', 9.4, 50],
    ['Ibéricos', 0, 'Coppa ibérica de la raya', 18.9, 32],
    ['Ibéricos', 0, 'Pack degustación ibérica dehesa', 34.9, 24],
    ['Ibéricos', 0, 'Secreto ibérico adobado', 13.8, 36],
    ['Quesos', 1, 'Torta del Casar D.O.P. pequeña', 12.5, 40],
    ['Quesos', 1, 'Torta del Casar D.O.P. grande', 22.9, 24],
    ['Quesos', 1, 'Queso de los Ibores semicurado', 10.8, 48],
    ['Quesos', 1, 'Queso curado de oveja merina', 18.4, 35],
    ['Quesos', 1, 'Queso de cabra pimentonado', 9.7, 52],
    ['Quesos', 1, 'Crema de queso de oveja', 5.9, 70],
    ['Quesos', 1, 'Queso azul artesano de la sierra', 11.6, 28],
    ['Quesos', 1, 'Queso fresco de cabra rayana', 4.8, 38],
    ['Quesos', 1, 'Tabla de quesos extremeños', 26.5, 20],
    ['Quesos', 1, 'Queso curado en aceite de oliva', 13.2, 34],
    ['Dulces y miel', 2, 'Miel de encina del Tajo Internacional', 8.9, 85],
    ['Dulces y miel', 2, 'Miel de tomillo de la raya', 9.4, 78],
    ['Dulces y miel', 2, 'Miel de azahar del Guadiana', 8.6, 62],
    ['Dulces y miel', 2, 'Mermelada de higo extremeño', 4.8, 95],
    ['Dulces y miel', 2, 'Mermelada de cereza del Jerte', 5.2, 76],
    ['Dulces y miel', 2, 'Perrunillas artesanas', 4.5, 110],
    ['Dulces y miel', 2, 'Flores extremeñas con miel', 5.7, 54],
    ['Dulces y miel', 2, 'Técula mécula tradicional', 13.9, 22],
    ['Dulces y miel', 2, 'Bombones de higo y almendra', 7.8, 46],
    ['Dulces y miel', 2, 'Bollas de chicharrón dulces', 5.1, 40],
    ['Alimentación', 3, 'Pimentón de la Vera dulce', 4.2, 120],
    ['Alimentación', 3, 'Pimentón de la Vera picante', 4.2, 105],
    ['Alimentación', 3, 'Aceite de oliva virgen extra Gata-Hurdes', 14.9, 64],
    ['Alimentación', 3, 'Aceitunas rayadas aliñadas', 3.9, 88],
    ['Alimentación', 3, 'Garbanzos de Valencia de Alcántara', 3.4, 95],
    ['Alimentación', 3, 'Lenteja pardina de Tierra de Barros', 3.2, 90],
    ['Alimentación', 3, 'Arroz de las Vegas del Guadiana', 2.9, 110],
    ['Alimentación', 3, 'Patatera untable con aceite de oliva', 5.6, 44],
    ['Alimentación', 3, 'Caldereta extremeña en conserva', 7.5, 38],
    ['Alimentación', 3, 'Setas de temporada en aceite', 6.8, 42],
    ['Bebidas', 3, 'Vino tinto Ribera del Guadiana crianza', 8.9, 58],
    ['Bebidas', 3, 'Vino blanco joven de Tierra de Barros', 6.7, 62],
    ['Bebidas', 3, 'Licor de cereza del Jerte', 11.5, 40],
    ['Bebidas', 3, 'Aguardiente de bellota', 13.4, 26],
    ['Bebidas', 3, 'Mosto artesanal de uva tinta', 4.1, 48],
    ['Artesanía', 3, 'Posavasos de corcho natural', 12.5, 35],
    ['Artesanía', 3, 'Caja regalo de corcho y madera', 18.9, 28],
    ['Artesanía', 3, 'Cesta de esparto para despensa', 22.5, 18],
    ['Packs regalo', 3, 'Pack sabores de la raya', 39.9, 20],
    ['Packs regalo', 3, 'Pack desayuno rayano miel y dulces', 24.9, 26],
];

const reviewComments = [
    ['Muy buen producto', 'Llegó en perfecto estado y con un sabor auténtico.'],
    ['Repetiré seguro', 'La calidad se nota y el envío fue rápido.'],
    [
        'Sabor de la zona',
        'Me recordó a productos comprados directamente en el pueblo.',
    ],
    [
        'Buena presentación',
        'El embalaje llegó cuidado y el producto mantiene muy buena textura.',
    ],
    [
        'Compra recomendable',
        'Relación calidad-precio muy correcta para una despensa especial.',
    ],
];

const slugify = (value) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const skuPart = (value, length = 3) =>
    slugify(value)
        .replace(/-/g, '')
        .toUpperCase()
        .slice(0, length)
        .padEnd(length, 'X');

const productImage = (categoryName, productName) => {
    const key = slugify(categoryName);
    const categoryKey = key.includes('dulces')
        ? 'dulces'
        : key.includes('packs')
          ? 'packs'
          : key;
    return {
        url: IMAGE_BY_CATEGORY[categoryKey] || IMAGE_BY_CATEGORY.alimentacion,
        name: productName,
        alt: productName,
    };
};

const connect = async () => {
    if (!MONGO_URI) {
        throw new Error('MONGO_URI, MONGODB_URI or MONGODB_URI2 is required');
    }
    await mongoose.connect(MONGO_URI);
};

const upsertUser = async (data, passwordHash) => {
    return await User.findOneAndUpdate(
        { email: data.email },
        {
            $set: {
                ...data,
                password: passwordHash,
                emailVerified: true,
                emailVerificationTokenHash: null,
                emailVerificationExpiresAt: null,
            },
        },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );
};

const upsertCategories = async () => {
    const map = new Map();
    for (const [name, description] of categories) {
        let category = await Category.findOne({ name });
        if (!category) {
            category = new Category({ name, description, slug: slugify(name) });
        } else {
            category.description = description;
            category.slug = category.slug || slugify(name);
        }
        await category.save();
        map.set(name, category);
    }
    return map;
};

const upsertSuppliers = async (passwordHash) => {
    const suppliers = [];
    for (const [index, seed] of supplierSeeds.entries()) {
        const user = await upsertUser(
            {
                name: seed.name,
                email: seed.email,
                phone: seed.phone,
                role: 'supplier',
                address: {
                    country: 'España',
                    street: 'Calle Mayor ' + (index + 3),
                    codePostal: '10' + String(index + 100).slice(-3),
                    city: seed.town,
                },
            },
            passwordHash,
        );

        const supplier = await Supplier.findOneAndUpdate(
            { supplierCode: seed.code },
            {
                $set: {
                    userId: user._id,
                    supplierCode: seed.code,
                    name: seed.name,
                    legalName: seed.legalName,
                    slug: slugify(seed.name),
                    shortDescription: seed.summary,
                    description:
                        seed.summary +
                        ' Trabaja con materias primas de cercanía y mantiene una elaboración reconocible dentro de la identidad rayana.',
                    story: 'Proyecto familiar vinculado a la frontera cultural entre Extremadura y Portugal.',
                    specialties: seed.specialty,
                    origin: seed.origin,
                    email: seed.email,
                    phone: seed.phone,
                    address: {
                        country: 'España',
                        street: 'Calle Mayor ' + (index + 3),
                        codePostal: '10' + String(index + 100).slice(-3),
                        city: seed.town,
                    },
                    location: {
                        country: 'España',
                        region: seed.province,
                        province: seed.province,
                        comarca: seed.comarca,
                        town: seed.town,
                        postalCode: '10' + String(index + 100).slice(-3),
                        address: 'Calle Mayor ' + (index + 3),
                    },
                    contact: {
                        contactPerson: 'Responsable de ' + seed.name,
                        email: seed.email,
                        phone: seed.phone,
                        website: 'https://example.com/' + slugify(seed.name),
                        instagram: '@' + slugify(seed.name).replace(/-/g, ''),
                    },
                    business: {
                        taxName: seed.legalName,
                        taxId: 'B10' + String(index + 230001),
                        invoiceEmail: seed.email,
                    },
                    logo: {
                        url: seed.image,
                        name: 'Logo ' + seed.name,
                        alt: seed.name,
                    },
                    mainImage: {
                        url: seed.image,
                        name: 'Imagen principal ' + seed.name,
                        alt: seed.name,
                    },
                    gallery: [
                        {
                            url: seed.image,
                            name: 'Origen ' + seed.name,
                            alt: seed.name,
                            isMain: true,
                        },
                    ],
                    certifications: {
                        artisan: true,
                        ecological: index === 2,
                        dop: index === 1,
                        igp: index === 0,
                        localProduct: true,
                        familyProduction: true,
                        noIntermediaries: true,
                    },
                    status: 'active',
                    featured: true,
                    reviewedAt: new Date(),
                    rejectionReason: '',
                },
            },
            {
                returnDocument: 'after',
                upsert: true,
                setDefaultsOnInsert: true,
            },
        );
        suppliers.push(supplier);
    }
    return suppliers;
};

const upsertClients = async (passwordHash) => {
    const clients = [];
    for (let index = 1; index <= 20; index += 1) {
        const padded = String(index).padStart(2, '0');
        clients.push(
            await upsertUser(
                {
                    name: 'Cliente Rayano ' + padded,
                    email: `cliente${padded}.demo@rayana.test`,
                    phone: '+34 620 200 ' + String(100 + index),
                    role: 'user',
                    address: {
                        country: 'España',
                        street: 'Calle de la Raya ' + index,
                        codePostal: '10' + String(200 + index),
                        city: index % 2 === 0 ? 'Badajoz' : 'Cáceres',
                    },
                },
                passwordHash,
            ),
        );
    }
    return clients;
};

const upsertProducts = async (categoryMap, suppliers) => {
    const products = [];
    for (const [
        index,
        [categoryName, supplierIndex, name, price, stock],
    ] of productSeeds.entries()) {
        const category = categoryMap.get(categoryName);
        const supplier = suppliers[supplierIndex];
        const supplierSeed = supplierSeeds[supplierIndex];
        const sku = [
            'LDR',
            skuPart(categoryName),
            supplier.supplierCode,
            String(index + 1).padStart(3, '0'),
        ].join('-');
        const image = productImage(categoryName, name);
        const shortDescription =
            name +
            ' elaborado o seleccionado en la Raya extremeña con identidad local.';

        const product = await Product.findOneAndUpdate(
            { sku },
            {
                $set: {
                    name,
                    sku,
                    price,
                    shortDescription,
                    description: `<h2>${name}</h2><p>${shortDescription}</p><p>Producto de prueba pensado para validar catálogo, ficha de producto, carrito, pedidos, reseñas y paneles de proveedor dentro de La Despensa Rayana.</p>`,
                    stock,
                    status: 'published',
                    rejectionReason: '',
                    reviewedAt: new Date(),
                    offer:
                        index % 9 === 0
                            ? {
                                  type: 'percent',
                                  value: 10,
                                  label: '10% dto. demo',
                                  active: true,
                                  validFrom: new Date(),
                                  validUntil: new Date(
                                      Date.now() + 1000 * 60 * 60 * 24 * 45,
                                  ),
                              }
                            : {
                                  type: 'none',
                                  value: 0,
                                  bundleQuantity: 0,
                                  bundlePayQuantity: 0,
                                  label: '',
                                  active: false,
                              },
                    category: category._id,
                    supplierRef: supplier._id,
                    supplier: {
                        id: supplierIndex + 1,
                        supplierCode: supplier.supplierCode,
                        status: supplier.status,
                        name: supplier.name,
                        images: [
                            {
                                url: supplierSeed.image,
                                name: supplier.name,
                            },
                        ],
                    },
                    images: [
                        image,
                        {
                            ...image,
                            name: name + ' detalle',
                            alt: name + ' detalle',
                        },
                    ],
                },
            },
            {
                returnDocument: 'after',
                upsert: true,
                setDefaultsOnInsert: true,
            },
        );
        products.push(product);
    }
    return products;
};

const attachExistingProducts = async (supplier) => {
    const result = await Product.updateMany(
        {
            $or: [{ supplierRef: { $exists: false } }, { supplierRef: null }],
        },
        {
            $set: {
                supplierRef: supplier._id,
                supplier: {
                    id: 1,
                    supplierCode: supplier.supplierCode,
                    status: supplier.status,
                    name: supplier.name,
                    images: supplier.mainImage?.url
                        ? [
                              {
                                  url: supplier.mainImage.url,
                                  name: supplier.name,
                              },
                          ]
                        : [],
                },
            },
            $setOnInsert: {
                status: 'published',
            },
        },
    );
    return result.modifiedCount || 0;
};

const upsertReviews = async (clients, products) => {
    let total = 0;
    for (const [clientIndex, client] of clients.entries()) {
        const productIndexes = [
            clientIndex % products.length,
            (clientIndex + 11) % products.length,
            (clientIndex + 27) % products.length,
        ];

        for (const [offset, productIndex] of productIndexes.entries()) {
            const product = products[productIndex];
            const [title, comment] =
                reviewComments[(clientIndex + offset) % reviewComments.length];
            await Review.findOneAndUpdate(
                { product: product._id, user: client._id },
                {
                    $set: {
                        product: product._id,
                        user: client._id,
                        rating: 4 + ((clientIndex + offset) % 2),
                        title,
                        comment,
                    },
                },
                {
                    returnDocument: 'after',
                    upsert: true,
                    setDefaultsOnInsert: true,
                },
            );
            total += 1;
        }
    }
    return total;
};

const run = async () => {
    await connect();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const categoryMap = await upsertCategories();
    const suppliers = await upsertSuppliers(passwordHash);
    const clients = await upsertClients(passwordHash);
    const products = await upsertProducts(categoryMap, suppliers);
    const attachedProducts = await attachExistingProducts(suppliers[0]);
    const reviews = await upsertReviews(clients, products);

    console.log(
        JSON.stringify(
            {
                suppliers: suppliers.length,
                clients: clients.length,
                products: products.length,
                reviews,
                existingProductsAttachedToDemoSupplier: attachedProducts,
                demoPassword: DEMO_PASSWORD,
            },
            null,
            2,
        ),
    );
};

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
