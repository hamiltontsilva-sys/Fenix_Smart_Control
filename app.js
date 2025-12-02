
// MQTT Dashboard using Paho MQTT JavaScript

const host = "y1184ab7.ala.us-east-1.emqxsl.com";
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

const clientId = "webClient_" + Math.random().toString(16).substr(2, 8);
let client = null;

const topics = [
  "smart_level/central/sistema",
  "smart_level/central/poco_ativo",
  "smart_level/central/manual",
  "smart_level/central/rodizio_min",
  "smart_level/central/p1_online",
  "smart_level/central/p2_online",
  "smart_level/central/p3_online",
  "smart_level/central/p1_timer",
  "smart_level/central/p2_timer",
  "smart_level/central/p3_timer",
  "smart_level/central/timers_json",
  "smart_level/central/retrolavagem",
  "smart_level/central/retroA_status",
  "smart_level/central/retroB_status",
  "smart_level/central/timeout",
  "smart_level/central/nivel"
];

let history = [];

function setText(id, txt){
  const el = document.getElementById(id);
  if(el) el.textContent = txt;
}

function renderHistory(){
  const ul = document.getElementById("history_list");
  ul.innerHTML = "";
  history.slice(0,50).forEach(h=>{
    const li = document.createElement("li");
    li.textContent = h;
    ul.appendChild(li);
  });
}

function onMessageArrived(msg){
  const t = msg.destinationName;
  const v = msg.payloadString;

  switch(t){
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

    case "smart_level/central/timers_json":
      setText("timers_json", v);
      break;

    case "smart_level/central/retrolavagem":
      const now = new Date().toLocaleString();
      if(v==="1") history.unshift("[INICIO] " + now);
      else history.unshift("[FIM] " + now);
      renderHistory();
      break;
  }
}

function connectMQTT(){
  client = new Paho.MQTT.Client(host, port, path, clientId);

  client.onConnectionLost = ()=>{
    setText("conn-status", "OFF");
    setTimeout(connectMQTT, 2000);
  };

  client.onMessageArrived = onMessageArrived;

  client.connect({
    userName: username,
    password: password,
    useSSL: useTLS,
    timeout: 4,
    onSuccess: ()=>{
      setText("conn-status", "ON");
      topics.forEach(t => client.subscribe(t));
    },
    onFailure: ()=>{
      setText("conn-status", "OFF");
      setTimeout(connectMQTT, 3000);
    }
  });
}

function publish(topic, payload){
  if(!client || !client.isConnected()){
    alert("MQTT não conectado");
    return;
  }
  const msg = new Paho.MQTT.Message(payload);
  msg.destinationName = topic;
  client.send(msg);
}

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

connectMQTT();
