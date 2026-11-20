import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Los "// títulos" de la landing son texto decorativo a propósito
      'react/jsx-no-comment-textnodes': 'off',
      // Leer navigator/localStorage al montar es el patrón esperado acá
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];

export default config;
