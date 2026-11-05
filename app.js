// Bot Trading PWA — view only
(function () {
  "use strict";

  const C = {
    bg: "#0B0C10", green: "#22C55E", red: "#EF4444", orange: "#F59E0B",
    indigo: "#5B43EA", blue: "#3B82F6", sub: "#9CA3AF", line: "#262933",
  };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let data = null;
  let tf = "SEMUA";

  function $(id) { return document.getElementById(id); }

  function fmtId(n, digits) {
    return Number(n).toFixed(digits).replace(".", ",");
  }

  function parseId(s) {
    if (typeof s === "number") return s;
    const cleaned = String(s).replace(/[^0-9,\-]/g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function pill(text, color, solid) {
    const cls = solid ? `pill solid ${color}` : `pill ${color}`;
    return `<span class="${cls}">${escapeHtml(text)}</span>`;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function countUp(el, target, digits, prefix, suffix) {
    if (reduce) {
      el.textContent = (prefix || "") + fmtId(target, digits) + (suffix || "");
      return;
    }
    const start = performance.now();
    const from = 0;
    const dur = 1200;
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * eased;
      el.textContent = (prefix || "") + fmtId(v, digits) + (suffix || "");
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderHero(d) {
    const eq = d.equity;
    const up = (eq.mult_num || d.current) >= 1;
    countUp($("usd"), eq.usd_num || parseId(eq.usd), 2, "$", "");
    $("sol").textContent = eq.sol + " SOL";
    const col = up ? "pnl-pos" : "pnl-neg";
    const pillCol = up ? "green" : "red";
    $("pnlRow").innerHTML =
      `<span class="${col}">${escapeHtml(eq.pnl)}</span>` +
      pill(eq.mult, pillCol);
    $("basisNote").textContent =
      `Modal ${eq.basis}` + (d.depositNote ? " · " + d.depositNote : "");
  }

  function renderChart(d) {
    const ptsAll = d.equityPoints || [];
    const start = tf === "SEMUA" ? 0 : Math.max(0, ptsAll.length - 12);
    const pts = ptsAll.slice(start);
    const floor = d.equityFloor ?? 0.95;
    const ceil = d.equityCeiling ?? 1.02;
    const current = d.current ?? 0.951;
    const col = current >= 1 ? C.green : C.red;
    const w = 360, h = 190, pl = 6, pr = 6, pt = 46, pb = 22;
    const n = Math.max(pts.length, 1);
    const xAt = (i) => pl + (n <= 1 ? 0 : (i / (n - 1)) * (w - pl - pr));
    const yAt = (v) => pt + (1 - (v - floor) / (ceil - floor || 1)) * (h - pt - pb);
    const dPath = pts.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`).join(" ");
    const area = pts.length
      ? `${dPath} L${xAt(n - 1).toFixed(1)} ${h - pb} L${xAt(0).toFixed(1)} ${h - pb} Z`
      : "";

    // markers from trades matching label times
    const marks = (d.trades || []).map((t) => {
      const gi = ptsAll.findIndex((p) => p.label === t.time);
      return { i: gi - start, act: t.aksi, tok: (t.symbol || "").replace(/^\$/, "") };
    }).filter((m) => m.i >= 0 && m.i < n);

    const labels = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];

    let marksSvg = "";
    marks.forEach((m, k) => {
      const x = xAt(m.i);
      const y = yAt(pts[m.i].value);
      const buy = m.act === "Beli";
      const c = buy ? C.green : C.red;
      const txt = `${m.act} ${m.tok}`;
      const bw = txt.length * 5.6 + 14;
      const top = 6 + (k % 2) * 18;
      const bx = Math.max(2, Math.min(w - bw - 2, x - bw / 2));
      marksSvg += `<g>
        <line x1="${x}" y1="${top + 16}" x2="${x}" y2="${y}" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 3"/>
        <circle cx="${x}" cy="${y}" r="4" fill="${c}"/>
        <rect x="${bx}" y="${top}" width="${bw}" height="16" rx="8" fill="${c}"/>
        <text x="${bx + bw / 2}" y="${top + 11.5}" text-anchor="middle" fill="#fff" font-size="9.5" font-weight="700">${escapeHtml(txt)}</text>
      </g>`;
    });

    let labelSvg = "";
    labels.forEach((i) => {
      if (!pts[i]) return;
      const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
      labelSvg += `<text x="${xAt(i)}" y="${h - 6}" text-anchor="${anchor}" fill="${C.sub}" font-size="10">${escapeHtml(pts[i].label)}</text>`;
    });

    $("chart").innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik kelipatan modal">
      <defs>
        <linearGradient id="nbFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${col}" stop-opacity=".35"/>
          <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
        </linearGradient>
        <filter id="nbGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      ${area ? `<path d="${area}" fill="url(#nbFill)"/>` : ""}
      ${dPath ? `<path d="${dPath}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#nbGlow)"/>` : ""}
      ${marksSvg}
      ${labelSvg}
    </svg>`;
    $("goalCap").textContent = `Kelipatan modal · sekarang ${fmtId(current, 3)}× · ${d.goalCaption || ""}`;
  }

  function donut(frac, label, color) {
    const r = 15, L = 2 * Math.PI * r;
    const f = Math.max(0, Math.min(1, frac));
    return `<svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="${r}" fill="none" stroke="${C.line}" stroke-width="4"/>
      <circle cx="20" cy="20" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"
        stroke-dasharray="${f * L} ${L}" transform="rotate(-90 20 20)"/>
      <text x="20" y="23.5" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">${escapeHtml(label)}</text>
    </svg>`;
  }

  function renderAgents(d) {
    const names = ["Scanner", "Momentum", "Dip Hunter", "Early", "Guard"];
    const crew = d.crew || [];
    const bots = names.map((n) => crew.find((b) => b.name === n)).filter(Boolean);
    const extra = crew.filter((b) => names.indexOf(b.name) < 0);
    const scan = d.scan || { coins: [] };
    const lolos = (scan.coins || []).filter((c) => c.verdict !== "SKIP").length;
    const dayParts = String((d.status && d.status.beli_hari_ini) || "").match(/\d+(,\d+)?/g) || [];
    const day = dayParts.map((x) => Number(String(x).replace(",", ".")));

    $("agentsCount").textContent = `${bots.length} jalan`;

    $("agents").innerHTML = bots.map((b) => {
      const accent = b.name === "Early" ? C.orange : b.name === "Guard" ? C.green : C.indigo;
      let ring = "";
      if (b.name === "Scanner" && (scan.coins || []).length) {
        ring = donut(lolos / scan.coins.length, `${lolos}/${scan.coins.length}`, C.green);
      } else if ((b.name === "Momentum" || b.name === "Dip Hunter") && day.length >= 2) {
        ring = donut(day[0] / (day[1] || 1), `${Math.round((day[0] / (day[1] || 1)) * 100)}%`, C.indigo);
      } else if (b.name === "Early" && day.length >= 4) {
        ring = donut(day[2] / (day[3] || 1), `${Math.round((day[2] / (day[3] || 1)) * 100)}%`, C.orange);
      }
      const radar = b.name === "Scanner" ? `<div class="radar"></div>` : "";
      let extras = "";
      if (b.name === "Scanner") {
        extras = extra.map((e) =>
          `<div class="muted tiny"><b style="color:#fff">${escapeHtml(e.name)}:</b> ${escapeHtml(e.bubble)}</div>`
        ).join("");
      }
      return `<div class="agent">
        <div class="agent-top">
          <div class="agent-name">
            <div class="agent-ico" style="background:${accent}33">${radar}<div class="core" style="background:${accent}"></div></div>
            ${escapeHtml(b.name)}
          </div>
          ${ring}
        </div>
        <div class="role">${escapeHtml(b.role)}</div>
        <div class="bubble">${escapeHtml(b.bubble)}</div>
        ${extras}
        <div class="st"><i></i>${escapeHtml(b.status)}</div>
      </div>`;
    }).join("");
  }

  function renderStats(d) {
    const s = d.stats || {};
    const items = [
      { k: "Trades", v: s.trades || d.equity.trades },
      { k: "Win rate", v: (s.win_rate || d.equity.win || "").replace(/^win rate /, "") },
      { k: "Trade terbaik", v: s.best_trade || d.equity.best_trade || "–" },
      { k: "Pool discan", v: s.pool_discan || `${(d.scan && d.scan.total) || 0} kandidat` },
    ];
    $("stats").innerHTML = items.map((it) => {
      const neg = it.k === "Trade terbaik" && String(it.v).startsWith("-");
      return `<div class="stat"><div class="k">${escapeHtml(it.k)}</div>
        <div class="v" style="${neg ? "color:var(--red)" : ""}">${escapeHtml(it.v)}</div></div>`;
    }).join("");
  }

  function renderPositions(d) {
    const pos = d.positions || [];
    $("posPill").textContent = `${pos.length} posisi`;
    if (!pos.length) {
      $("positions").innerHTML = `<div class="empty"><div class="ring">◎</div><div>${escapeHtml(d.tradesNote || "Tidak ada posisi terbuka.")}</div></div>`;
      return;
    }
    $("positions").innerHTML = pos.map((p) => {
      const pct = p.pct != null ? `${Number(p.pct) >= 0 ? "+" : ""}${fmtId(p.pct, 1)}%` : "";
      const col = (p.pct || 0) >= 0 ? "green" : "red";
      return `<div class="feed-row">
        <div class="ico" style="background:rgba(91,67,234,.15);color:var(--indigo)">◎</div>
        <div class="feed-main">
          <div class="h">$${escapeHtml(p.symbol)}</div>
          <div class="s">${escapeHtml(p.strategi || "")}</div>
        </div>
        <div class="feed-right">${pct ? pill(pct, col) : ""}</div>
      </div>`;
    }).join("");
  }

  function renderActivity(d) {
    const trades = d.trades || [];
    if (!trades.length) {
      $("activity").innerHTML = `<div class="muted tiny">Belum ada trade.</div>`;
      return;
    }
    $("activity").innerHTML = trades.map((t) => {
      const stop = t.aksi === "Jual" && /stop/i.test(t.alasan || "");
      const col = t.aksi === "Beli" ? C.blue : stop ? C.red : C.green;
      const icon = t.aksi === "Beli" ? "↓" : stop ? "✕" : "↑";
      const label = t.aksi === "Beli" ? "Beli" : stop ? "Stop loss" : "Take profit";
      let below = "";
      if (t.aksi === "Jual" && t.perubahan) {
        below = pill(t.perubahan, String(t.perubahan).startsWith("-") ? "red" : "green");
      } else if (t.aksi === "Beli") {
        const mc = (t.alasan || "").match(/MC (~?\$[0-9.,]+ ?(rb|jt)?)/i);
        if (mc) below = `<span class="muted tiny">di MC ${escapeHtml(mc[1])}</span>`;
      }
      const head = t.solscan
        ? `<a href="${escapeHtml(t.solscan)}" target="_blank" rel="noopener">${escapeHtml(label)} ${escapeHtml(t.token)}</a>`
        : `${escapeHtml(label)} ${escapeHtml(t.token)}`;
      return `<div class="feed-row">
        <div class="ico" style="background:${col}26;color:${col}">${icon}</div>
        <div class="feed-main"><div class="h">${head}</div>
          <div class="s">${escapeHtml(t.strategi)} • ${escapeHtml(t.time)} WIT</div></div>
        <div class="feed-right"><div class="v">${escapeHtml(t.sol)} SOL</div>${below}</div>
      </div>`;
    }).join("");
  }

  function renderScan(d) {
    const s = d.scan || { coins: [], runTime: "", total: 0, totalLabel: "" };
    $("scanTime").textContent = s.runTime || "";
    $("scanMeta").textContent = `${s.total || 0} ${s.totalLabel || ""}`;
    $("scan").innerHTML = (s.coins || []).map((c) => {
      const vcol = c.verdict === "DIBELI" ? "green" : c.verdict === "LOLOS" ? "indigo" : "red";
      const solid = c.verdict !== "SKIP";
      const icoCol = c.lane === "Early" ? C.orange : c.lane === "Watchlist" ? C.blue : C.indigo;
      const meta = [c.mc ? `MC ${c.mc}` : "", c.liq ? `Liq ${c.liq}` : "", c.age || "", c.h1 ? `1j ${c.h1}` : "", c.h24 ? `24j ${c.h24}` : ""]
        .filter(Boolean).join(" · ");
      const letter = (c.symbol || "?").slice(0, 1).toUpperCase();
      return `<div class="feed-row">
        <div class="ico" style="background:${icoCol}26;color:${icoCol}">${escapeHtml(letter)}</div>
        <div class="feed-main">
          <div class="h"><a href="https://dexscreener.com/solana/${escapeHtml(c.mint || "")}" target="_blank" rel="noopener">$${escapeHtml(c.symbol)}</a></div>
          <div class="s">${escapeHtml(c.lane)} • ${escapeHtml(c.source || "")}${meta ? " • " + escapeHtml(meta) : ""} — ${escapeHtml(c.reason || "")}</div>
        </div>
        <div class="feed-right">${pill(c.verdict || "SKIP", vcol, solid)}</div>
      </div>`;
    }).join("") || `<div class="muted tiny">Belum ada hasil scan.</div>`;
  }

  function renderSettings(d) {
    const r = d.rules || {};
    const st = d.status || {};
    const rows = [
      { k: "Stop loss", v: r.stop_loss, c: "var(--red)" },
      { k: "Take profit", v: r.take_profit, c: "var(--green)" },
      { k: "Kunci profit", v: r.kunci_profit || st.kunci_profit, c: "#fff" },
      { k: "Per beli", v: r.per_beli, c: "#fff" },
      { k: "Maks per hari", v: r.maks_per_hari, c: "#fff" },
      { k: "Cadangan fee", v: r.cadangan_fee, c: "#fff" },
      { k: "Beli hari ini", v: st.beli_hari_ini, c: "#fff" },
      { k: "Jadwal", v: r.jadwal || st.jadwal, c: "#fff" },
      { k: "Wallet", v: d.wallet || st.wallet, c: "#fff" },
    ];
    $("settings").innerHTML = rows.map((row) =>
      `<div class="set-row"><span class="k">${escapeHtml(row.k)}</span>
       <span class="v" style="color:${row.c}">${escapeHtml(row.v || "—")}</span></div>`
    ).join("");
  }

  function renderFilters(d) {
    $("filters").innerHTML = (d.filters || []).map((f) =>
      `<div class="filter"><div class="t">${escapeHtml(f.title)}</div>
       <div class="d">${escapeHtml(f.detail)}</div></div>`
    ).join("");
    $("risk").textContent = d.riskNote || "";
  }

  function renderAll(d) {
    data = d;
    $("updated").textContent = "Update terakhir: " + (d.updated || "—");
    $("livePill").style.opacity = d.live === false ? "0.5" : "1";
    renderHero(d);
    renderChart(d);
    renderAgents(d);
    renderStats(d);
    renderPositions(d);
    renderActivity(d);
    renderScan(d);
    renderSettings(d);
    renderFilters(d);
    $("walletFoot").textContent = d.wallet_full
      ? `Wallet ${d.wallet} · ${d.wallet_full.slice(0, 8)}…`
      : "";
  }

  async function load() {
    try {
      const res = await fetch("data.json?ts=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const d = await res.json();
      renderAll(d);
    } catch (e) {
      $("updated").textContent = "Gagal muat data · coba lagi nanti";
      console.warn(e);
    }
  }

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      tf = btn.getAttribute("data-tf") || "SEMUA";
      if (data) renderChart(data);
    });
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  load();
  setInterval(load, 60000);
})();
