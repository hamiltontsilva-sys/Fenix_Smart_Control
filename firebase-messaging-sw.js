importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  databaseURL: "https://fenix-smart-control-default-rtdb.firebaseio.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9",
  measurementId: "G-7Q6DZZZ9NL"
});

const messaging = firebase.messaging();
let lastMessageId = null;

messaging.onBackgroundMessage((payload) => {
  if (lastMessageId === payload.messageId) return;
  lastMessageId = payload.messageId;

  console.log('🔔 Alerta recebido (Background):', payload);
  
  const data = payload.data || {};
  const notificationTitle = data.title || "🚨 ALERTA FÊNIX";
  
  const notificationOptions = {
    body: data.body || "Verificar sistema agora!",
    icon: 'logo.jpg', 
    badge: 'logo.jpg',
    tag: 'fenix-status-alerta', 
    renotify: true, 
    vibrate: [500, 110, 500],
    data: {
      url: data.url || 'https://hamiltontsilva-sys.github.io/Fenix_Smart_Control/',
      // Passamos os detalhes do alarme para o clique recuperar depois
      msg: data.body || "Falha detectada",
      solucao: data.solucao || "Verificar painel físico."
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// LÓGICA DE CLIQUE: Foca no site e avisa o app.js para abrir o modal
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const alarmeData = event.notification.data;
  const urlToOpen = alarmeData.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Tenta focar em uma aba já aberta
      for (let client of windowClients) {
        if (client.url.includes('hamiltontsilva') && 'focus' in client) {
          // Envia o comando para o app.js abrir o modal
          client.postMessage({
            action: 'ABRIR_MODAL_FALHA',
            msg: alarmeData.msg,
            solucao: alarmeData.solucao
          });
          return client.focus();
        }
      }
      // 2. Se não houver aba aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
