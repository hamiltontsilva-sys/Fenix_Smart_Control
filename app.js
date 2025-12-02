// =========================
// CONFIG MQTT (EMQX CLOUD)
// =========================

const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;                 // WebSocket seguro (TLS)
const path = "/mqtt";              // OBRIGATÓRIO para EMQX Cloud
const topicBase = "smart_level/central/";

// Cliente MQTT Paho — com PATH correto
let client = new Paho.MQTT.Client(
  host,
  Number(port),
  path,
  "web_" + parseInt(Math.random() * 100000)
);

// =========================
// EVENTOS MQTT
// =========================

client.onConnectionLost = () => {
  document.getElementById("mqtt-status").className = "red";
  document.getElementById("mqtt-status").innerText = "Desconectado";
};

client.onMessageArrived = onMessage;

// =========================
// CONECTAR
// =========================

client.connect({
  useSSL: true,
  userName: "Admin",
  password: "Admin",
  timeout: 5,
  onSuccess: () => {
    document.getElementById("mqtt-status").className = "green";
    document.getElementById("mqtt-status").innerText = "Conectado";
    subscribeAll();
  },

  onFailure: (e) => {
    console.log("ERRO MQTT: ", e.errorMessage);
    document.getElementById("mqtt-status").innerText = "Falhou";
  }
});

// =========================
// ASSINAR TÓPICOS
// =========================

function subscribeAll() {
  const topics = [
    "sistema",
    "retrolavagem",
    "manual",
    "poco_ativo",
    "retro_history",
    "p1_online","p2_online","p3_online",
    "p1_timer","p2_timer","p3_timer",
    "rodizio_min","retroA_status","retroB_status","timeout"
  ];

  topics.forEach(t => client.subscribe(topicBase + t));
}

// =========================
// TRATAR MENSAGENS
// =========================

function onMessage(msg) {
  const t = msg.destinationName.replace(topicBase, "");
  const v = msg.payloadString;

  switch(t) {

    case "sistema":
      updateText("central-status", v==="1" ? "Ligada" : "Desligada");
      updateText("sistema", v==="1" ? "Ligado" : "Desligado");
      break;

    case "retrolavagem":
      updateText("fase", v==="1" ? "Retrolavando" : "Nivel_Control");
      break;

    case "manual":
      updateText("modo", v==="1" ? "Manual" : "Auto");
      break;

    case "poco_ativo":
      updateText("pocoAtivo", "P" + v);
      break;

    case "retro_history":
      updateHistory(v);
      break;

    case "p1_online": updateStatus("p1_online", v); break;
    case "p2_online": updateStatus("p2_online", v); break;
    case "p3_online": updateStatus("p3_online", v); break;

    case "p1_timer": updateText("p1_timer", formatTimer(v)); break;
    case "p2_timer": updateText("p2_timer", formatTimer(v)); break;
    case "p3_timer": updateText("p3_timer", formatTimer(v)); break;

    case "rodizio_min": document.getElementById("rodizio").value = v; break;
    case "retroA_status": document.getElementById("retroA").value = v; break;
    case "retroB_status": document.getElementById("retroB").value = v; break;
    case "timeout": document.getElementById("timeout").value = v; break;
  }
}

// =========================
// Funções auxílio
// =========================

function updateText(id, txt){
  const el = document.getElementById(id);
  if(el) el.innerText = txt;
}

function updateStatus(id, val){
  const el = document.getElementById(id);
  if(!el) return;

  el.innerText = val==="1" ? "Online" : "Offline";
  el.className = val==="1" ? "green" : "red";
}

function formatTimer(sec){
  sec = Number(sec);
  let h = Math.floor(sec/3600);
  let m = Math.floor((sec%3600)/60);
  return `${h}h ${m}min`;
}

function updateHistory(json){
  const arr = JSON.parse(json);
  let html = "";

  arr.forEach(r=>{
    let inicio = `${r.hi}:${String(r.mi).padStart(2,"0")}`;
    let fim = `${r.hf}:${String(r.mf).padStart(2,"0")}`;
    html += `[${r.d}/${r.m}/${r.a}] ${inicio} → ${fim}<br>`;
  });

  document.getElementById("historico").innerHTML = html;
}

// =========================
// Enviar comandos
// =========================

function toggleSistema(){
  sendCmd('{"toggle":1}');
}

function enviarConfig(){

  const rod = document.getElementById("rodizio").value;
  const A = document.getElementById("retroA").value;
  const B = document.getElementById("retroB").value;
  const tout = document.getElementById("timeout").value;

  const payload =
    `{"rodizio":${rod},"retroA":${A},"retroB":${B},"timeout":${tout}}`;

  sendCmd(payload);

  alert("Configurações enviadas!");
}

function sendCmd(payload){
  const msg = new Paho.MQTT.Message(payload);
  msg.destinationName = topicBase + "cmd";
  client.send(msg);
}
