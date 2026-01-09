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

// Variável para evitar processar a mesma mensagem duas vezes seguidas
let lastMessageId = null;

messaging.onBackgroundMessage((payload) => {
  // 1. TRAVA DE DUPLICIDADE
  if (lastMessageId === payload.messageId) {
    return;
  }
  lastMessageId = payload.messageId;

  console.log('🔔 Alerta recebido (Background):', payload);
  
  // 2. BUSCA DADOS DO CAMPO 'DATA' (Evita a dupla notificação do Firebase)
  // Se payload.notification existir, o navegador tentará mostrar duas vezes.
  // Por isso, no index.js do Render, enviaremos apenas no campo 'data'.
  const data = payload.data || {};
  const notificationTitle = data.title || "🚨 ALERTA FÊNIX";
  
  const notificationOptions = {
    body: data.body || "Verificar sistema agora!",
    icon: 'logo.jpg', 
    badge: 'logo.jpg',
    // 3. TAG ÚNICA: Essencial para substituir a notificação anterior no PC e Celular
    tag: 'fenix-status-alerta', 
    renotify: true, 
    vibrate: [500, 110, 500],
    data: {
      url: data.url || 'https://hamiltontsilva-sys.github.io/Fenix_Smart_Control/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Abre o site ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se o site já estiver aberto, apenas foca nele
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não estiver aberto, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
