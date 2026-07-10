import 'dotenv/config';
import mongoose from 'mongoose';
import { Category } from '../src/db/models/category.model.js';
import { Product } from '../src/db/models/product.model.js';

const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGODB_URI2;

const COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php';
const OPEN_FOOD_FACTS_API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const USER_AGENT =
    'LaDespensaRayanaDemoImageSeeder/2.0 (free-use product image update)';
const MAX_IMAGES_PER_PRODUCT = 5;
const MIN_IMAGE_WIDTH = 360;
const MIN_IMAGE_HEIGHT = 260;

const normalizeText = (value = '') =>
    String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const unique = (items) =>
    items
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .filter((item, index, list) => list.indexOf(item) === index);

const cleanImageTitle = (title = '') =>
    title
        .replace(/^File:/, '')
        .replace(/_/g, ' ')
        .replace(/\.[a-z0-9]+$/i, '');

const categoryKey = (categoryName = '') => {
    const key = normalizeText(categoryName);
    if (key.includes('iberic')) return 'ibericos';
    if (key.includes('ques')) return 'quesos';
    if (key.includes('dulces') || key.includes('miel')) return 'dulces';
    if (key.includes('bebidas')) return 'bebidas';
    if (key.includes('artesania')) return 'artesania';
    if (key.includes('pack')) return 'packs';
    return 'alimentacion';
};

const categoryFallbacks = {
    alimentacion: {
        queries: ['spanish olive oil', 'paprika spice', 'spanish legumes'],
        required: ['olive', 'paprika', 'legumes', 'food'],
    },
    ibericos: {
        queries: ['jamon iberico', 'spanish cured ham', 'chorizo iberico'],
        required: ['jamon', 'ham', 'chorizo', 'sausage', 'pork'],
    },
    quesos: {
        queries: [
            'Torta del Casar',
            'spanish cheese',
            'goat cheese',
            'sheep cheese',
        ],
        required: ['cheese', 'queso', 'torta', 'casar'],
    },
    dulces: {
        queries: ['honey jar', 'fig jam', 'spanish pastry', 'almond cake'],
        required: ['honey', 'jam', 'pastry', 'cake', 'miel'],
    },
    bebidas: {
        queries: ['spanish wine bottle', 'liqueur bottle', 'red wine bottle'],
        required: ['wine', 'vino', 'bottle', 'liqueur'],
    },
    artesania: {
        queries: ['cork craft', 'cork product', 'wicker basket'],
        required: ['cork', 'basket', 'craft', 'corcho'],
    },
    packs: {
        queries: ['gourmet hamper', 'food gift basket', 'gift box food'],
        required: ['gift', 'basket', 'hamper', 'food'],
    },
};

const manualImageOverrides = {
    'LDR-BEB-COR237-045': [
        [
            'https://images.openfoodfacts.org/images/products/000/008/410/9576/front_en.8.400.jpg',
            'Mosto de uva - Open Food Facts',
        ],
        [
            'https://images.openfoodfacts.org/images/products/841/040/901/9664/front_es.39.400.jpg',
            'Mosto Greip - Open Food Facts',
        ],
        [
            'https://images.openfoodfacts.org/images/products/843/187/600/1686/front_es.10.400.jpg',
            'Mosto tinto - Open Food Facts',
        ],
        [
            'https://images.openfoodfacts.org/images/products/841/040/901/9657/front_es.20.400.jpg',
            'Mosto - Open Food Facts',
        ],
        [
            'https://images.openfoodfacts.org/images/products/841/028/021/1645/front_es.16.400.jpg',
            'Mosto uva - Open Food Facts',
        ],
    ],
    'LDR-DUL-MIL236-025': [
        [
            'https://images.openfoodfacts.org/images/products/841/017/507/6847/front_es.3.400.jpg',
            'Mermelada extra de cereza - Open Food Facts',
        ],
        [
            'https://images.openfoodfacts.org/images/products/202/400/009/5307/front_es.3.400.jpg',
            'Mermelada extra de cereza negra - Open Food Facts',
        ],
        [
            'https://images.openfoodfacts.org/images/products/841/254/090/0580/front_es.18.400.jpg',
            'Confiture de cerise - Open Food Facts',
        ],
        [
            'https://images.openfoodfacts.org/images/products/541/098/603/2400/front_fr.28.400.jpg',
            'Mermelada de cereza - Open Food Facts',
        ],
        [
            'https://images.openfoodfacts.org/images/products/841/013/402/2885/front_es.3.400.jpg',
            'Mermelada de cerezas - Open Food Facts',
        ],
    ],
    'LDR-IBE-RAY234-001': [
        [
            'https://upload.wikimedia.org/wikipedia/commons/3/3c/Jamon_Iberico_de_Bellota_served.jpg',
            'Jamon Iberico de Bellota served - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Jamon_iberico_joselita.jpg/960px-Jamon_iberico_joselita.jpg',
            'Jamon iberico joselita - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Jam%C3%B3n_ib%C3%A9rico_%28La_Boqueria%29.jpg/960px-Jam%C3%B3n_ib%C3%A9rico_%28La_Boqueria%29.jpg',
            'Jamon iberico La Boqueria - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Jam%C3%B3n_ib%C3%A9rico_tapa.jpg/960px-Jam%C3%B3n_ib%C3%A9rico_tapa.jpg',
            'Jamon iberico tapa - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Jamon_iberico_de_bellota_%28cinco_jotas%29.jpg/960px-Jamon_iberico_de_bellota_%28cinco_jotas%29.jpg',
            'Jamon iberico de bellota - Wikimedia Commons',
        ],
    ],
    'LDR-QUE-QSR235-012': [
        [
            'https://upload.wikimedia.org/wikipedia/commons/f/f9/Torta_del_Casar.jpg',
            'Torta del Casar - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/WikiCheese_-_Tortita_01.jpg/960px-WikiCheese_-_Tortita_01.jpg',
            'Tortita cheese view 01 - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/WikiCheese_-_Tortita_03.jpg/960px-WikiCheese_-_Tortita_03.jpg',
            'Tortita cheese view 03 - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/WikiCheese_-_Tortita_04.jpg/960px-WikiCheese_-_Tortita_04.jpg',
            'Tortita cheese view 04 - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Torta_del_Casar_DOP.jpg/960px-Torta_del_Casar_DOP.jpg',
            'Torta del Casar DOP - Wikimedia Commons',
        ],
    ],
    'LDR-PAC-COR237-049': [
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Gourmet_Breakfast_Hamper_with_fresh_homemade_bread_at_Witches_Falls_Cottages_%2812064326114%29.jpg/960px-Gourmet_Breakfast_Hamper_with_fresh_homemade_bread_at_Witches_Falls_Cottages_%2812064326114%29.jpg',
            'Gourmet food hamper - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Basket_of_food_MET_183134.jpg/960px-Basket_of_food_MET_183134.jpg',
            'Basket of food - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Wrapped_fruit_basket.jpg/960px-Wrapped_fruit_basket.jpg',
            'Wrapped fruit basket - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/2/29/Orange_gift_baskets_%289390516489%29.jpg',
            'Orange gift baskets - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Exotic_Fruit_Gift_Basket_%284461109309%29.jpg/960px-Exotic_Fruit_Gift_Basket_%284461109309%29.jpg',
            'Exotic fruit gift basket - Wikimedia Commons',
        ],
    ],
    'LDR-PAC-COR237-050': [
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Bread_basket_%283854269312%29.jpg/960px-Bread_basket_%283854269312%29.jpg',
            'Bread basket - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Homemade_bread_at_Witches_Falls_Cottages_%285798895152%29.jpg/960px-Homemade_bread_at_Witches_Falls_Cottages_%285798895152%29.jpg',
            'Homemade bread hamper - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Egg-In-The-Basket-2007.jpg/960px-Egg-In-The-Basket-2007.jpg',
            'Breakfast basket - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Polish_Easter_Breakfast_with_Blessing_Easter_Basket%2C_Krak%C3%B3w%2C_2022%2C_01.jpg/960px-Polish_Easter_Breakfast_with_Blessing_Easter_Basket%2C_Krak%C3%B3w%2C_2022%2C_01.jpg',
            'Breakfast food basket - Wikimedia Commons',
        ],
        [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Polish_Easter_Breakfast_with_Blessing_Easter_Basket%2C_Krak%C3%B3w%2C_2022%2C_02.jpg/960px-Polish_Easter_Breakfast_with_Blessing_Easter_Basket%2C_Krak%C3%B3w%2C_2022%2C_02.jpg',
            'Breakfast food basket detail - Wikimedia Commons',
        ],
    ],
};
const profileRules = [
    {
        match: ['pimenton'],
        queries: ['Pimenton de la Vera', 'paprika spice', 'smoked paprika'],
        required: ['pimenton', 'paprika'],
    },
    {
        match: ['aceite'],
        queries: [
            'extra virgin olive oil bottle',
            'olive oil bottle',
            'spanish olive oil',
        ],
        required: ['olive', 'oil', 'aceite'],
    },
    {
        match: ['aceituna'],
        queries: ['green olives', 'marinated olives', 'spanish olives'],
        required: ['olive', 'aceituna'],
    },
    {
        match: ['garbanzo'],
        queries: ['chickpeas', 'dried chickpeas', 'garbanzos'],
        required: ['chickpea', 'garbanzo'],
    },
    {
        match: ['lenteja'],
        queries: ['lentils', 'brown lentils', 'lentejas'],
        required: ['lentil', 'lenteja'],
    },
    {
        match: ['arroz'],
        queries: ['rice grains', 'rice bag', 'arroz'],
        required: ['rice', 'arroz'],
    },
    {
        match: ['patatera'],
        queries: ['morcilla patatera', 'chorizo sausage', 'spanish sausage'],
        required: ['patatera', 'chorizo', 'sausage', 'morcilla'],
    },
    {
        match: ['caldereta'],
        queries: ['spanish lamb stew', 'lamb stew', 'caldereta'],
        required: ['stew', 'caldereta', 'lamb'],
    },
    {
        match: ['setas'],
        queries: ['mushrooms jar', 'mushrooms in oil', 'mushrooms'],
        required: ['mushroom', 'setas'],
    },
    {
        match: ['corcho'],
        queries: ['cork craft', 'cork product', 'cork oak craft'],
        required: ['cork', 'corcho'],
    },
    {
        match: ['cesta', 'esparto'],
        queries: ['wicker basket', 'handmade basket', 'gift basket'],
        required: ['basket', 'cesta'],
    },
    {
        match: ['vino tinto'],
        queries: [
            'Ribera del Guadiana wine',
            'spanish red wine bottle',
            'red wine bottle',
        ],
        required: ['wine', 'vino', 'bottle'],
    },
    {
        match: ['vino blanco'],
        queries: [
            'white wine',
            'white wine bottle',
            'spanish white wine',
            'wine bottle',
        ],
        required: ['wine', 'vino', 'bottle', 'grape'],
    },
    {
        match: ['licor'],
        queries: [
            'cherry brandy',
            'cherry liqueur',
            'kirsch bottle',
            'liqueur bottle',
        ],
        required: ['cherry', 'liqueur', 'licor', 'bottle', 'brandy', 'kirsch'],
    },
    {
        match: ['aguardiente'],
        queries: ['liquor bottle', 'spirit bottle', 'aguardiente'],
        required: ['liquor', 'spirit', 'bottle', 'aguardiente'],
    },
    {
        match: ['mosto'],
        queries: ['grape juice bottle', 'grape must', 'grapes bottle'],
        required: ['grape', 'bottle', 'mosto'],
    },
    {
        match: ['miel'],
        queries: ['honey jar', 'raw honey jar', 'spanish honey'],
        required: ['honey', 'miel'],
    },
    {
        match: ['mermelada'],
        queries: ['fig jam jar', 'fruit jam jar', 'mermelada'],
        required: ['jam', 'mermelada'],
    },
    {
        match: ['perrunilla'],
        queries: ['perrunillas', 'spanish cookies', 'butter cookies'],
        required: ['cookie', 'perrunilla', 'biscuit'],
    },
    {
        match: ['flores'],
        queries: ['fried pastry', 'spanish pastry', 'honey pastry'],
        required: ['pastry', 'fried', 'sweet'],
    },
    {
        match: ['tecula'],
        queries: ['almond cake', 'marzipan cake', 'spanish almond cake'],
        required: ['cake', 'almond'],
    },
    {
        match: ['bombones'],
        queries: ['fig chocolate', 'chocolate pralines', 'chocolate bonbons'],
        required: ['chocolate', 'fig', 'praline'],
    },
    {
        match: ['chicharron'],
        queries: ['sweet bread', 'spanish pastry', 'pork crackling bread'],
        required: ['bread', 'pastry', 'chicharron'],
    },
    {
        match: ['jamon'],
        queries: ['jamon iberico', 'spanish cured ham', 'iberian ham'],
        required: ['jamon', 'ham', 'iberico', 'iberian'],
    },
    {
        match: ['paleta'],
        queries: ['paleta iberica', 'spanish cured ham', 'cured ham'],
        required: ['paleta', 'ham', 'iberic'],
    },
    {
        match: ['lomo'],
        queries: ['lomo iberico', 'cured pork loin', 'pork loin'],
        required: ['lomo', 'loin', 'pork'],
    },
    {
        match: ['chorizo'],
        queries: ['chorizo iberico', 'chorizo sausage', 'spanish chorizo'],
        required: ['chorizo', 'sausage'],
    },
    {
        match: ['salchichon'],
        queries: ['salchichon', 'cured sausage', 'spanish salami'],
        required: ['salchichon', 'sausage', 'salami'],
    },
    {
        match: ['morcilla'],
        queries: ['morcilla', 'blood sausage', 'spanish sausage'],
        required: ['morcilla', 'sausage'],
    },
    {
        match: ['panceta'],
        queries: ['pancetta', 'cured pork belly', 'pork belly'],
        required: ['pancetta', 'pork'],
    },
    {
        match: ['coppa'],
        queries: ['coppa cured pork', 'cured pork', 'pork charcuterie'],
        required: ['coppa', 'pork', 'cured'],
    },
    {
        match: ['secreto'],
        queries: ['iberian pork', 'pork meat', 'secreto iberico'],
        required: ['pork', 'iberian', 'secreto'],
    },
    {
        match: ['torta', 'casar'],
        queries: ['Torta del Casar', 'torta casar cheese', 'spanish cheese'],
        required: ['torta', 'casar', 'cheese', 'queso'],
    },
    {
        match: ['ibores'],
        queries: ['Queso Ibores', 'goat cheese', 'spanish cheese'],
        required: ['ibores', 'cheese', 'queso'],
    },
    {
        match: ['oveja'],
        queries: ['sheep cheese', 'spanish sheep cheese', 'queso de oveja'],
        required: ['sheep', 'cheese', 'oveja', 'queso'],
    },
    {
        match: ['cabra'],
        queries: ['goat cheese', 'spanish goat cheese', 'queso de cabra'],
        required: ['goat', 'cheese', 'cabra', 'queso'],
    },
    {
        match: ['queso azul'],
        queries: ['blue cheese', 'spanish blue cheese', 'artisan blue cheese'],
        required: ['blue', 'cheese', 'queso'],
    },
    {
        match: ['queso fresco'],
        queries: ['fresh goat cheese', 'fresh cheese', 'queso fresco'],
        required: ['fresh', 'cheese', 'queso'],
    },
    {
        match: ['queso'],
        queries: ['spanish cheese', 'cheese wheel', 'artisan cheese'],
        required: ['cheese', 'queso'],
    },
    {
        match: ['pack'],
        queries: [
            'gourmet food hamper',
            'food gift basket',
            'gift box food',
            'spanish food basket',
            'food hamper',
        ],
        required: ['gift', 'basket', 'hamper', 'food', 'gourmet'],
    },
];

const getProductProfile = (product) => {
    const name = normalizeText(product.name || '');
    const categoryName =
        typeof product.category === 'object' ? product.category?.name : '';
    const key = categoryKey(categoryName);
    const fallback = categoryFallbacks[key] || categoryFallbacks.alimentacion;
    const rule = profileRules.find((item) =>
        item.match.every((term) => name.includes(normalizeText(term))),
    );

    return {
        queries: unique([
            ...(rule?.queries || []),
            ...(fallback.queries || []),
        ]).slice(0, 8),
        required: unique([
            ...(rule?.required || []),
            ...(fallback.required || []),
        ]),
    };
};

const hasRequiredTerm = (text, requiredTerms) => {
    const normalized = normalizeText(text);
    return requiredTerms.some((term) =>
        normalized.includes(normalizeText(term)),
    );
};

const hasBlockedTerm = (text) => {
    const normalized = normalizeText(text);
    return [
        'logo',
        'map',
        'flag',
        'coat of arms',
        'escudo',
        'locator',
        'diagram',
        'qr',
        'icon',
        'symbol',
        'portrait',
        'church',
        'building',
        'street',
        'people',
        'person',
    ].some((term) => normalized.includes(term));
};

const isUsableCommonsImage = (imageInfo, title, profile) => {
    if (!imageInfo) return false;
    if (!/^image\/(jpeg|png|webp)$/i.test(imageInfo.mime || '')) return false;
    if (Number(imageInfo.width || 0) < MIN_IMAGE_WIDTH) return false;
    if (Number(imageInfo.height || 0) < MIN_IMAGE_HEIGHT) return false;

    const license = String(
        imageInfo.extmetadata?.LicenseShortName?.value ||
            imageInfo.extmetadata?.UsageTerms?.value ||
            '',
    ).toLowerCase();

    if (
        license.includes('noncommercial') ||
        license.includes('no derivatives')
    ) {
        return false;
    }

    const cleanTitle = cleanImageTitle(title);
    return (
        !hasBlockedTerm(cleanTitle) &&
        hasRequiredTerm(cleanTitle, profile.required)
    );
};

const fetchCommonsImages = async (query, profile) => {
    const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrnamespace: '6',
        gsrsearch: query,
        gsrlimit: '24',
        prop: 'imageinfo',
        iiprop: 'url|mime|size|extmetadata',
        iiurlwidth: '1200',
        origin: '*',
    });

    const response = await fetch(`${COMMONS_API_URL}?${params.toString()}`, {
        headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) return [];

    const payload = await response.json();
    return Object.values(payload.query?.pages || {})
        .map((page) => {
            const imageInfo = page.imageinfo?.[0];
            if (!isUsableCommonsImage(imageInfo, page.title, profile))
                return null;
            const name = cleanImageTitle(page.title);
            return {
                url: imageInfo.thumburl || imageInfo.url,
                name: `${name} - Wikimedia Commons`,
            };
        })
        .filter(Boolean);
};

const getOpenFoodFactsImageUrl = (product) =>
    product.image_front_url ||
    product.image_url ||
    product.selected_images?.front?.display?.es ||
    product.selected_images?.front?.display?.en ||
    product.selected_images?.front?.small?.es ||
    product.selected_images?.front?.small?.en ||
    '';

const fetchOpenFoodFactsImages = async (query, profile) => {
    const params = new URLSearchParams({
        search_terms: query,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: '24',
        fields: 'product_name,generic_name,categories,brands,image_front_url,image_url,selected_images',
    });

    const response = await fetch(
        `${OPEN_FOOD_FACTS_API_URL}?${params.toString()}`,
        {
            headers: { 'User-Agent': USER_AGENT },
        },
    );
    if (!response.ok) return [];

    const payload = await response.json();
    return (payload.products || [])
        .map((item) => {
            const label = [
                item.product_name,
                item.generic_name,
                item.categories,
                item.brands,
            ]
                .filter(Boolean)
                .join(' ');
            const url = getOpenFoodFactsImageUrl(item);
            if (
                !url ||
                !hasRequiredTerm(label, profile.required) ||
                hasBlockedTerm(label)
            ) {
                return null;
            }
            return {
                url,
                name: `${item.product_name || item.generic_name || query} - Open Food Facts`,
            };
        })
        .filter(Boolean);
};

const addCandidate = (images, usedUrls, candidate) => {
    if (!candidate?.url || usedUrls.has(candidate.url)) return false;
    usedUrls.add(candidate.url);
    images.push({
        url: candidate.url,
        name: candidate.name,
    });
    return true;
};

const resolveProductImages = async (product, usedUrls) => {
    const profile = getProductProfile(product);
    const images = [];

    for (const [url, name] of manualImageOverrides[product.sku] || []) {
        addCandidate(images, usedUrls, { url, name });
        if (images.length >= MAX_IMAGES_PER_PRODUCT) return images;
    }

    for (const query of profile.queries) {
        const openFoodFactsImages = await fetchOpenFoodFactsImages(
            query,
            profile,
        ).catch(() => []);
        for (const image of openFoodFactsImages) {
            addCandidate(images, usedUrls, image);
            if (images.length >= MAX_IMAGES_PER_PRODUCT) return images;
        }

        const commonsImages = await fetchCommonsImages(query, profile).catch(
            () => [],
        );
        for (const image of commonsImages) {
            addCandidate(images, usedUrls, image);
            if (images.length >= MAX_IMAGES_PER_PRODUCT) return images;
        }
    }

    return images;
};

const run = async () => {
    if (!MONGO_URI) {
        throw new Error('MONGO_URI, MONGODB_URI or MONGODB_URI2 is required');
    }

    await mongoose.connect(MONGO_URI);
    const products = await Product.find({ sku: /^LDR-/ })
        .populate('category', 'name')
        .sort({ sku: 1 });
    const usedUrls = new Set();
    const summary = [];

    for (const product of products) {
        const images = await resolveProductImages(product, usedUrls);
        product.images = images;
        await product.save();
        summary.push({
            sku: product.sku,
            name: product.name,
            images: images.length,
            updated: images.length > 0,
        });
    }

    console.log(
        JSON.stringify(
            {
                products: products.length,
                updated: summary.filter((item) => item.updated).length,
                withoutImages: summary.filter((item) => !item.updated).length,
                totalUniqueImages: usedUrls.size,
                maxImagesPerProduct: MAX_IMAGES_PER_PRODUCT,
                details: summary,
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
        process.exit(process.exitCode || 0);
    });
