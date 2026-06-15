import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inclut le worker pdfjs dans le bundle serveur de la route d'import de ticket
  // (résolu à l'exécution → sinon non tracé et absent en production).
  outputFileTracingIncludes: {
    '/api/parse-receipt': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
  },
};

export default nextConfig;
