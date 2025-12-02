// Tópicos usados pela central
const TOPICS = [
  'pocos/p1_alive','pocos/p2_alive','pocos/p3_alive',
  'pocos/fluxo1','pocos/fluxo2','pocos/fluxo3',
  'smart_level/central/cmd',
  'smart_level/central/sistema',
  'smart_level/central/poco_ativo',
  'smart_level/central/manual',
  'smart_level/central/nivel',
  'smart_level/central/p1_online','smart_level/central/p2_online','smart_level/central/p3_online',
  'smart_level/central/p1_fluxo','smart_level/central/p2_fluxo','smart_level/central/p3_fluxo',
  'smart_level/central/p1_timer','smart_level/central/p2_timer','smart_level/central/p3_timer',
  'smart_level/central/timers_json','smart_level/central/status',
  'smart_level/central/retrolavagem','smart_level/central/retro_history'
];

let client = null;

function setBadge(id,text,ok){
  const el = document.getElementById(id);
  el.querySelector('span').textContent = text;
  if(ok) el.classList.add('ok'); else el.classList.remove('ok');
}

function logConsole(msg){ console.log('[MQTT] '+msg); }

function connect(){
  const host = document.getElementById('inputBroker').value.trim();
  const port = parseInt(document.getElementById('inputPort').value,10) || 8084;
  const user = document.getElementById('inputUser').value || undefined;
  const pass = document.getElementById('inputPass').value || undefined;
  const clientId = 'web-central-'+Math.floor(Math.random()*10000);

  client = new Paho.MQTT.Client(host, port, '/mqtt', clientId);

  client.onConnectionLost = (resp) => {
    setBadge('badgeMqtt','Desconectado',false);
    logConsole('perdido '+(resp && resp.errorMessage));
  };
  client.onMessageArrived = (msg) => {
    handleMessage(msg.destinationName, msg.payloadString);
  };

  const options = {
    useSSL: true,
    userName: user,
    password: pass,
    onSuccess: function(){
      setBadge('badgeMqtt','Conectado',true);
      logConsole('Conectado');
      subscribeTopics();
    },
    onFailure: function(err){
      setBadge('badgeMqtt','Falha',false);
      logConsole('Falha: '+JSON.stringify(err));
    }
  };

  try{
    client.connect(options);
    setBadge('badgeMqtt','Conectando...',false);
  }catch(e){
    console.error(e);
  }
}

function disconnect(){
  if(client) client.disconnect();
  setBadge('badgeMqtt','Desconectado',false);
}

function subscribeTopics(){
  TOPICS.forEach(t => {
    try{
      client.subscribe(t, {qos:0});
      logConsole('subs '+t);
    }catch(e){ console.error(e) }
  });
}

function publish(topic,payload,qos=0,retained=false){
  if(!client || !client.isConnected()){
    logConsole('publish fail, not connected');
    return;
  }
  const m = new Paho.MQTT.Message(String(payload));
  m.destinationName = topic;
  m.qos = qos;
  m.retained = retained;
  client.send(m);
  logConsole('PUB '+topic+' -> '+payload);
}

// Handle incoming messages and map to UI
function handleMessage(topic,payload){
  logConsole('RCV '+topic+' => '+payload);

  if(topic === 'smart_level/central/sistema'){
    document.getElementById('sistemaState').textContent =
      (payload==='1' ? 'Ligado' : 'Desligado');
    document.getElementById('centralState').textContent =
      (payload==='1' ? 'Online' : 'Offline');
  }

  if(topic === 'smart_level/central/manual'){
    document.getElementById('modoState').textContent =
      (payload==='1' ? 'Manu.' : 'Auto');
  }

  if(topic === 'smart_level/central/poco_ativo'){
    document.getElementById('rodizioState').textContent = 'P'+payload;
  }

  if(topic === 'smart_level/central/p1_fluxo' || topic === 'pocos/fluxo1'){
    document.getElementById('p1_fluxo').textContent = normalizeFluxo(payload);
  }
  if(topic === 'smart_level/central/p2_fluxo' || topic === 'pocos/fluxo2'){
    document.getElementById('p2_fluxo').textContent = normalizeFluxo(payload);
  }
  if(topic === 'smart_level/central/p3_fluxo' || topic === 'pocos/fluxo3'){
    document.getElementById('p3_fluxo').textContent = normalizeFluxo(payload);
  }

  if(topic === 'smart_level/central/p1_timer'){
    document.getElementById('p1_timer').textContent = payload+'s';
  }
  if(topic === 'smart_level/central/p2_timer'){
    document.getElementById('p2_timer').textContent = payload+'s';
  }
  if(topic === 'smart_level/central/p3_timer'){
    document.getElementById('p3_timer').textContent = payload+'s';
  }

  if(topic === 'smart_level/central/p1_online'){ setPocoCom(1,payload); }
  if(topic === 'smart_level/central/p2_online'){ setPocoCom(2,payload); }
  if(topic === 'smart_level/central/p3_online'){ setPocoCom(3,payload); }

  if(topic === 'smart_level/central/retro_history'){
    renderRetroHistory(payload);
  }

  if(topic === 'smart_level/central/status'){
    try{
      const s = JSON.parse(payload);
      document.getElementById('sistemaState').textContent =
        (s.central_on ? 'Ligado' : 'Desligado');
    }catch(e){}
  }
}

function normalizeFluxo(v){
  if(v==='1' || /presente/i.test(v)) return 'Presente';
  return 'Ausente';
}

function setPocoCom(idx, payload){
  const online = (payload==='1');
  const target = document.getElementById('p'+idx+'_com');
  target.textContent = online ? 'Online' : 'OFF-line';
  target.style.color = online ? 'var(--accent)' : 'var(--danger)';
}

function renderRetroHistory(payload){
  if(!payload) return;
  try{
    const arr = JSON.parse(payload);
    if(!Array.isArray(arr) || arr.length===0){
      document.getElementById('retroList').textContent =
        'Nenhum histórico recebido.';
      return;
    }
    let html='';
    arr.forEach(item => {
      const d = item.d+'/'+item.m+'/'+item.a;
      const hi = String(item.hi).padStart(2,'0')+':'+String(item.mi).padStart(2,'0');
      const hf = (item.hf===255? '--' :
        String(item.hf).padStart(2,'0')+':'+String(item.mf).padStart(2,'0'));
      html += '['+d+'] início '+hi+'  fim '+hf+'\n';
    });
    document.getElementById('retroList').textContent = html;
  }catch(e){
    document.getElementById('retroList').textContent = payload;
  }
}

// UI actions
document.getElementById('btnConnect').addEventListener('click', connect);
document.getElementById('btnDisconnect').addEventListener('click', disconnect);

document.getElementById('btnSendCfg').addEventListener('click', ()=>{
  const R = parseInt(document.getElementById('cfgRodizio').value,10)||60;
  const A = parseInt(document.getElementById('cfgRetroA').value,10)||1;
  const B = parseInt(document.getElementById('cfgRetroB').value,10)||2;
  const T = parseInt(document.getElementById('cfgTimeout').value,10)||15;
  const j = { rodizio: R, retroA: A, retroB: B, timeout: T };
  publish('smart_level/central/cmd', JSON.stringify(j));
});

document.getElementById('btnToggleSys').addEventListener('click', ()=>{
  publish('smart_level/central/cmd', '"toggle"');
});

// expose publish for console debug
window.pub = publish;
