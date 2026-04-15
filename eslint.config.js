import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    eslintConfigPrettier,
    {
        rules: {
            // Variables/argumentos con prefijo "_" se consideran intencionalmente
            // no usados (patrones como `const { password: _pw, ...rest } = ...`
            // o error handlers de Express con firma `(err, req, res, _next)`).
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            'no-console': 'warn',
        },
    },
    // En los archivos de test habilitamos los globals inyectados por Jest
    // (describe, test, beforeAll, etc.) para no tener que importarlos uno a uno.
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                test: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                jest: 'readonly',
            },
        },
    },
];

//Flujo completo al hacer un commit
//git commit -m "feat: nueva pantalla de perfil"
//         │
//         ▼
//   [pre-commit]
//   lint-staged → ESLint --fix → Prettier --write
//   (solo archivos en staging)
//         │
//         ▼ (si pasa)
//   [commit-msg]
//   commitlint → valida formato del mensaje
//         │
//         ▼ (si pasa)
//   ✅ Commit creado
