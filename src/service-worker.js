// service-worker.js

// Service Worker 缓存名称(版本号)
const CACHE_NAME = "my-site-cache-v2";

// 需要缓存的资源
const urlsToCache = [
  "/src/assets/styles/style.css",
  "/src/main.js",
  "/src/assets/images/flour.jpg",
  "/src/assets/images/favicon.ico",
];

// 设置缓存的最大存活时间（单位：秒）
// const MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours
const MAX_AGE_SECONDS = 6; // 24 hours

console.log("self", self);

// 安装 Service Worker
self.addEventListener("install", (event) => {
  console.log("install--event", event);
  // event.waitUntil 来确保 Service Worker 不会在异步操作完成前被终止。
  // 确保在异步操作完成之前，Service Worker 会一直处于活动状态。
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache opened");
      return cache.addAll(urlsToCache);
    })
  );
});

/**
 * 缓存策略：
 * Cache First 策略
 * 如果缓存存在且未过期，则返回缓存。若缓存不存在或已过期，则发起网络请求，并在获取到响应后将其加入缓存。
 * */

// 拦截请求并返回缓存或网络请求
self.addEventListener("fetch", (event) => {
  console.log("fetch--event", event.request.url);
  // 检查请求的 URL 或其他属性，判断是否为特殊请求
  if (event.request.url.startsWith("chrome-extension://")) {
    // 如果是特殊请求，可以选择直接返回，不继续处理
    return;
  }

  // 对于非特殊请求，继续执行缓存策略
  // event.respondWith() 拦截网络请求并提供自定义响应
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        const ageInSeconds =
          (Date.now() -
            new Date(cachedResponse.headers.get("date")).getTime()) /
          1000;
        console.log("ageInSeconds", ageInSeconds, MAX_AGE_SECONDS);
        if (ageInSeconds < MAX_AGE_SECONDS) {
          return cachedResponse;
        }
      }

      // 超过缓存时间后，重新请求资源，并更新缓存
      return fetch(event.request).then((response) => {
        console.log("puting", response.url);
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// 更新事件 (更改 Service Worker 缓存版本号 触发)
// 当新的 Service Worker 激活时，清理旧缓存
self.addEventListener("activate", (event) => {
  console.log("activate--event", event);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log("cacheNames", cacheNames);
      return Promise.all(
        // cacheNames.map((cacheName) => {
        //   // 删除旧版本缓存
        //   if (cacheName !== CACHE_NAME) {
        //     return caches.delete(cacheName);
        //   }
        // })
        cacheNames
          .filter((cacheName) => {
            // 过滤出需要更新的缓存名称
            return (
              cacheName.startsWith("my-site-cache-") && cacheName !== CACHE_NAME
            );
          })
          .map((cacheName) => {
            return caches.delete(cacheName); // 删除旧版本的缓存
          })
      );
    })
  );
});

/* // 在 Service Worker 更新完成后发送消息给页面，提示用户刷新页面
self.addEventListener("message", (event) => {
  if (event.data === "refresh") {
    self.skipWaiting(); // 立即激活新的 Service Worker
    clients.claim(); // 立即控制所有客户端
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage("reload"); // 提示页面刷新
      });
    });
  }
}); */
