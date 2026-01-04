// ==========================================================
// EVENTOS DE BOTÕES (REVISADO E FORTE)
// ==========================================================
function configurarBotoes() {
    const btnToggle = document.getElementById("btnToggle");
    const btnSalvar = document.getElementById("btnSalvarConfig");

    if (btnToggle) {
        // Usamos .onclick para garantir que não haja múltiplos cliques acumulados
        btnToggle.onclick = function() {
            if (client && client.connected) {
                const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
                msg.destinationName = "smart_level/central/cmd";
                client.send(msg);
                console.log("Comando Toggle enviado via MQTT");
                
                // Feedback visual rápido
                btnToggle.style.opacity = "0.5";
                setTimeout(() => btnToggle.style.opacity = "1", 200);
            } else {
                alert("MQTT desconectado. Aguarde a conexão para usar os botões.");
            }
        };
    }

    if (btnSalvar) {
        btnSalvar.onclick = function() {
            if (client && client.connected) {
                const h = parseInt(document.getElementById("cfg_rodizio_h").value) || 0;
                const m = parseInt(document.getElementById("cfg_rodizio_m").value) || 0;
                
                const config = {
                    rodizio: (h * 60) + m,
                    retroA: parseInt(document.getElementById("cfg_retroA").value),
                    retroB: parseInt(document.getElementById("cfg_retroB").value),
                    manual_poco: document.getElementById("cfg_manual_poco").value
                };

                const msg = new Paho.MQTT.Message(JSON.stringify(config));
                msg.destinationName = "smart_level/central/cmd";
                client.send(msg);
                alert("Configurações enviadas com sucesso!");
            } else {
                alert("Não foi possível salvar. Verifique a conexão MQTT.");
            }
        };
    }
}

// Watchdog (Mantido igual)
setInterval(() => {
    const agora = Date.now();
    if (agora - lastP1 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p1_online", "0");
    if (agora - lastP2 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p2_online", "0");
    if (agora - lastP3 > OFFLINE_TIMEOUT * 1000) setOnlineStatus("p3_online", "0");
}, 5000);

// ==========================================================
// INICIALIZAÇÃO GERAL
// ==========================================================
window.addEventListener('load', () => {
    initMQTT();
    configurarBotoes(); // Chama a função que ativa os botões
    inicializarNotificacoes();
});
