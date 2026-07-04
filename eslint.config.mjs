import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "_next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "research/**",
    "404.html",
    "_not-found.html",
    "_not-found/**",
    "__next.*.txt",
    "index.html",
    "index.txt",
  ]),
]);

export default eslintConfig;
