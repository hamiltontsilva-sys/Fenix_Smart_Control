function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updateCloroBar(pct) {
    const bar = document.getElementById("cloro_bar");
    if (!bar) return;

    let v = Number(pct);
    if (v < 0) v = 0;
    if (v > 100) v = 100;

    bar.style.width = v + "%";
    bar.className = "cloro-bar-fill";

    if (v <= 25) bar.classList.add("cloro-low");
    else if (v <= 60) bar.classList.add("cloro-mid");
    else bar.classList.add("cloro-high");
}

/* MQTT SIMPLIFICADO – CLIENTE A */
const clientA = new Paho.MQTT.Client("y1184ab7.ala.us-east-1.emqxsl.com", 8084, "/mqtt", "A_" + Math.random());

clientA.onMessageArrived = msg => {
    const t = msg.destinationName;
    const v = msg.payloadString;

    if (t === "smart_level/central/cloro_peso") setText("cloro_peso", v + " kg");
    if (t === "smart_level/central/cloro_pct") {
        setText("cloro_pct", v + " %");
        updateCloroBar(v);
    }
};

clientA.connect({
    userName: "Admin",
    password: "Admin",
    useSSL: true,
    onSuccess: () => {
        clientA.subscribe("smart_level/central/cloro_peso");
        clientA.subscribe("smart_level/central/cloro_pct");
    }
});
