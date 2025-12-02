// CONFIG MQTT
const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084; // websocket TLS
const topicBase = "smart_level/central/";

let client = new Paho.MQTT.Client(host, port, "web_" + parseInt(Math.random() * 100000));

// ======= EVENTOS MQTT =======
client.onConnectionLost = () => {
  document.getElementById("mqtt-status").className = "red";
  document.getElementById("mqtt-status").innerText = "Desconectado";
};

client.onMessageArrived = onMessage;

// ======= CONECTAR =======
client.connect({
  useSSL: true,
  userName: "Admin",
  password: "Admin",
  onSuccess: () => {
    document.getElementById("mqtt-status").className = "green";
    document.getElementById("mqtt-status").innerText = "Conectado";
    subscribeAll();
  },
  onFailure: () => alert("Falha ao conectar MQTT!")
});

// ======= ASSINAR TÓPICOS =======
function subscribeAll() {
  const topics = [
    "sistema", "retrolavagem", "manual", "poco_ativo",
    "retro_history", "p1_online","p2_online","p3_online",
    "p1_timer","p2_timer","p3_timer",
    "rodizio_min","retroA_status","retroB_status","timeout"
  ];
  topics.forEach(t => client.subscribe(topicBase + t));
}

// ======= RECEBER MSG =======
function onMessage(msg) {
  const t = msg.destinationName.replace(topicBase, "");
  const v = msg.payloadString;

  switch(t) {

    case "sistema":
      document.getElementById("central-status").innerText = v==="1" ? "Ligada":"Desligada";
      document.getElementById("sistema").innerText = v==="1" ? "Ligado":"Desligado";
      break;

    case "retrolavagem":
      document.getElementById("fase").innerText = v==="1" ? "Retrolavando":"Nivel_Control";
      break;

    case "manual":
      document.getElementById("modo").innerText = v==="1" ? "Manual" : "Auto";
      break;

    case "poco_ativo":
      document.getElementById("pocoAtivo").innerText = "P" + v;
      break;

    case "retro_history":
      updateHistory(v);
      break;

    case "p1_online": updateStatus("p1_online", v); break;
    case "p2_online": updateStatus("p2_online", v); break;
    case "p3_online": updateStatus("p3_online", v); break;

    case "p1_timer": document.getElementById("p1_timer").innerText = formatTimer(v); break;
    case "p2_timer": document.getElementById("p2_timer").innerText = formatTimer(v); break;
    case "p3_timer": document.getElementById("p3_timer").innerText = formatTimer(v); break;
  }
}

function updateStatus(id, val){
  document.getElementById(id).innerText = val==="1" ? "Online" : "Offline";
  document.getElementById(id).className = val==="1" ? "green" : "red";
}

// ======= TIMER FORMAT =======
function formatTimer(sec){
  let h = Math.floor(sec/3600);
  let m = Math.floor((sec%3600)/60);
  return `${h}h ${m}min`;
}

// ======= HISTÓRICO =======
function updateHistory(json){
  const arr = JSON.parse(json);
  let html = "";

  arr.forEach(r=>{
    html += `[${r.d}/${r.m}/${r.a}] ${r.hi}:${String(r.mi).padStart(2,"0")} → ${r.hf}:${String(r.mf).padStart(2,"0")}<br>`;
  });

  document.getElementById("historico").innerHTML = html;
}

// ======= BOTÕES =======
function toggleSistema(){
  const msg = new Paho.MQTT.Message('{"toggle":1}');
  msg.destinationName = topicBase + "cmd";
  client.send(msg);
}

function enviarConfig(){
  const rod = document.getElementById("rodizio").value;
  const A = document.getElementById("retroA").value;
  const B = document.getElementById("retroB").value;
  const tout = document.getElementById("timeout").value;

  const payload = `{"rodizio":${rod},"retroA":${A},"retroB":${B},"timeout":${tout}}`;

  const msg = new Paho.MQTT.Message(payload);
  msg.destinationName = topicBase + "cmd";
  client.send(msg);

  alert("Configurações enviadas!");
}
