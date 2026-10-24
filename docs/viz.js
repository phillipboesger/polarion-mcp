/* Visual explainer for this project site: shape and flow only, drawn on canvas.
   Each canvas runs only while visible and shows one calm frame for reduced motion. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { cyan: "#62d6ff", blue: "#6aa9ff", warm: "#ffc266", mint: "#7be0b0", coral: "#ff8fa3", ice: "#bdeeff" };
  var TAU = Math.PI * 2;
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a.toFixed(3) + ")";
  }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  var MONO = "600 11px 'Geist Mono', ui-monospace, Menlo, monospace";
  function stage(canvas, init, draw) {
    var ctx = canvas.getContext("2d");
    var w = 0, h = 0, visible = false, raf = 0, last = 0, t0 = 0, state = null;
    function size() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = init(w, h, state);
      if (reduce || !visible) frame(performance.now(), true);
    }
    function frame(now, still) {
      if (!t0) t0 = now;
      var t = reduce ? 40 : (now - t0) / 1000;
      var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, t, dt, state, reduce || still);
      if (!reduce && visible && !still) raf = requestAnimationFrame(function (n) { frame(n, false); });
    }
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(canvas);
    else window.addEventListener("resize", size);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        cancelAnimationFrame(raf);
        last = 0;
        if (visible && !reduce) raf = requestAnimationFrame(function (n) { frame(n, false); });
      }).observe(canvas);
    } else {
      visible = true;
      if (!reduce) raf = requestAnimationFrame(function (n) { frame(n, false); });
    }
    size();
  }
  function bez(p0, p1, p2, p3, u) {
    var m = 1 - u;
    return m * m * m * p0 + 3 * m * m * u * p1 + 3 * m * u * u * p2 + u * u * u * p3;
  }
  var q = function (id) { return document.getElementById(id); };
  /* Hero: five AI clients around a ring of tool points. A question flies in, a tool answers. */
  function heroMcp(canvas) {
    var clients = [["Claude Code", C.warm], ["Claude Desktop", C.warm], ["Copilot", C.blue], ["ChatGPT", C.mint], ["Claude.ai", C.coral]];
    var R = rng(5);
    var N = 284;
    var ring = [];
    for (var i = 0; i < N; i++) {
      var a = (i / N) * TAU + (R() - 0.5) * 0.02;
      var band = i % 3;
      ring.push({ a: a, r: 0.84 + band * 0.09, lit: 0, band: band });
    }
    var packets = [], spawn = 0;
    return stage(canvas, function () { return {}; }, function (ctx, w, h, t, dt, s, still) {
      var cx = w / 2, cy = h * 0.52, rx = w * 0.43, ry = h * 0.4;
      function P(i) { var d = ring[i]; return [cx + Math.cos(d.a) * rx * d.r, cy + Math.sin(d.a) * ry * d.r]; }
      var cpos = clients.map(function (c, k) {
        var a = -Math.PI / 2 + (k + 0.5) * (TAU / clients.length) + 0.0;
        return [cx + Math.cos(a) * rx * 1.12, cy + Math.sin(a) * ry * 1.12, a];
      });
      if (!still) {
        spawn -= dt;
        if (spawn <= 0) {
          spawn = 0.45;
          packets.push({ c: Math.floor(Math.random() * clients.length), tool: Math.floor(Math.random() * N), u: 0 });
        }
      }
      if (still && !packets.length) for (var k = 0; k < 14; k++) ring[(k * 41) % N].lit = 0.6 + (k % 3) * 0.15;
      for (var i2 = 0; i2 < N; i2++) {
        var p = P(i2), d = ring[i2];
        d.lit = Math.max(0, d.lit - dt * 0.9);
        ctx.fillStyle = d.lit > 0.05 ? rgba(C.cyan, 0.35 + d.lit * 0.65) : rgba(C.ice, 0.3 + d.band * 0.08);
        var r2 = 1.5 + d.band * 0.3 + d.lit * 3.2;
        if (d.lit > 0.05) {
          ctx.fillStyle = rgba(C.cyan, 0.14 * d.lit);
          ctx.beginPath(); ctx.arc(p[0], p[1], r2 * 4, 0, TAU); ctx.fill();
          ctx.fillStyle = rgba(C.ice, 0.5 + d.lit * 0.5);
        }
        ctx.beginPath(); ctx.arc(p[0], p[1], r2, 0, TAU); ctx.fill();
      }
      ctx.lineWidth = 1;
      cpos.forEach(function (c) {
        ctx.strokeStyle = rgba(C.ice, 0.12);
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(cx, cy); ctx.stroke();
      });
      for (var k2 = packets.length - 1; k2 >= 0; k2--) {
        var pk = packets[k2];
        pk.u += dt * 0.55;
        var c0 = cpos[pk.c];
        var x, y, col;
        if (pk.u < 1) {
          var u = ease(pk.u);
          x = c0[0] + (cx - c0[0]) * u; y = c0[1] + (cy - c0[1]) * u; col = clients[pk.c][1];
        } else if (pk.u < 2) {
          var tp = P(pk.tool), u2 = ease(pk.u - 1);
          x = cx + (tp[0] - cx) * u2; y = cy + (tp[1] - cy) * u2; col = C.cyan;
        } else { ring[pk.tool].lit = 1; packets.splice(k2, 1); continue; }
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.font = MONO; ctx.textAlign = "center";
      cpos.forEach(function (c, k3) {
        var tw = ctx.measureText(clients[k3][0].toUpperCase()).width + 22;
        ctx.fillStyle = "rgba(11,42,76,0.9)";
        roundRect(ctx, c[0] - tw / 2, c[1] - 13, tw, 26, 13); ctx.fill();
        ctx.strokeStyle = rgba(clients[k3][1], 0.85); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.fillText(clients[k3][0].toUpperCase(), c[0], c[1] + 4);
      });
    });
  }

  /* Block: one server between the AI and Polarion, three ways in. */
  function flowMcp(canvas) {
    var ins = [["stdio", C.warm], ["MCP HTTP", C.blue], ["REST for GPTs", C.mint]];
    var outs = ["Work Items", "Documents", "Test Runs", "Plans", "Users"];
    var packets = [], spawn = 0;
    return stage(canvas, function () { return {}; }, function (ctx, w, h, t, dt, s, still) {
      var narrow = w < 560;
      var xi = w * 0.12, xc = w * (narrow ? 0.42 : 0.46), xo = w * (narrow ? 0.76 : 0.82);
      function yIn(i) { return h * (0.22 + i * 0.28); }
      function yOut(i) { return h * (0.12 + i * 0.19); }
      if (!still) {
        spawn -= dt;
        if (spawn <= 0) { spawn = 0.6; packets.push({ i: Math.floor(Math.random() * 3), o: Math.floor(Math.random() * 5), u: 0 }); }
      }
      ctx.lineWidth = 1.2;
      for (var i = 0; i < 3; i++) {
        ctx.strokeStyle = rgba(C.ice, 0.16);
        ctx.beginPath(); ctx.moveTo(xi, yIn(i)); ctx.bezierCurveTo(xi + (xc - xi) * 0.6, yIn(i), xc - (xc - xi) * 0.5, h * 0.5, xc, h * 0.5); ctx.stroke();
      }
      for (var o = 0; o < 5; o++) {
        ctx.strokeStyle = rgba(C.ice, 0.16);
        ctx.beginPath(); ctx.moveTo(xc, h * 0.5); ctx.bezierCurveTo(xc + (xo - xc) * 0.5, h * 0.5, xo - (xo - xc) * 0.6, yOut(o), xo, yOut(o)); ctx.stroke();
      }
      ctx.font = MONO; ctx.textAlign = "left";
      for (var a = 0; a < 3; a++) {
        ctx.fillStyle = "rgba(11,42,76,0.9)"; ctx.strokeStyle = rgba(ins[a][1], 0.9);
        ctx.beginPath(); ctx.arc(xi, yIn(a), 7, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText(ins[a][0].toUpperCase(), Math.max(6, xi - 8), yIn(a) - 17);
      }
      var pulse = still ? 1 : 1 + Math.sin(t * 2) * 0.1;
      ctx.fillStyle = rgba(C.cyan, 0.14); ctx.beginPath(); ctx.arc(xc, h * 0.5, 38 * pulse, 0, TAU); ctx.fill();
      ctx.fillStyle = C.ice; ctx.beginPath(); ctx.arc(xc, h * 0.5, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.textAlign = "center";
      ctx.fillText("MCP SERVER", xc, h * 0.5 + 58);
      for (var k = packets.length - 1; k >= 0; k--) {
        var pk = packets[k]; pk.u += dt * 0.3;
        if (pk.u >= 2) { packets.splice(k, 1); continue; }
        var x, y, col;
        if (pk.u < 1) {
          x = bez(xi, xi + (xc - xi) * 0.6, xc - (xc - xi) * 0.5, xc, pk.u);
          y = bez(yIn(pk.i), yIn(pk.i), h * 0.5, h * 0.5, pk.u); col = ins[pk.i][1];
        } else {
          var u2 = pk.u - 1;
          x = bez(xc, xc + (xo - xc) * 0.5, xo - (xo - xc) * 0.6, xo, u2);
          y = bez(h * 0.5, h * 0.5, yOut(pk.o), yOut(pk.o), u2); col = C.cyan;
        }
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.textAlign = "left";
      var bw = Math.min(110, w - xo - 8);
      for (var b = 0; b < 5; b++) {
        ctx.fillStyle = rgba(C.cyan, 0.14); roundRect(ctx, xo - 4, yOut(b) - 14, bw, 28, 8); ctx.fill();
        ctx.strokeStyle = rgba(C.cyan, 0.7); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.textAlign = "center";
        ctx.fillText(outs[b].toUpperCase(), xo - 4 + bw / 2, yOut(b) + 4);
      }
    });
  }
  if (q("viz-hero")) heroMcp(q("viz-hero"));
  if (q("viz-flow")) flowMcp(q("viz-flow"));
})();
