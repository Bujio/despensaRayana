import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    eslintConfigPrettier,
    {
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'warn',
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
