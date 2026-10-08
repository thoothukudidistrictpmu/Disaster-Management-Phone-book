/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5d155c7a'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "6f647550b1ef3726b44faacf074ec34d"
  }, {
    "url": "pwa-512x512.png",
    "revision": "1ecd496e0108a17a424d23a821d15c05"
  }, {
    "url": "pwa-192x192.png",
    "revision": "533cfbba8f7004cce2782aa22ea62721"
  }, {
    "url": "index.html",
    "revision": "f3749b6546a462af0e224e8469018b5d"
  }, {
    "url": "icon.svg",
    "revision": "7ce60769c13cb8aaaffa6504078c211c"
  }, {
    "url": "favicon.ico",
    "revision": "892dbe8b23f7714aab93a3dfc3e73081"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e06de5eda94a00bae1686f5a5eef1546"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-CmROXX8n.js",
    "revision": null
  }, {
    "url": "assets/index-COV3uww_.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e06de5eda94a00bae1686f5a5eef1546"
  }, {
    "url": "favicon.ico",
    "revision": "892dbe8b23f7714aab93a3dfc3e73081"
  }, {
    "url": "icon.svg",
    "revision": "7ce60769c13cb8aaaffa6504078c211c"
  }, {
    "url": "pwa-192x192.png",
    "revision": "533cfbba8f7004cce2782aa22ea62721"
  }, {
    "url": "pwa-512x512.png",
    "revision": "1ecd496e0108a17a424d23a821d15c05"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "6f647550b1ef3726b44faacf074ec34d"
  }, {
    "url": "manifest.webmanifest",
    "revision": "f634d09ec671a41fa8f7eda754afb3f2"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/\/api\/contacts/i, new workbox.NetworkFirst({
    "cacheName": "contacts-api-cache",
    "networkTimeoutSeconds": 3,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 5,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
