// // Sends the form to the real trained LightGBM model via the FastAPI
// // /prediction endpoint (see main.py). Only the fields present in this
// // form are sent, matching model_columns.pkl exactly.

// document.addEventListener('DOMContentLoaded', () => {
//   const $ = (id) => document.getElementById(id);

//   // toggle switches
//   document.querySelectorAll('[data-switch]').forEach(sw => {
//     sw.addEventListener('click', () => sw.classList.toggle('on'));
//   });
//   const switchOn = (name) => document.querySelector(`[data-switch="${name}"]`).classList.contains('on');
//   async function render() {
//     const payload = {
//       brand: $('brand').value,
//       condition: $('condition').value,
//       original_price: parseInt($('original_price').value) || 0,
//       age_months: parseInt($('age_months').value) || 0,
//       battery_health: parseInt($('battery_health').value) || 0,
//       screen_cracked: switchOn('screen_cracked') ? 1 : 0,
//       body_damage: switchOn('body_damage') ? 1 : 0,
//       repair_history: parseInt($('repair_history').value) || 0,
//       water_damage: switchOn('water_damage') ? 1 : 0,
//       warranty_remaining_months: parseInt($('warranty_remaining_months').value) || 0,
//       box_available: switchOn('box_available') ? 1 : 0,
//       charger_available: switchOn('charger_available') ? 1 : 0,
//       market_demand_score: parseInt($('market_demand_score').value) || 0
//     };

//     const priceOut = $('price-out');
//     const originalText = priceOut.textContent;
//     priceOut.textContent = 'Calculating…';

//     try {
//       const res = await fetch('https://resaleiq-checkyourownphone.onrender.com/prediction', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
        
//       });

//       if (!res.ok) {
//         const err = await res.text();
//         console.error('Prediction request failed:', res.status, err);
//         priceOut.textContent = 'Error — check server';
//         return;
//       }

//       const data = await res.json();
//       priceOut.textContent = '₹' + data.predicted_resale_price.toLocaleString('en-IN');

//       const badge = $('device-badge');
//       if (badge) {
//         badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/></svg> ${payload.brand} · ${payload.condition}`;
//       }
//     } catch (e) {
//       console.error('Prediction request error:', e);
//       priceOut.textContent = originalText;
//     }
//   }

//   $('estimate-btn').addEventListener('click', render);
// });






document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const out = $('price-out');

  document.querySelectorAll('[data-switch]').forEach(sw =>
    sw.addEventListener('click', () => sw.classList.toggle('on')));
  const sw = n => {
    const s = document.querySelector(`[data-switch="${n}"]`);
    if (!s) throw new Error('switch not found: ' + n);
    return s.classList.contains('on') ? 1 : 0;
  };
  const el = id => { const e = $(id); if (!e) throw new Error('id not found: ' + id); return e; };
  const num = id => parseInt(el(id).value, 10) || 0;

  async function render() {
    let slow, kill;
    try {
      const payload = {
        brand: el('brand').value, condition: el('condition').value,
        original_price: num('original_price'), age_months: num('age_months'),
        battery_health: num('battery_health'),
        screen_cracked: sw('screen_cracked'), body_damage: sw('body_damage'),
        repair_history: num('repair_history'), water_damage: sw('water_damage'),
        warranty_remaining_months: num('warranty_remaining_months'),
        box_available: sw('box_available'), charger_available: sw('charger_available'),
        market_demand_score: num('market_demand_score'),
      };
      out.textContent = 'Calculating…';
      slow = setTimeout(() => out.textContent = 'Server waking up, ~1 min…', 4000);
      const ctrl = new AbortController();
      kill = setTimeout(() => ctrl.abort(), 90000);

      const res = await fetch('https://resaleiq-checkyourownphone.onrender.com/prediction', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: ctrl.signal,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Server ${res.status}: ${text.slice(0, 120)}`);
      const p = JSON.parse(text).predicted_resale_price;
      if (typeof p !== 'number') throw new Error('Bad response: ' + text.slice(0, 120));
      out.textContent = '₹' + Math.round(p).toLocaleString('en-IN');
      const badge = $('device-badge');
      if (badge) badge.textContent = `${payload.brand} · ${payload.condition}`;
    } catch (e) {
      console.error(e);
      out.textContent = e.name === 'AbortError' ? 'Timed out, try again' : 'Error: ' + e.message;
    } finally { clearTimeout(slow); clearTimeout(kill); }
  }

  $('estimate-btn').addEventListener('click', render);
});









