F// ======= CONFIGURAÇÃO (edite se quiser) =======
const BROKER_URL = "y1184ab7.ala.us-east-1.emqxsl.com"; // sem wss://, será usado abaixo
const BROKER_WSS = "wss://" + BROKER_URL + ":8084/mqtt";
const MQTT_USER = "Admin";
const MQTT_PASS = "Admin";

// ======= CLIENTS (dois clientes para não passar do limite) =======
let clientCentral = null; // central / estados / controle
let clientPocos   = null; // telemetria fluxo

// tópicos — <=10 por cliente
const TOPICS_CENTRAL = [
  "central/sistema",
  "central/nivel",
  "central/poco_ativo",
  "central/retrolavagem",
  "central/retropocos",
  "central/p1_online",
  "central/p2_online",
  "central/p3_online"
];

const TOPICS_POCOS = [
  "pocos/fluxo1",
  "pocos/fluxo2",
  "pocos/fluxo3"
];

// ======= util =======
function logConsole(msg){
  const el = document.getElementById("console");
  const now = new Date().toLocaleTimeString();
  el.textContent = `[${now}] ${msg}\n` + el.textContent;
}

// Map payloads to human text
function mapCentralSistema(v){ return v === "1" ? "Ligado" : "Desligado"; }
function mapNivel(v){ return v === "1" ? "Cheio" : "Enchendo"; }
function mapRetrolavagem(v){ return v === "1" ? "Ligada" : "Desligada"; }
function mapOnline(v){ return v === "1" ? "Online" : "OFF-line"; }
function mapFluxo(v){ return (v === "0" || v === "" ) ? "Ausente" : "Presente"; }

// ======= atualizar UI =======
function updateUI(topic, value){
  // central topics
  if(topic === "central/sistema") { document.getElementById("sistema").innerText = mapCentralSistema(value); }
  else if(topic === "central/nivel") { document.getElementById("nivel").innerText = mapNivel(value); }
  else if(topic === "central/poco_ativo") { document.getElementById("pocoAtivo").innerText = value; }
  else if(topic === "central/retrolavagem") { document.getElementById("retro").innerText = mapRetrolavagem(value); }
  else if(topic === "central/retropocos") { document.getElementById("retropocos").innerText = value; }

  else if(topic === "central/p1_online") { document.getElementById("p1_online").innerText = mapOnline(value); }
  else if(topic === "central/p2_online") { document.getElementById("p2_online").innerText = mapOnline(value); }
  else if(topic === "central/p3_online") { document.getElementById("p3_online").innerText = mapOnline(value); }

  // pocos
  else if(topic === "pocos/fluxo1") { document.getElementById("fluxo1").innerText = mapFluxo(value); }
  else if(topic === "pocos/fluxo2") { document.getElementById("fluxo2").innerText = mapFluxo(value); }
  else if(topic === "pocos/fluxo3") { document.getElementById("fluxo3").innerText = mapFluxo(value); }

  // log
  logConsole(`${topic} => ${value}`);
}

// ======= criar opções de conexão (automática) =======
function createClientId(prefix){
  return prefix + "_" + Math.random().toString(16).substr(2,6);
}

// Build options for mqtt.connect (browser)
function connectOptions(clientId){
  return {
    protocol: "wss",
    hostname: BROKER_URL,
    port: 8084,
    path: "/mqtt",
    username: MQTT_USER,
    password: MQTT_PASS,
    clientId: clientId,
    reconnectPeriod: 2000,
    clean: true
  };
}

// ======= conectar clientes =======
function connectBothClients(){
  // set broker display
  document.getElementById("brokerName").innerText = BROKER_WSS;

  // central client
  try {
    if(clientCentral && clientCentral.connected) { clientCentral.end(true); }
  } catch(e){ /* ignore */ }
  clientCentral = mqtt.connect(connectOptions(createClientId("webui_central")));

  clientCentral.on("connect", () => {
    logConsole("clientCentral conectado");
    // subscribe
    TOPICS_CENTRAL.forEach(t => clientCentral.subscribe(t, {qos:1}, (err)=> { if(err) logConsole("err sub " + t + " " + err); }));
    updateConnStatus();
  });

  clientCentral.on("message", (topic, msg) => {
    updateUI(topic, msg.toString());
  });

  clientCentral.on("error", (err) => {
    logConsole("clientCentral error: " + err.message);
    updateConnStatus();
  });

  clientCentral.on("close", () => {
    logConsole("clientCentral desconectado");
    updateConnStatus();
  });

  // pocos client
  try {
    if(clientPocos && clientPocos.connected) { clientPocos.end(true); }
  } catch(e){ /* ignore */ }
  clientPocos = mqtt.connect(connectOptions(createClientId("webui_pocos")));

  clientPocos.on("connect", () => {
    logConsole("clientPocos conectado");
    TOPICS_POCOS.forEach(t => clientPocos.subscribe(t, {qos:1}, (err)=> { if(err) logConsole("err sub " + t + " " + err); }));
    updateConnStatus();
  });

  clientPocos.on("message", (topic, msg) => {
    updateUI(topic, msg.toString());
  });

  clientPocos.on("error", (err) => {
    logConsole("clientPocos error: " + err.message);
    updateConnStatus();
  });

  clientPocos.on("close", () => {
    logConsole("clientPocos desconectado");
    updateConnStatus();
  });
}

// update connection pill status
function updateConnStatus(){
  const el = document.getElementById("connStatus");
  const ok = (clientCentral && clientCentral.connected) && (clientPocos && clientPocos.connected);
  el.className = "status-pill " + (ok ? "status-ok":"status-dis");
  el.innerText = ok ? "Conectado" : "Desconectado";
}

// ======= publicadores (config e controle) =======
function publishCentral(topic, payload){
  if(clientCentral && clientCentral.connected){
    clientCentral.publish(topic, payload, {qos:1}, (err)=>{ if(err) logConsole("pub err " + topic + " " + err); else logConsole(`PUB ${topic} => ${payload}`); });
  } else {
    logConsole("Impossível publicar, clientCentral desconectado: " + topic);
  }
}

function publishPocos(topic, payload){
  if(clientPocos && clientPocos.connected){
    clientPocos.publish(topic, payload, {qos:1}, (err)=>{ if(err) logConsole("pub err " + topic + " " + err); else logConsole(`PUB ${topic} => ${payload}`); });
  } else {
    logConsole("Impossível publicar, clientPocos desconectado: " + topic);
  }
}

// ======= UI handlers =======
document.addEventListener("DOMContentLoaded", () => {
  // connect automatically
  connectBothClients();

  // Toggle button
  document.getElementById("btnToggle").addEventListener("click", () => {
    publishCentral("central/ligar", "toggle");
  });

  // send config
  document.getElementById("sendCfg").addEventListener("click", () => {
    const a = document.getElementById("retroA").value;
    const b = document.getElementById("retroB").value;
    const horas = document.getElementById("horas").value;
    const timeout = document.getElementById("timeout").value;
    const manual = document.getElementById("manualPoco").value;

    publishCentral("central/retroA", String(a));
    publishCentral("central/retroB", String(b));
    publishCentral("central/horas", String(horas));
    publishCentral("central/timeout", String(timeout));
    publishCentral("central/manual_poco", String(manual)); // central aceita esse tópico e grava no EEPROM
    logConsole("Config enviada");
  });

  // small visible console click to clear
  document.getElementById("console").addEventListener("click", ()=>{ document.getElementById("console").textContent = ""; });
});

// expose a function to manually reconnect from console if needed
window.reconnectBoth = function(){
  try { if(clientCentral) clientCentral.end(true); } catch(e){}
  try { if(clientPocos) clientPocos.end(true); } catch(e){}
  connectBothClients();
  logConsole("Reconectando ambos...");
};
