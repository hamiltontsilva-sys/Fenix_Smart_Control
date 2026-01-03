// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT E FIREBASE
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const username = "Admin";
const password = "Admin";

// --- ADICIONE ESTE BLOCO NOVO LOGO ABAIXO ---
const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9"
};

// Inicialização
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

let client = null;
let lastP1 = Date.now(), lastP2 = Date.now(), lastP3 = Date.now();
const OFFLINE_TIMEOUT = 45;

// --- FUNÇÃO PARA NOTIFICAÇÃO ---
function dispararNotificacao(titulo, msg) {
    if ("Notification" in window && Notification.permission === "granted") {
        // Usa o Service Worker para garantir que a notificação apareça
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: msg,
                icon: "logo.jpg",
                vibrate: [200, 100, 200],
                tag: 'alerta-fenix'
            });
        });
    }
}

// ... (Suas funções setText, updatePowerButton, updateCloroBar, setOnlineStatus, setFluxo permanecem as mesmas)

function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    if (topic === "smart_level/central/alarmes_detalhes") {
        try {
            const alarme = JSON.parse(val);
            if (alarme.status === "FALHA") {
                document.getElementById("modal-falha").textContent = alarme.falha;
                document.getElementById("modal-solucao").textContent = alarme.solucao;
                document.getElementById("alarm-modal").style.display = "flex";
                dispararNotificacao("ALERTA FÊNIX", alarme.falha);
            } else {
                document.getElementById("alarm-modal").style.display = "none";
            }
        } catch (e) { console.error("Erro no JSON"); }
    }
    // ... (restante do seu switch case de tópicos)
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: true, userName: username, password: password,
        onSuccess: () => {
            client.subscribe("smart_level/central/#");
            Notification.requestPermission();
        }
    });
}

// Registro do Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        console.log("Monitor de segundo plano ativo!");
    });
}

initMQTT();
