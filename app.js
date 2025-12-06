/* CONTROLE DE ABAS */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c=>c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
  });
});

/* TOGGLE LIGA/DESLIGA (visual) */
const btnToggle = document.getElementById("btnToggle");
const toggleText = document.getElementById("toggleText");
let systemOn = false;

btnToggle.addEventListener("click", () => {
  systemOn = !systemOn;
  updateToggleUI();
  // ===== Aqui você pode chamar sua função que envia MQTT:
  // sendControlCommand('smart_level/central/command', systemOn ? 'ON' : 'OFF');
  console.log("Toggle pressed ->", systemOn);
});

function updateToggleUI(){
  if(systemOn){
    btnToggle.classList.remove('off'); btnToggle.classList.add('on');
    toggleText.textContent = 'DESLIGAR';
    setText('sistema','Online');
  } else {
    btnToggle.classList.remove('on'); btnToggle.classList.add('off');
    toggleText.textContent = 'LIGAR';
    setText('sistema','Offline');
  }
}

/* UTILIDADES DOM */
function setText(id, v){ const el = document.getElementById(id); if(el) el.textContent = v; }
function setStatusElement(id, v){ const el = document.getElementById(id); if(!el) return; el.textContent = v; el.classList.remove('status-ok','status-off'); el.classList.add(v.toLowerCase().includes('on')? 'status-ok':'status-off'); }

/* CONFIGURAR BOTÃO ENVIAR CONFIG */
document.getElementById('btnSendCfg').addEventListener('click', ()=>{
  const rod = document.getElementById('cfg_rodizio').value;
  const to = document.getElementById('cfg_timeout').value;
  const manual = document.getElementById('cfg_manual_poco').value;
  const status = document.getElementById('cfg_status');
  status.textContent = 'Enviando...';
  status.classList.add('show');
  // chame aqui sua rotina que publica MQTT com as configs
  setTimeout(()=>{ status.textContent='Configurações enviadas'; setTimeout(()=>status.classList.remove('show'),1500)},800);
});

/* RENDERIZAÇÃO INICIAL (exemplo de dados estáticos) */
function bootSample(){
  // indicadores
  document.getElementById('mqtt_status').textContent = 'MQTT: Conectado'; document.getElementById('mqtt_status').classList.add('status-ok');
  document.getElementById('central_status').textContent = 'Central: Offline'; document.getElementById('central_status').classList.add('status-off');

  // status do sistema
  setText('sistema','Online'); setText('nivel','Alta'); setText('retroA_status','Ativado'); setText('retroB_status','Normal');
  setText('poco_ativo','1'); setText('manual','Automático'); setText('rodizio_min','30 min');

  // poços
  setStatusElement('p1_online','Online'); setText('p1_fluxo','Presente'); setText('p1_timer','738');
  setStatusElement('p2_online','Online'); setText('p2_fluxo','Presente'); setText('p2_timer','572');
  setStatusElement('p3_online','Online'); setText('p3_fluxo','Ausente');  setText('p3_timer','194');

  // histórico (exemplo)
  const hist = document.getElementById('history_list');
  ['12:04 Poço1 - Ciclo completo','11:32 Poço2 - Iniciado','10:06 Poço3 - Finalizado'].forEach(h=>{
    const li = document.createElement('li'); li.textContent = h; hist.appendChild(li);
  });
}

bootSample();

/* INTEGRAÇÃO MQTT (sugestão)
   - Se você já usa paho + um handler (ex: dashboardHandler(topic, payload))
   - ligue aqui as funções onMessageArrived / onConnect e apenas atualize DOM conforme payload.
   Exemplo (pseudo):
      client.onMessageArrived = function(msg){
          const topic = msg.destinationName;
          const payload = msg.payloadString;
          dashboardHandler(topic, payload); // função que você já tem
      }
   Mantive o <script src="paho-mqtt.js"></script> no HTML para você conectar facilmente. 
*/
