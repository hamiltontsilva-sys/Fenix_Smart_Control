//-----------------------------------------
// LISTA DE TODOS OS TÓPICOS
//-----------------------------------------
const TOPICS = [
  "pocos/p1_alive","pocos/p2_alive","pocos/p3_alive",
  "pocos/fluxo1","pocos/fluxo2","pocos/fluxo3",

  "smart_level/central/cmd",
  "smart_level/central/sistema",
  "smart_level/central/poco_ativo",
  "smart_level/central/manual",
  "smart_level/central/nivel",

  "smart_level/central/p1_online",
  "smart_level/central/p2_online",
  "smart_level/central/p3_online",

  "smart_level/central/p1_fluxo",
  "smart_level/central/p2_fluxo",
  "smart_level/central/p3_fluxo",

  "smart_level/central/p1_timer",
  "smart_level/central/p2_timer",
  "smart_level/central/p3_timer",

  "smart_level/central/status",
  "smart_level/central/retro_history"
];

let client = null;

//-----------------------------------------
// STATUS VISUAL
//-----------------------------------------
function setBadge(id, text, ok) {
  const badge = document.getElementById(id);
  badge.querySelector("span").textContent = text;
  badge.classList.toggle("ok", ok);
}

function normalizeFluxo(v){
  return (v == "1" || /presente/i.test(v)) ? "Presente" : "Ausente";
}

// Atualiza comunicação
function setPocoCom(idx, val){
  const el = document.getElementById(`p${idx}_com`);
  if(val === "1"){
    el.textContent = "Online";
    el.style.color = "green";
  } else {
    el.textContent = "OFF-line";
    el.style.color = "red";
  }
}

//-----------------------------------------
// HISTÓRICO
//-----------------------------------------
function renderRetroHistory(payload){
  const box = document.getElementById("retroList");
  try {
    const arr = JSON.parse(payload);
    if(!arr.length){
      box.textContent = "Nenhum histórico recebido.";
      return;
    }

    let txt = "";
    arr.forEach(r=>{
      txt += `[${r.d}/${r.m}/${r.a}] início ${r.hi}:${r.mi}  fim ${
        r.hf == 255 ? "--" : r.hf+":"+r.mf
      }\n`;
    });

    box.textContent = txt;
  } catch {
    box.textContent = payload;
  }
}

//-----------------------------------------
// MENSAGENS RECEBIDAS
//-----------------------------------------
function handleMessage(topic, payload){
  console.log("RCV", topic, payload);

  if(topic==="smart_level/central/sistema"){
    document.getElementById("sistemaState").textContent =
      payload==="1" ? "Ligado" : "Desligado";
    document.getElementById("centralState").textContent =
      payload==="1" ? "Online" : "Offline";
  }

  if(topic==="smart_level/central/manual"){
    document.getElementById("modoState").textContent =
      payload==="1" ? "Manu." : "Auto";
  }

  if(topic==="smart_level/central/poco_ativo"){
    document.getElementById("rodizioState").textContent = "P" + payload;
  }

  // Fluxo
  if(topic.endsWith("_fluxo")){
    const id = topic.match(/p(\d)_fluxo/)[1];
    document.getElementById(`p${id}_fluxo`).textContent = normalizeFluxo(payload);
  }

  // Timers
  if(topic.endsWith("_timer")){
    const id = topic.match(/p(\d)_timer/)[1];
    document.getElementById(`p${id}_timer`).textContent = payload;
  }

  // Online/offline
  if(topic.endsWith("_online")){
    const id = topic.match(/p(\d)_online/)[1];
    setPocoCom(id, payload);
  }

  if(topic==="smart_level/central/retro_history"){
    renderRetroHistory(payload);
  }
}

//-----------------------------------------
// MQTT CONNECT
//-----------------------------------------
function connect(){
  const host = inputBroker.value.trim();
  const port = Number(inputPort.value);
  const user = inputUser.value.trim();
  const pass = inputPass.value.trim();
  const id = "web-"+Math.floor(Math.random()*100000);

  - client = new Paho.MQTT.Client(host, port, "/mqtt", clientId);
+ client = new Paho.Client(host, port, "/mqtt", clientId);

- const m = new Paho.MQTT.Message(String(payload));
+ const m = new Paho.Message(String(payload));


  client.onConnectionLost = ()=>{
    setBadge("badgeMqtt","Desconectado",false);
  };

  client.onMessageArrived = (msg)=>{
    handleMessage(msg.destinationName, msg.payloadString);
  };

  client.connect({
    useSSL:true,
    userName:user,
    password:pass,
    onSuccess: ()=>{
      setBadge("badgeMqtt","Conectado",true);
      TOPICS.forEach(t=>client.subscribe(t));
    },
    onFailure: ()=>{
      setBadge("badgeMqtt","Falha",false);
    }
  });

  setBadge("badgeMqtt","Conectando...",false);
}

function disconnect(){
  if(client) client.disconnect();
  setBadge("badgeMqtt","Desconectado",false);
}

//-----------------------------------------
// UI
//-----------------------------------------
btnConnect.onclick = connect;
btnDisconnect.onclick = disconnect;

btnSendCfg.onclick = ()=>{
  const j = {
    rodizio: Number(cfgRodizio.value),
    retroA: Number(cfgRetroA.value),
    retroB: Number(cfgRetroB.value),
    timeout: Number(cfgTimeout.value)
  };
  publish("smart_level/central/cmd", JSON.stringify(j));
};

btnToggleSys.onclick = ()=>{
  publish("smart_level/central/cmd", '"toggle"');
};

function publish(topic, payload){
  if(!client || !client.isConnected()){
    console.warn("Não conectado");
    return;
  }
  const msg = new Paho.MQTT.Message(payload);
  msg.destinationName = topic;
  msg.qos = 0;
  client.send(msg);
}
