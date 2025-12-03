// ==========================================================
// CONFIGURAÇÃO GLOBAL
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let clientA = null;   // Cliente para tópicos principais
let clientB = null;   // Cliente para tópicos secundários

let history = [];

// ==========================================================
// FUNÇÕES DE INTERFACE
// ==========================================================
function setText(id, txt){
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function renderHistory(){
  const ul = document.getElementById("history_list");
  ul.innerHTML = "";
  history.slice(0, 50).forEach(h=>{
    const li = document.createElement("li");
    li.textContent = h;
    ul.appendChild(li);
  });
}

// ==========================================================
// DEBUG - MOSTRAR TODA MENSAGEM MQTT
// ==========================================================
function debugLog(label, topic, payload){
  const time = new Date().toLocaleTimeString();
  console.log(
    `%c[${label}] ${time} | ${topic} => ${payload}`,
    "color: green; font-weight: bold;"
  );
}

// ==========================================================
// HANDLER PRINCIPAL DO PAINEL
// ==========================================================
function dashboardHandler(topic, v){

  switch(topic){

    case "smart_level/central/sistema":
      setText("sistema", v === "1" ? "ON" : "OFF");
      setText("central-status", v === "1" ? "ON" : "OFF");
      break;

    case "smart_level/central/poco_ativo": setText("poco_ativo", v); break;
    case "smart_level/central/manual": setText("manual", v==="1"?"MANUAL":"AUTO"); break;
    case "smart_level/central/rodizio_min": setText("rodizio_min", v); break;

    case "smart_level/central/p1_online": setText("p1_online", v==="1"?"ONLINE":"OFFLINE"); break;
    case "smart_level/central/p2_online": setText("p2_online", v==="1"?"ONLINE":"OFFLINE"); break;
    case "smart_level/central/p3_online": setText("p3_online", v==="1"?"ONLINE":"OFFLINE"); break;

    case "smart_level/central/p1_timer": setText("p1_timer", v); break;
    case "smart_level/central/p2_timer": setText("p2_timer", v); break;
    case "smart_level/central/p3_timer": setText("p3_timer", v); break;
    case "smart_level/central/retrolavagem":
      const now = new Date().toLocaleString();
      if (v === "1") history.unshift("[INÍCIO] " + now);
      else history.unshift("[FIM] " + now);
      renderHistory();
      break;
  }
}

// ==========================================================
// CLIENTE A (Tópicos Essenciais)
// ==========================================================
const topicsA = [
  "smart_level/central/sistema",
  "smart_level/central/poco_ativo",
  "smart_level/central/manual",
  "smart_level/central/rodizio_min",
  "smart_level/central/p1_online",
  "smart_level/central/p2_online",
  "smart_level/central/p3_online",
  "smart_level/central/nivel"
];

function startClientA(){
  clientA = new Paho.MQTT.Client(host, port, path, "clientA_" + Math.random());
  
  clientA.onConnectionLost = () => {
    setText("conn-status", "OFF");
    setTimeout(startClientA, 2000);
  };

  clientA.onMessageArrived = (msg) => {
    debugLog("CLIENTE A", msg.destinationName, msg.payloadString);
    dashboardHandler(msg.destinationName, msg.payloadString);
  };

  clientA.connect({
    userName: username,
    password: password,
    useSSL: useTLS,
    timeout: 4,

    onSuccess: () => {
      setText("conn-status", "ON");
      topicsA.forEach(t => clientA.subscribe(t));
    },

    onFailure: () => {
      setText("conn-status", "OFF");
      setTimeout(startClientA, 3000);
    }
  });
}

// ==========================================================
// CLIENTE B (Tópicos Pesados)
// ==========================================================
const topicsB = [
  "smart_level/central/p1_timer",
  "smart_level/central/p2_timer",
  "smart_level/central/p3_timer",
  "smart_level/central/timers_json",
  "smart_level/central/retrolavagem",
  "smart_level/central/retroA_status",
  "smart_level/central/retroB_status",
  "smart_level/central/timeout"
];

function startClientB(){
  clientB = new Paho.MQTT.Client(host, port, path, "clientB_" + Math.random());

  clientB.onConnectionLost = () => setTimeout(startClientB, 2000);

  clientB.onMessageArrived = (msg) => {
    debugLog("CLIENTE B", msg.destinationName, msg.payloadString);
    dashboardHandler(msg.destinationName, msg.payloadString);
  };

  clientB.connect({
    userName: username,
    password: password,
    useSSL: useTLS,
    timeout: 4,

    onSuccess: () => {
      topicsB.forEach(t => clientB.subscribe(t));
    }
  });
}

// ==========================================================
// PUBLICAR COMANDOS
// ==========================================================
function publish(topic, payload){
  if(clientA && clientA.isConnected()){
    const msg = new Paho.MQTT.Message(payload);
    msg.destinationName = topic;
    clientA.send(msg);
  }
}

// ==========================================================
// BOTÕES DO PAINEL
// ==========================================================
document.getElementById("btnSend").addEventListener("click", ()=>{
  const obj = {
    rodizio: Number(document.getElementById("cfg_rodizio").value),
    retroA: Number(document.getElementById("cfg_retroA").value),
    retroB: Number(document.getElementById("cfg_retroB").value),
    timeout: Number(document.getElementById("cfg_timeout").value)
  };
  publish("smart_level/central/cmd", JSON.stringify(obj));
});

document.getElementById("btnToggle").addEventListener("click", ()=>{
  publish("smart_level/central/cmd", JSON.stringify({toggle:true}));
});

// ==========================================================
// INICIAR AMBOS OS CLIENTES
// ==========================================================
startClientA();
startClientB();
