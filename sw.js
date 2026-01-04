importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9",
  measurementId: "G-7Q6DZZZ9NL"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Intercepta a notificação quando o app está fechado ou em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Alerta Fênix recebido (Background):', payload);
  
  // Tenta pegar o título e corpo tanto de 'data' quanto de 'notification'
  const notificationTitle = payload.data?.title || payload.notification?.title || "Alerta Fênix";
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || "Verifique o painel de controle.",
    icon: 'logo.jpg',
    badge: 'logo.jpg', 
    vibrate: [500, 110, 500, 110, 450],
    tag: 'alarme-central',
    renotify: true,
    data: {
      // Usamos self.location para pegar o endereço do seu site sem erro
      url: self.location.origin 
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Lógica para abrir o App ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Fecha a notificação
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se o app já estiver aberto, foca nele
      for (let client of windowClients) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Se estiver fechado, abre uma nova aba
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
