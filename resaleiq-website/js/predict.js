// Sends the form to the real trained LightGBM model via the FastAPI
// /prediction endpoint (see main.py). Only the fields present in this
// form are sent, matching model_columns.pkl exactly.

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  // toggle switches
  document.querySelectorAll('[data-switch]').forEach(sw => {
    sw.addEventListener('click', () => sw.classList.toggle('on'));
  });
  const switchOn = (name) => document.querySelector(`[data-switch="${name}"]`).classList.contains('on');

  async function render() {
    const payload = {
      brand: $('brand').value,
      condition: $('condition').value,
      original_price: parseInt($('original_price').value) || 0,
      age_months: parseInt($('age_months').value) || 0,
      battery_health: parseInt($('battery_health').value) || 0,
      screen_cracked: switchOn('screen_cracked') ? 1 : 0,
      body_damage: switchOn('body_damage') ? 1 : 0,
      repair_history: parseInt($('repair_history').value) || 0,
      water_damage: switchOn('water_damage') ? 1 : 0,
      warranty_remaining_months: parseInt($('warranty_remaining_months').value) || 0,
      box_available: switchOn('box_available') ? 1 : 0,
      charger_available: switchOn('charger_available') ? 1 : 0,
      market_demand_score: parseInt($('market_demand_score').value) || 0
    };

    const priceOut = $('price-out');
    const originalText = priceOut.textContent;
    priceOut.textContent = 'Calculating…';

    try {
      const res = await fetch('http://resaleiq-checkyourownphone.onrender.com//prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Prediction request failed:', res.status, err);
        priceOut.textContent = 'Error — check server';
        return;
      }

      const data = await res.json();
      priceOut.textContent = '₹' + data.predicted_resale_price.toLocaleString('en-IN');

      const badge = $('device-badge');
      if (badge) {
        badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/></svg> ${payload.brand} · ${payload.condition}`;
      }
    } catch (e) {
      console.error('Prediction request error:', e);
      priceOut.textContent = originalText;
    }
  }

  $('estimate-btn').addEventListener('click', render);
});
