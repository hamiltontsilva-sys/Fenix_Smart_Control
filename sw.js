self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.text() : 'Alerta do Sistema';
    event.waitUntil(
        self.registration.showNotification('Fênix Smart Control', {
            body: data,
            icon: 'logo.jpg'
        })
    );
});
