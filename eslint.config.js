// ESLint flat config for GJS / GNOME Shell code. Modelled on the rules GNOME Shell and
// gnome-shell-extensions use (lint/eslintrc-gjs.yml). Development only; not shipped.
import js from '@eslint/js';
import globals from 'globals';

const gjsGlobals = {
    ARGV: 'readonly',
    Debugger: 'readonly',
    GIRepositoryGType: 'readonly',
    global: 'readonly', // GNOME Shell's Shell.Global
    globalThis: 'readonly',
    imports: 'readonly',
    Intl: 'readonly',
    log: 'readonly',
    logError: 'readonly',
    print: 'readonly',
    printerr: 'readonly',
    console: 'readonly',
    TextDecoder: 'readonly',
    TextEncoder: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
};

export default [
    {ignores: ['dist/**', 'node_modules/**', '.specify/**', '.claude/**']},
    js.configs.recommended,
    {
        files: ['extension/**/*.js', 'tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {...globals.es2021, ...gjsGlobals},
        },
        rules: {
            'array-bracket-newline': ['error', 'consistent'],
            'array-bracket-spacing': ['error', 'never'],
            'arrow-parens': ['error', 'as-needed'],
            'arrow-spacing': 'error',
            'block-spacing': 'error',
            'brace-style': ['error', '1tbs', {allowSingleLine: true}],
            'comma-dangle': ['error', 'always-multiline'],
            'comma-spacing': 'error',
            'comma-style': 'error',
            'curly': ['error', 'multi-or-nest', 'consistent'],
            'dot-location': ['error', 'property'],
            'eol-last': 'error',
            'eqeqeq': ['error', 'smart'],
            'func-call-spacing': 'error',
            'indent': ['error', 4, {
                SwitchCase: 0,
                ignoredNodes: [
                    'CallExpression > ArrowFunctionExpression',
                    'TemplateLiteral *',
                    // GObject.registerClass(\nclass Foo extends ... {}) idiom
                    'CallExpression[callee.object.name=GObject][callee.property.name=registerClass] > ClassExpression:first-child',
                ],
                MemberExpression: 'off',
            }],
            'key-spacing': ['error', {mode: 'minimum', beforeColon: false, afterColon: true}],
            'keyword-spacing': 'error',
            'linebreak-style': ['error', 'unix'],
            'no-empty': ['error', {allowEmptyCatch: true}],
            'no-implicit-coercion': ['error', {allow: ['!!']}],
            'no-multi-spaces': ['error', {ignoreEOLComments: true}],
            'no-multiple-empty-lines': ['error', {max: 1}],
            'no-prototype-builtins': 'off',
            'no-restricted-globals': ['error', 'window'],
            'no-shadow': 'error',
            'no-tabs': 'error',
            'no-trailing-spaces': 'error',
            'no-unused-vars': ['error', {
                varsIgnorePattern: '^_',
                argsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
            'no-useless-constructor': 'error',
            'no-var': 'error',
            'object-curly-spacing': ['error', 'never'],
            'object-shorthand': 'error',
            'prefer-arrow-callback': 'error',
            'prefer-const': 'error',
            'prefer-template': 'error',
            'quotes': ['error', 'single', {avoidEscape: true}],
            'semi': ['error', 'always'],
            'semi-spacing': 'error',
            'space-before-blocks': 'error',
            'space-before-function-paren': ['error', {
                named: 'never',
                anonymous: 'always',
                asyncArrow: 'always',
            }],
            'space-in-parens': 'error',
            'space-infix-ops': 'error',
            'space-unary-ops': 'error',
            'template-curly-spacing': 'error',
        },
    },
    {
        // Logic in lib/ must run under plain gjs (constitution, Principle VI).
        files: ['extension/lib/**/*.js'],
        rules: {
            'no-restricted-imports': ['error', {
                patterns: [{
                    regex: '^(gi://(St|Clutter|Meta|Shell|Mtk|GnomeDesktop)|resource:///org/gnome/shell/)',
                    message: 'extension/lib/ must not import Shell UI modules; put UI code in extension/ui/.',
                }],
            }],
        },
    },
];
