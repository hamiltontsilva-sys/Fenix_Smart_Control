// ===== CLORO =====
function updateCloroBar(pct) {
    const bar = document.getElementById("cloro_bar");
    if (!bar) return;

    let v = Number(pct);
    if (isNaN(v)) v = 0;
    v = Math.max(0, Math.min(100, v));

    bar.style.width = v + "%";
    bar.classList.remove("cloro-low", "cloro-mid", "cloro-high");

    if (v <= 25) bar.classList.add("cloro-low");
    else if (v <= 60) bar.classList.add("cloro-mid");
    else bar.classList.add("cloro-high");
}
