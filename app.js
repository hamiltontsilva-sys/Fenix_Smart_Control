/* main.js
   Frontend MQTT client for Fênix central.
   - Edit the BROKER section below before running.
*/

/////////////////////////////////////////
// BROKER / CREDENTIALS (configure)
/////////////////////////////////////////
const BROKER = {
  HOST: "y1184ab7.ala.us-east-1.emqxsl.com", // seu broker
  PORT: 8084,        // porta WebSocket (ex: 8083/8084/8080). Ajuste conforme seu broker.
  USE_TLS: true,     // true -> wss, false -> ws
  USER: "Admin",
  PASS: "Admin",
  CLIENT_ID: "web-dashboard-" + Math.floor(Math.random()*10000)
};

const TOPIC_CMD = "smart_level/central/cmd";
const TOPIC_STATUS = "smart_level/central/status";
const TOPIC_RETRO_HISTORY = "smart_level/central/retro_history";
const TOPIC_SISTEMA = "smart_level/central/sistema";
const TOPIC_P1_ON = "smart_level/central/p1_online";
const TOPIC_P2_ON = "smart_level/central/p2_online";
const TOPIC_P3_ON = "smart_level/central/p3_online";
const TOPIC_TIMERS = "smart_level/central/timers_json";
const TOPIC_P1_TIMER = "smart_level/central/p1_timer";
const TOPIC_P2_TIMER = "smart_level/central/p2_timer";
const TOPIC_P3_TIMER = "smart_level/central/p3_timer";
const TOPIC_P1_ONLINE = "smart_level/central/p1_online";

/////////////////////////////////////////
// DOM shortcuts
/////////////////////////////////////////
const mqttStatusEl = document.getElementById("mqtt-status");
const centralStatusEl = document.getElementById("central-status");
const sistemaVal = document.getElementById("sistema-val");
const faseVal = document.getElementById("fase-val");
const modoVal = document.getElementById("modo-val");
const pocosVal = document.getElementById("pocos-val");

const btnPower = document.getElementById("btn-power");
const btnSendConfig = document.getElementById("btn-send-config");

const retroAEl = document.getElementById("retroA");
const retroBEl = document.getElementById("retroB");
const rodizioEl = document.getElementById("rodizio");
const timeoutEl = document.getElementById("timeout");

const historyEl = document.getElementById("history");

const p1_online = document.getElementById("p1_online");
const p2_online = document.getElementById("p2_online");
const p3_online = document.getElementById("p3_online");
const p1_timer = document.getElementById("p1_timer");
const p2_timer = document.getElementById("p2_timer");
const p3_timer = document.getElementById("p3_timer");

/////////////////////////////////////////
// MQTT client (Paho)
/////////////////////////////////////////
let client = null;
function connectMQTT(){
  const protocol = BROKER.USE_TLS ? "wss" : "ws";
  // Paho expects host and port separately
  client = new Paho.MQTT.Client(BROKER.HOST, Number(BROKER.PORT), BROKER.CLIENT_ID);

  const options = {
    useSSL: BROKER.USE_TLS,
    userName: BROKER.USER,
    password: BROKER.PASS,
    onSuccess: onConnect,
    onFailure: (err) => {
      console.error("MQTT connect failed", err);
      mqttStatusEl.textContent = "Falhou";
      mqttStatusEl.className = "red";
      setTimeout(connectMQTT, 3000);
    },
    keepAliveInterval: 10,
    reconnect: true
  };

  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  console.log("Conectando MQTT...", BROKER.HOST, BROKER.PORT, "TLS:", BROKER.USE_TLS);
  try {
    client.connect(options);
    mqttStatusEl.textContent = "Conectando...";
    mqttStatusEl.className = "red";
  } catch(e){
    console.error("Erro connect:", e);
    mqttStatusEl.textContent = "Erro";
    mqttStatusEl.className = "red";
  }
}

function onConnect(){
  console.log("MQTT conectado");
  mqttStatusEl.textContent = "Conectado";
  mqttStatusEl.className = "green";

  // subscribe topics
  [
    TOPIC_STATUS, TOPIC_RETRO_HISTORY, TOPIC_SISTEMA,
    TOPIC_P1_ON, TOPIC_P2_ON, TOPIC_P3_ON,
    TOPIC_TIMERS, TOPIC_P1_TIMER, TOPIC_P2_TIMER, TOPIC_P3_TIMER
  ].forEach(t => {
    try { client.subscribe(t); console.log("sub ->", t); } catch(e){ console.warn("sub fail", e); }
  });

  // request a status publish - many centrals publish periodic status; you can optionally request it
  // but central publishes every 5s in firmware, so we simply wait for messages.
}

function onConnectionLost(response) {
  console.warn("MQTT lost:", response);
  mqttStatusEl.textContent = "Desconectado";
  mqttStatusEl.className = "red";
  // Paho will not auto-reconnect unless options are set; we try reconnect logic:
  setTimeout(() => {
    connectMQTT();
  }, 2000);
}

function onMessageArrived(message) {
  const t = message.destinationName;
  const payload = message.payloadString;
  // console.log("MSG", t, payload);

  // status JSON
  if(t === TOPIC_STATUS){
    try {
      const obj = JSON.parse(payload);
      // central_on, rodizio_min, pocos_online
      if(obj.central_on !== undefined){
        centralStatusEl.textContent = obj.central_on ? "On" : "Off";
        sistemaVal.textContent = obj.central_on ? "Ligado" : "Desligado";
        sistemaVal.className = obj.central_on ? "green" : "red";
      }
      if(obj.rodizio_min !== undefined){
        rodizioEl.value = obj.rodizio_min;
      }
      if(obj.pocos_online){
        pocosVal.textContent = obj.pocos_online.join ? obj.pocos_online.join("/") : obj.pocos_online;
      }
    } catch(e){ console.warn("status parse", e); }
    return;
  }

  if(t === TOPIC_SISTEMA){
    // payload "1" or "0"
    centralStatusEl.textContent = (payload==="1") ? "On" : "Off";
    sistemaVal.textContent = (payload==="1") ? "Ligado" : "Desligado";
    sistemaVal.className = (payload==="1") ? "green" : "red";
    return;
  }

  if(t === TOPIC_RETRO_HISTORY){
    // payload is a JSON array as in firmware
    try {
      const arr = JSON.parse(payload);
      renderHistory(arr);
    } catch(e){
      console.warn("retro_history parse fail", e);
      historyEl.innerHTML = payload;
    }
    return;
  }

  if(t === TOPIC_P1_ON){
    p1_online.textContent = (payload === "1") ? "Online" : "Offline";
    p1_online.className = (payload === "1") ? "green" : "red";
    return;
  }
  if(t === TOPIC_P2_ON){
    p2_online.textContent = (payload === "1") ? "Online" : "Offline";
    p2_online.className = (payload === "1") ? "green" : "red";
    return;
  }
  if(t === TOPIC_P3_ON){
    p3_online.textContent = (payload === "1") ? "Online" : "Offline";
    p3_online.className = (payload === "1") ? "green" : "red";
    return;
  }

  if(t === TOPIC_P1_TIMER){
    p1_timer.textContent = payload + "s";
    return;
  }
  if(t === TOPIC_P2_TIMER){
    p2_timer.textContent = payload + "s";
    return;
  }
  if(t === TOPIC_P3_TIMER){
    p3_timer.textContent = payload + "s";
    return;
  }

  if(t === TOPIC_TIMERS){
    try {
      const o = JSON.parse(payload);
      if(o.p1 !== undefined) p1_timer.textContent = o.p1 + "s";
      if(o.p2 !== undefined) p2_timer.textContent = o.p2 + "s";
      if(o.p3 !== undefined) p3_timer.textContent = o.p3 + "s";
    } catch(e){}
    return;
  }

  // fallback: log unknown
  console.log("recebido:", t, payload);
}

function renderHistory(arr){
  // arr => [{d:1,m:12,a:25,hi:23,mi:0,hf:23,mf:20}, ...]
  if(!Array.isArray(arr)){ historyEl.innerHTML = String(arr); return; }
  if(arr.length === 0){ historyEl.innerHTML = "<i>Sem registros</i>"; return; }

  const html = arr.map(it => {
    const hi = `${pad(it.hi)}:${pad(it.mi)}`;
    const hf = (it.hf === 255) ? "..." : `${pad(it.hf)}:${pad(it.mf)}`;
    const date = `${pad(it.d)}/${pad(it.m)}/20${pad(it.a)}`;
    return `[${date}] início ${hi} → fim ${hf}`;
  }).join("<br>");
  historyEl.innerHTML = html;
}

function pad(n){ return String(n).padStart(2,"0"); }

/////////////////////////////////////////
// UI actions (publishers)
/////////////////////////////////////////
btnPower.addEventListener("click", () => {
  // The central checks msg.indexOf("toggle") >=0 so a simple "toggle" is fine.
  publishSimple(TOPIC_CMD, "toggle");
});

btnSendConfig.addEventListener("click", () => {
  const A = Number(retroAEl.value) || 1;
  const B = Number(retroBEl.value) || 2;
  const rod = Number(rodizioEl.value) || 60;
  const tout = Number(timeoutEl.value) || 15;

  const obj = { retroA: A, retroB: B, rodizio: rod, timeout: tout };
  publishSimple(TOPIC_CMD, JSON.stringify(obj));
});

function publishSimple(topic, payload, retained=false){
  if(!client || !client.isConnected()){
    console.warn("MQTT não conectado, não pode publicar", topic, payload);
    alert("Não conectado ao broker MQTT. Verifique as configurações.");
    return;
  }
  const msg = new Paho.MQTT.Message(String(payload));
  msg.destinationName = topic;
  msg.retained = retained;
  client.send(msg);
  console.log("[PUB]", topic, payload);
}

/////////////////////////////////////////
// Start
/////////////////////////////////////////
window.addEventListener("load", () => {
  connectMQTT();
});
