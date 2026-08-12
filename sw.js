self.addEventListener('fetch', (event) => {
    // Basic network pass-through supporting offline UI template shell
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
