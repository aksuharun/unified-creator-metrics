import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import stylistic from "@stylistic/eslint-plugin"
import tseslint from "typescript-eslint"

export default defineConfig([
    {
        ignores: ["dist/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly",
            },
        },
    },
    {
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "@stylistic/indent": ["error", 4],
            "@stylistic/semi": ["error", "never"],
            "@stylistic/member-delimiter-style": [
                "error",
                {
                    multiline: {
                        delimiter: "none",
                        requireLast: false,
                    },
                    singleline: {
                        delimiter: "comma",
                        requireLast: false,
                    },
                    multilineDetection: "brackets",
                },
            ],
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/eol-last": "error",
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
        },
    },
])
