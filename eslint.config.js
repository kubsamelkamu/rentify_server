import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig({
  env: {
    node: true,  
    es2021: true, 
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: {
    js,
  },
  extends: [
    "js/recommended",
  ],

  overrides: [
    {
      files: ["client/**/*.js"],
      env: {
        browser: true,
        node: false,
      },
      languageOptions: {
        globals: globals.browser,
      },
    },
  ],
});
