// sw.js - Este arquivo roda sozinho em segundo plano
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: 'Alerta Fênix', body: 'Nova atualização do sistema.' };
    
    const options = {
        body: data.body,
        icon: 'logo.jpg',
        badge: 'logo.jpg',
        vibrate: [200, 100, 200],
        tag: 'alerta-sistema', // Evita acumular várias notificações iguais
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Garante que o service worker assuma o controle imediatamente
self.addEventListener('install', () => self.skipWaiting());
