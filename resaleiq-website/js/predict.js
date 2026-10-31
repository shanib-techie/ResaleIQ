/* ResaleIQ - predict.js (full rewrite)
   Frontend -> FastAPI POST /prediction
*/
(function () {
  "use strict";

  // ---------- API URL ----------
  // Same server pe ho to relative URL. Static site / local file pe ho to Web Service ka full URL.
  const WEB_SERVICE_URL = "https://resaleiq.onrender.com";
  const host = window.location.hostname;
  const isMainServer = host === "resaleiq.onrender.com" || host === "localhost" || host === "127.0.0.1";
  const API_BASE = isMainServer ? "" : WEB_SERVICE_URL;
  const API_URL = API_BASE + "/prediction";

  const MODEL_MAE = 1699; // average error of trained model (₹)

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const num = (id, fallback) => {
    const el = $(id);
    if (!el) return fallback;
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : fallback;
  };
  const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

  // ---------- Switches (toggle on/off) ----------
  const switches = document.querySelectorAll("[data-switch]");
  switches.forEach((sw) => {
    sw.addEventListener("click", () => sw.classList.toggle("on"));
  });
  const sw = (name) => {
    const el = document.querySelector('[data-switch="' + name + '"]');
    return el && el.classList.contains("on") ? 1 : 0;
  };

  // ---------- Build payload ----------
  function buildPayload() {
    return {
      brand: $("brand").value,
      condition: $("condition").value,
      original_price: num("original_price", 45000),
      age_months: num("age_months", 0),
      battery_health: num("battery_health", 100),
      screen_cracked: sw("screen_cracked"),
      body_damage: sw("body_damage"),
      repair_history: Math.round(num("repair_history", 0)),
      water_damage: sw("water_damage"),
      warranty_remaining_months: num("warranty_remaining_months", 0),
      box_available: sw("box_available"),
      charger_available: sw("charger_available"),
      market_demand_score: num("market_demand_score", 50),
    };
  }

  function validate(p) {
    if (p.original_price < 1000) return "Original price kam se kam ₹1,000 hona chahiye.";
    if (p.age_months < 0 || p.age_months > 120) return "Age 0 se 120 months ke beech rakho.";
    if (p.battery_health < 0 || p.battery_health > 100) return "Battery health 0-100% ke beech rakho.";
    if (p.market_demand_score < 0 || p.market_demand_score > 100) return "Demand score 0-100 ke beech rakho.";
    return null;
  }

  // ---------- UI updates ----------
  function setLoading(on) {
    const btn = $("estimate-btn");
    if (!btn) return;
    btn.disabled = on;
    btn.textContent = on ? "Estimating…" : "Estimate resale price";
  }

  function showError(msg) {
    $("price-out").textContent = "—";
    $("range-out").textContent = msg;
    $("confidence-fill").style.width = "0%";
    $("drivers").innerHTML = "";
  }

  function animatePrice(target) {
    const el = $("price-out");
    const duration = 500;
    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = inr(target * eased);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = inr(target);
    }
    requestAnimationFrame(frame);
  }

  function renderDrivers(p, price) {
    const items = [];
    const ratio = price / p.original_price;
    items.push({ label: "Original price", note: inr(p.original_price) });
    items.push({ label: "Age", note: p.age_months + " months" });
    items.push({ label: "Condition", note: p.condition });
    items.push({ label: "Battery health", note: p.battery_health + "%" });
    items.push({ label: "Market demand", note: p.market_demand_score + "/100" });
    if (p.screen_cracked) items.push({ label: "Screen cracked", note: "lowers value" });
    if (p.body_damage) items.push({ label: "Body damage", note: "lowers value" });
    if (p.water_damage) items.push({ label: "Water damage", note: "lowers value" });
    if (p.repair_history > 0) items.push({ label: "Past repairs", note: p.repair_history });
    if (p.warranty_remaining_months > 0) items.push({ label: "Warranty", note: p.warranty_remaining_months + " months left" });
    items.push({ label: "Resale / original", note: Math.round(ratio * 100) + "%" });

    $("drivers").innerHTML = items
      .map(
        (i) =>
          '<div class="driver" style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:.82rem;">' +
          "<span>" + i.label + "</span>" +
          '<span class="mono" style="color:var(--text-faint);">' + i.note + "</span></div>"
      )
      .join("");
  }

  function renderResult(p, price) {
    animatePrice(price);

    const low = Math.max(0, price - MODEL_MAE);
    const high = price + MODEL_MAE;
    $("range-out").textContent = "range " + inr(low) + " – " + inr(high);

    // Simple confidence heuristic (damage / extreme inputs reduce it)
    let conf = 92;
    if (p.screen_cracked) conf -= 6;
    if (p.body_damage) conf -= 5;
    if (p.water_damage) conf -= 8;
    if (p.age_months > 60) conf -= 8;
    if (p.condition === "Poor") conf -= 6;
    conf = Math.max(55, Math.min(95, conf));
    $("confidence-fill").style.width = conf + "%";

    const badge = $("device-badge");
    if (badge) {
      const svg = badge.querySelector("svg");
      badge.textContent = "";
      if (svg) badge.appendChild(svg);
      badge.appendChild(document.createTextNode(" " + p.brand + " · " + p.condition));
    }

    renderDrivers(p, price);
  }

  // ---------- API call (timeout + 1 retry for Render cold start) ----------
  async function callApi(payload, attempt) {
    attempt = attempt || 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        let detail = "";
        try {
          const j = await res.json();
          detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
        } catch (_) {}
        throw new Error("Server error " + res.status + (detail ? ": " + detail : ""));
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      const networkFail = err.name === "AbortError" || err instanceof TypeError;
      if (networkFail && attempt < 2) {
        $("range-out").textContent = "Server jaag raha hai, dubara try kar rahe hain…";
        await new Promise((r) => setTimeout(r, 4000));
        return callApi(payload, attempt + 1);
      }
      throw err;
    }
  }

  // ---------- Main handler ----------
  async function estimate() {
    const payload = buildPayload();
    const problem = validate(payload);
    if (problem) {
      showError(problem);
      return;
    }

    setLoading(true);
    $("range-out").textContent = "Calculating…";

    try {
      const data = await callApi(payload);
      const price = Number(data.predicted_resale_price);
      if (!Number.isFinite(price)) throw new Error("Invalid response from server");
      renderResult(payload, price);
    } catch (err) {
      console.error("Prediction error:", err);
      if (err.name === "AbortError" || err instanceof TypeError) {
        showError("Server se connect nahi ho paya. Thodi der baad try karo.");
      } else {
        showError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const btn = $("estimate-btn");
  if (btn) btn.addEventListener("click", estimate);

  const form = $("predict-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      estimate();
    });
  }
})();
