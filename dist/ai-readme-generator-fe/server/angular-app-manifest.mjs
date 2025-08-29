
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "preload": [
      "chunk-HNGSGT32.js",
      "chunk-BUVZR4ON.js"
    ],
    "route": "/"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-UEDS4J7J.js",
      "chunk-KCSH355S.js",
      "chunk-BUVZR4ON.js"
    ],
    "route": "/dashboard"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-DORD74DI.js"
    ],
    "route": "/auth/callback"
  },
  {
    "renderMode": 0,
    "preload": [
      "chunk-OWPYNUKO.js",
      "chunk-KCSH355S.js",
      "chunk-AOHPX5GM.js",
      "chunk-BUVZR4ON.js"
    ],
    "route": "/generate-readme/*"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-AV7DCLCM.js",
      "chunk-AOHPX5GM.js",
      "chunk-BUVZR4ON.js"
    ],
    "route": "/settings"
  },
  {
    "renderMode": 2,
    "redirectTo": "/",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 1363, hash: 'cb6d7981778f46916c11393f4f2e0652c48847988695e61117b97f772ca802a8', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1154, hash: '435a786494ec0034ec78ff1144efc80180db14a98b0cfb3c7fa1a30522602948', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 39841, hash: '2abc870d83a170b7a798781c176ae175ef5de66eda14af6e76a46985b2387179', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'dashboard/index.html': {size: 28448, hash: '9a278608808801fee8bd13a2b537a141c76ecaff8d5af710a3f1bd5ab35e22b2', text: () => import('./assets-chunks/dashboard_index_html.mjs').then(m => m.default)},
    'settings/index.html': {size: 19637, hash: '2d8ef9968e783e81d074e22514f35d3731a7b4442bd315f0d0c13dab910fa927', text: () => import('./assets-chunks/settings_index_html.mjs').then(m => m.default)},
    'auth/callback/index.html': {size: 39789, hash: '6b9c7b02a3e3b9c6096c3cd8504681c5cdc96fc8a1b1017f1a344873f9049b65', text: () => import('./assets-chunks/auth_callback_index_html.mjs').then(m => m.default)},
    'styles-3ZTCZOKC.css': {size: 1584, hash: 'cZsA6Mw0AjQ', text: () => import('./assets-chunks/styles-3ZTCZOKC_css.mjs').then(m => m.default)}
  },
};
