// app.js - Fenix Smart Control (web client)
// depends on mqtt (mqtt.min.js)

const $ = id => document.getElementById(id);

// Default values (you can change)
const DEFAULT_BROKER = "wss://j0c0a273.ala.us-east-1.emqxsl.com:8084/mqtt";
const DEFAULT_USER = "Smart_level";
const DEFAULT_PASS = "fenixfiltros";

let client = null;
let connected = false;

// UI nodes
const connStatus = $('connStatus');
const logArea = $('log');

const inputs = {
  brokerUrl: $('brokerUrl'),
  mqttUser: $('mqttUser'),
  mqttPass: $('mqttPass'),
  clientId: $('clientId'),
  btnConnect: $('btnConnect')
};

const topicFields = {
  sistema: $('sistema'),
  nivel: $('nivel'),
  poco_ativo: $('poco_ativo'),
  retrolavagem: $('retrolavagem'),
  retropocos: $('retropocos'),
  retropocos_status: $('retropocos_status'),
  p1_online: $('p1_online'),
  p2_online: $('p2_online'),
  p3_online: $('p3_online'),
  fluxo1: $('fluxo1'),
  fluxo2: $('fluxo2'),
  fluxo3: $('fluxo3'),
  p1_feedback: $('p1_feedback'),
  p2_feedback: $('p2_feedback'),
  p3_feedback: $('p3_feedback')
};

// restore saved
inputs.brokerUrl.value = localStorage.getItem('broker') || DEFAULT_BROKER;
inputs.mqttUser.value = localStorage.getItem('user') || DEFAULT_USER;
inputs.mqttPass.value = localStorage.getItem('pass') || DEFAULT_PASS;
inputs.clientId.value = localStorage.getItem('clientId') || `webui_${Math.floor(Math.random()*10000)}`;

// helpers
function log(msg){
  const now = new Date().toLocaleTimeString();
  logArea.textContent = `[${now}] ${msg}\n` + logArea.textContent;
}

function safePublish(topic, payload, opts = {qos:1,retain:false}){
  if(!connected){ log(`Nao conectado. Publish ignorado: ${topic}`); return; }
  client.publish(topic, String(payload), opts, (err)=> {
    if(err) log(`Erro publish ${topic}: ${err.message||err}`);
    else log(`> ${topic} : ${payload}`);
  });
}

// connection
inputs.btnConnect.addEventListener('click', () => {
  if(connected){ disconnect(); return; }
  connect();
});

function setConnected(on){
  connected = on;
  connStatus.textContent = on ? 'Online' : 'Offline';
  connStatus.className = on ? 'badge connected' : 'badge disconnected';
  inputs.btnConnect.textContent = on ? 'Desconectar' : 'Conectar';
}

function connect(){
  const broker = inputs.brokerUrl.value.trim();
  const username = inputs.mqttUser.value.trim();
  const password = inputs.mqttPass.value;
  const clientId = inputs.clientId.value.trim() || `webui_${Math.floor(Math.random()*10000)}`;

  localStorage.setItem('broker', broker);
  localStorage.setItem('user', username);
  localStorage.setItem('clientId', clientId);

  log(`Conectando ${broker} ...`);

  // mqtt.js connect options
  const options = {
    clientId,
    username,
    password,
    keepalive: 30,
    reconnectPeriod: 2000,
    clean: true
  };

  try {
    client = mqtt.connect(broker, options);
  } catch(e) {
    log('Erro ao iniciar mqtt.connect: ' + e.message);
    return;
  }

  client.on('connect', () => {
    setConnected(true);
    log('Conectado ao broker');
    // subscribe to relevant topics
    client.subscribe(['central/#','pocos/#'], {qos:1}, (err) => {
      if(err) log('Subscribe ERR: ' + err.message);
      else log('Inscrito em central/# e pocos/#');
    });
    // publish alive presence? optional
  });

  client.on('reconnect', () => log('Tentando reconectar...'));
  client.on('close', () => { setConnected(false); log('Conexao fechada'); });
  client.on('error', (err) => { log('Erro MQTT: ' + (err.message || err)); });
  client.on('message', (topic, payloadBuf) => {
    const payload = payloadBuf.toString();
    handleMessage(topic, payload);
  });
}

function disconnect(){
  if(client) client.end(true, ()=>{ setConnected(false); log('Desconectado'); client = null; });
}

// handle incoming topics (simple routing)
function handleMessage(topic, payload){
  log(`< ${topic} : ${payload}`);
  try {
    // central topics
    if(topic === 'central/sistema') topicFields.sistema.textContent = payload;
    else if(topic === 'central/nivel') topicFields.nivel.textContent = payload;
    else if(topic === 'central/poco_ativo') topicFields.poco_ativo.textContent = payload;
    else if(topic === 'central/retrolavagem') topicFields.retrolavagem.textContent = payload;
    else if(topic === 'central/retropocos') topicFields.retropocos.textContent = payload;
    else if(topic === 'central/retropocos_status') topicFields.retropocos_status.textContent = payload;
    else if(topic === 'central/horas_status') {/* optional */}
    else if(topic === 'central/timeout_status') {/* optional */}
    else if(topic === 'central/manual_mode') {/* optional */}
    else if(topic === 'central/manual_poco') {/* optional */}

    // pocos status
    else if(topic === 'central/p1_online') topicFields.p1_online.textContent = payload;
    else if(topic === 'central/p2_online') topicFields.p2_online.textContent = payload;
    else if(topic === 'central/p3_online') topicFields.p3_online.textContent = payload;

    else if(topic === 'pocos/fluxo1') topicFields.fluxo1.textContent = payload;
    else if(topic === 'pocos/fluxo2') topicFields.fluxo2.textContent = payload;
    else if(topic === 'pocos/fluxo3') topicFields.fluxo3.textContent = payload;

    else if(topic === 'pocos/p1_feedback') topicFields.p1_feedback.textContent = payload;
    else if(topic === 'pocos/p2_feedback') topicFields.p2_feedback.textContent = payload;
    else if(topic === 'pocos/p3_feedback') topicFields.p3_feedback.textContent = payload;

    // generic: if topic matches pocos/p*_alive or central/*_status you can handle more
  } catch(e){
    console.error(e);
  }
}

// UI actions
$('btnToggle').addEventListener('click', ()=> {
  safePublish('central/ligar', 'toggle', {qos:1,retain:false});
});

$('btnRetro').addEventListener('click', ()=>{
  const a = $('retroA').value;
  const b = $('retroB').value;
  safePublish('central/retroA', a, {qos:1,retain:true});
  safePublish('central/retroB', b, {qos:1,retain:true});
  // Then command to start
  safePublish('central/ligar', '1', {qos:1,retain:false}); // optional - depends on your flow
});

$('btnApply').addEventListener('click', ()=>{
  const hours = $('hours').value;
  const timeout = $('timeout').value;
  if(hours) safePublish('central/horas', hours, {qos:1,retain:true});
  if(timeout) safePublish('central/timeout', timeout, {qos:1,retain:true});
});

$('btnManualSet').addEventListener('click', ()=>{
  safePublish('central/manual_mode', $('manualMode').value, {qos:1,retain:true});
  safePublish('central/manual_poco', $('manualPoco').value, {qos:1,retain:true});
});

// poços direct buttons
document.querySelectorAll('.poco-cmd').forEach(btn=>{
  btn.addEventListener('click', (ev)=>{
    const cmd = btn.dataset.cmd; // 1 or 0
    const poco = btn.dataset.poco;
    // publish to pocos/cmd with payload being the single poço or general format
    // design choice: publish specific command like "1" to pocos/cmd and central will forward
    safePublish('pocos/cmd', `${poco}${cmd==='1' ? '' : '0'}`, {qos:1,retain:false});
    // if your firmware expects POST like {"cmd":"1"} you can change to JSON
  });
});

// helpful: allow pressing Enter to connect
inputs.clientId.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') connect(); });

// autoconnect if previous broker saved
if(localStorage.getItem('brokerAutoConnect') === '1'){
  connect();
}
