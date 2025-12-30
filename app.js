const host="y1184ab7.ala.us-east-1.emqxsl.com", port=8084, path="/mqtt", user="Admin", pass="Admin";
let client=null, lastCentral=Date.now(), loaded={rodizio:false, retroA:false, retroB:false, manual:false};

function setText(id, t){ const el=document.getElementById(id); if(el) el.textContent=t; }

function onMessage(msg){
    const t=msg.destinationName, v=msg.payloadString;
    lastCentral=Date.now(); setText("central_status","Online");
    document.getElementById("central_status").className="status-on";

    if(t.includes("sistema")) setText("sistema", v=="1"?"LIGADO":"DESLIGADO");
    if(t.includes("rodizio_min")){
        setText("rodizio_min", v+" min");
        if(!loaded.rodizio){ document.getElementById("cfg_rodizio").value=v; loaded.rodizio=true; }
    }
    if(t.includes("manual_poco")){
        setText("poco_manual_sel", "Poços "+v);
        if(!loaded.manual){ document.getElementById("cfg_manual_poco").value=v; loaded.manual=true; }
    }
    if(t.includes("p1_fluxo")){
        setText("p1_fluxo", v=="1"?"COM FLUXO":"SEM FLUXO");
        v=="1"?document.getElementById("p1_motor").classList.add("spinning"):document.getElementById("p1_motor").classList.remove("spinning");
    }
}

function initMQTT(){
    client = new Paho.MQTT.Client(host, port, path, "Fenix_"+Math.random().toString(16).substr(2,5));
    client.onMessageArrived = onMessage;
    client.connect({useSSL:true, userName:user, password:pass, onSuccess:()=>{
        setText("mqtt_status","Conectado");
        document.getElementById("mqtt_status").className="status-on";
        client.subscribe("smart_level/central/#");
    }});
}

document.getElementById("btnSalvarConfig").addEventListener("click", ()=>{
    const cfg = {
        rodizio: parseInt(document.getElementById("cfg_rodizio").value),
        retroA: parseInt(document.getElementById("cfg_retroA").value),
        retroB: parseInt(document.getElementById("cfg_retroB").value),
        manual_poco: document.getElementById("cfg_manual_poco").value
    };
    let m = new Paho.MQTT.Message(JSON.stringify(cfg));
    m.destinationName = "smart_level/central/cmd";
    client.send(m); alert("Enviado!");
});

document.getElementById("btnToggle").addEventListener("click", ()=>{
    let m = new Paho.MQTT.Message("toggle");
    m.destinationName = "smart_level/central/cmd_power";
    client.send(m);
});

initMQTT();
// Troca de abas básica
document.querySelectorAll('.tab-btn').forEach(b => {
    b.onclick = () => {
        document.querySelectorAll('.tab-page').forEach(p=>p.classList.remove('visible'));
        document.getElementById(b.dataset.tab).classList.add('visible');
    }
});
