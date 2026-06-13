/* Car Advisor — hero particle morph engine (photo edition).
   One particle pool reshapes itself through real car photographs (graded dark + gold):
   swirl -> condense (photo fades in) -> ignition beat (headlights flare + sheen) -> dissolve -> next car.
   Registers <hero-particles> as a custom element. Cutouts + metadata live in cars/. */
(function () {
  'use strict';
  if (customElements.get('hero-particles')) return;

  var VW = 1000, VH = 460, GROUND = 404;
  var T_SWIRL = 1.6, T_COND = 2.0, T_IN = 0.8, T_HOLD = 3.0, T_OUT = 0.8, T_DISS = 2.1;
  var B_COND = T_SWIRL;                 // 1.6
  var B_IN = B_COND + T_COND;           // 3.6
  var B_HOLD = B_IN + T_IN;             // 4.4
  var B_OUT = B_HOLD + T_HOLD;          // 7.4
  var B_DISS = B_OUT + T_OUT;           // 8.2
  var T_TOTAL = B_DISS + T_DISS;        // 10.3
  var GOLD = '212,175,106';
  var LS_KEY = 'carAdvisorHero.carIdx';

  var DEFAULT_ROTATION = [
    { key: 'runner', name: 'Toyota 4Runner', tag: '2026 · trail SUV', destW: 800 },
    { key: 'camry', name: 'Toyota Camry', tag: '2026 · hybrid sedan', destW: 840 },
    { key: 'cx5', name: 'Mazda CX-5', tag: '2026 · compact SUV', destW: 740 },
    { key: 'accord', name: 'Honda Accord', tag: '2026 · midsize sedan', destW: 840 }
  ];
  var CARS = cloneCars(DEFAULT_ROTATION);

  function cloneCarConfig(car) {
    return { key: car.key, name: car.name, tag: car.tag, destW: car.destW };
  }

  function cloneCars(cars) {
    return (cars || []).map(cloneCarConfig);
  }

  function normalizeCarIndex(idx, length) {
    if (!length) return 0;
    idx = parseInt(idx, 10);
    if (!isFinite(idx) || idx < 0) return 0;
    return idx % length;
  }

  function normalizeRotation(rotation, meta) {
    var metaHasKeys = meta && Object.keys(meta).length > 0;
    var source = Array.isArray(rotation) ? rotation : DEFAULT_ROTATION;
    var normalized = [];
    source.forEach(function (car) {
      if (!car || car.status === 'inactive') return;
      if (!car.key || !car.name || !car.tag || !car.destW) return;
      if (metaHasKeys && !meta[car.key]) return;
      normalized.push(cloneCarConfig(car));
    });
    return normalized.length ? normalized : cloneCars(DEFAULT_ROTATION);
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function trace(ctx, pts, closed) {
    var n = pts.length, i, p, q;
    ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (i = 0; i < n; i++) {
      p = pts[i]; q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    if (closed !== false) ctx.closePath();
  }

  function phaseAt(tc) {
    var carAlpha = smooth((tc - B_COND) / (T_COND - 0.2)) * (1 - smooth((tc - B_DISS) / 1.3));
    var beat = 0;
    if (tc >= B_IN && tc < B_HOLD) beat = smooth((tc - B_IN) / T_IN);
    else if (tc >= B_HOLD && tc < B_OUT) beat = 1;
    else if (tc >= B_OUT && tc < B_DISS) beat = 1 - smooth((tc - B_OUT) / T_OUT);
    var noiseAmp;
    if (tc < B_COND) noiseAmp = lerp(30, 13, smooth(tc / T_SWIRL));
    else if (tc < B_DISS) noiseAmp = lerp(13, 2.2, smooth((tc - B_COND) / 1.4));
    else noiseAmp = lerp(2.2, 34, smooth((tc - B_DISS) / 1.1));
    var sheen = clamp01((tc - (B_COND + 1.0)) / 1.1);
    var labelA = smooth((tc - (B_COND + 0.7)) / 0.7) * (1 - smooth((tc - B_DISS) / 0.6));
    return { carAlpha: carAlpha * 0.97, beat: beat, noiseAmp: noiseAmp, sheen: sheen, labelA: labelA };
  }

  function HeroParticles() {
    return Reflect.construct(HTMLElement, [], HeroParticles);
  }
  HeroParticles.prototype = Object.create(HTMLElement.prototype, { constructor: { value: HeroParticles } });
  Object.setPrototypeOf(HeroParticles, HTMLElement);

  HeroParticles.prototype.connectedCallback = function () {
    if (this.__init) {
      if (this.__attachParallax) this.__attachParallax();
      if (this.__startStop) this.__startStop();
      return;
    }
    this.__init = true;
    var host = this;
    host.style.display = 'block';
    host.style.position = host.style.position || 'relative';
    host.style.pointerEvents = 'none';
    if (!host.style.height) { host.style.width = '100%'; host.style.height = '100%'; }

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    var label = document.createElement('div');
    label.style.cssText = 'position:absolute;right:4.5%;bottom:9%;text-align:right;opacity:0;' +
      'font-family:"Instrument Sans",ui-sans-serif,system-ui,sans-serif;pointer-events:none;';
    label.innerHTML = '<div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(212,175,106,0.85);margin-bottom:4px;"></div>' +
      '<div style="font-size:14px;letter-spacing:0.06em;color:rgba(242,237,227,0.6);"></div>';
    host.appendChild(label);
    var labelTop = label.children[0], labelSub = label.children[1];

    var ctx = canvas.getContext('2d');
    var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

    var sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    (function () {
      var s = sprite.getContext('2d');
      var rg = s.createRadialGradient(16, 16, 0, 16, 16, 16);
      rg.addColorStop(0, 'rgba(255,238,200,1)');
      rg.addColorStop(0.25, 'rgba(' + GOLD + ',0.85)');
      rg.addColorStop(1, 'rgba(' + GOLD + ',0)');
      s.fillStyle = rg; s.fillRect(0, 0, 32, 32);
    })();

    var isMobile = Math.min(window.innerWidth, window.innerHeight) < 700 || window.innerWidth < 760;
    var COUNT = reduced.matches ? 2600 : (isMobile ? 1800 : 5200);

    /* ---- async asset load: cutout photos + traced metadata ---- */
    var ready = false;
    var baseURL = (function () {
      try {
        var attrBase = host.getAttribute('data-assets-base');
        if (attrBase) return new URL(attrBase, location.href);
        return new URL('.', document.currentScript && document.currentScript.src || location.href);
      }
      catch (e) { return null; }
    })();
    function resolve(p) { try { return baseURL ? new URL(p, baseURL).href : p; } catch (e) { return p; } }

    function primeCars(cars) {
      cars.forEach(function (car) {
        // dest rect in car space (front faces right, right-aligned block)
        car.img = null; car.pools = null; car.poly = null; car.lights = [];
      });
    }

    function fetchJson(path, fallback) {
      return fetch(resolve(path)).then(function (r) {
        if (!r.ok) throw new Error(path + ' ' + r.status);
        return r.json();
      }).catch(function (e) {
        host.__assetWarnings = (host.__assetWarnings || []).concat(path + ': ' + e);
        return fallback;
      });
    }

    function loadCarImage(car, meta) {
      return new Promise(function (res) {
        var m = meta && meta[car.key];
        if (!m || !m.src) { res(); return; }
        var tries = 0;
        function attempt() {
          var img = new Image();
          img.onload = function () { car.img = img; car.meta = m; res(); };
          img.onerror = function () {
            tries++;
            if (tries < 4) setTimeout(attempt, 350 * tries);
            else res();
          };
          img.src = resolve(m.src) + (tries ? ('?r=' + tries) : '');
        }
        attempt();
      });
    }

    function layoutLoadedCars() {
      CARS.forEach(function (car) {
        if (!car.img || !car.meta) return;
        var m = car.meta;
        var dw = car.destW, dh = dw * m.h / m.w;
        var dx = 952 - dw, dy = GROUND - dh * (m.ground || 1);
        car.rect = { x: dx, y: dy, w: dw, h: dh };
        var toCar = function (p) { return [dx + p[0] * dw, dy + p[1] * dh]; };
        car.poly = (m.poly || []).map(toCar);
        car.lights = (m.headlights || []).map(toCar);
        car.pools = buildPools(car);
      });
    }

    function loadHeroAssets() {
      primeCars(CARS);
      return Promise.all([
        fetchJson('cars/meta.json', {}),
        fetchJson('cars/rotation.json', DEFAULT_ROTATION)
      ]).then(function (results) {
        var meta = results[0] || {};
        var rotation = results[1];
        CARS = normalizeRotation(rotation, meta);
        primeCars(CARS);
        carIdx = normalizeCarIndex(carIdx, CARS.length);
        return Promise.all(CARS.map(function (car) { return loadCarImage(car, meta); }));
      }).then(function () {
        layoutLoadedCars();
      });
    }

    loadHeroAssets().then(function () {
      ready = true;
      carIdx = normalizeCarIndex(carIdx, CARS.length);
      for (var i = 0; i < COUNT; i++) pickTarget(carIdx, parts[i]);
      labelIdx = -1;
      setLabel(carIdx);
      start = performance.now() / 1000;  // restart the cycle cleanly
      lastTc = 0;
    }).catch(function (e) {
      host.__err = 'asset load: ' + e;
      ready = true;
    });

    function buildPools(car) {
      var iw = car.img.naturalWidth, ih = car.img.naturalHeight;
      var c = document.createElement('canvas');
      c.width = iw; c.height = ih;
      var g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(car.img, 0, 0);
      var d = g.getImageData(0, 0, iw, ih).data;
      var A = function (x, y) { return (x < 0 || y < 0 || x >= iw || y >= ih) ? 0 : d[(y * iw + x) * 4 + 3]; };
      var L = function (x, y) { var i = (y * iw + x) * 4; return (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; };
      var edges = [], inner = [];
      var sx = car.rect.w / iw, sy = car.rect.h / ih;
      for (var y = 1; y < ih - 1; y++) {
        for (var x = 1; x < iw - 1; x++) {
          var a = A(x, y);
          if (a < 130) continue;
          var cx = car.rect.x + x * sx, cy = car.rect.y + y * sy;
          var sil = (A(x - 2, y) < 70 || A(x + 2, y) < 70 || A(x, y - 2) < 70 || A(x, y + 2) < 70);
          if (sil) {
            // suppress edge particles along near-black remnants (faded road under the car)
            var ll = L(x, y);
            if (ll > 0.055 || Math.random() < 0.18) edges.push([cx, cy]);
            continue;
          }
          var gx = Math.abs(L(x + 2, y) - L(x - 2, y));
          var gy = Math.abs(L(x, y + 2) - L(x, y - 2));
          if ((gx > 0.14 || gy > 0.14) && Math.random() < 0.5) { edges.push([cx, cy]); continue; }
          if (Math.random() < 0.02 + L(x, y) * 0.05) inner.push([cx, cy]);
        }
      }
      return { edges: edges, inner: inner };
    }

    var carIdx = 0;
    try { var st = parseInt(localStorage.getItem(LS_KEY), 10); carIdx = normalizeCarIndex(st, CARS.length); } catch (e) {}
    var pendingIdx = -1;

    function pickTarget(idx, p) {
      var car = CARS[idx];
      if (!car.pools) {
        // ambient drift cloud while assets load
        var a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 260;
        p.tx = 620 + Math.cos(a) * r; p.ty = 250 + Math.sin(a) * r * 0.55;
        p.baseA = 0.3 + Math.random() * 0.4;
        return;
      }
      var pool = car.pools, roll = Math.random(), pt;
      if (roll < 0.30 && pool.inner.length) {
        pt = pool.inner[(Math.random() * pool.inner.length) | 0];
        p.baseA = 0.22 + Math.random() * 0.26;
      } else if (pool.edges.length) {
        pt = pool.edges[(Math.random() * pool.edges.length) | 0];
        p.baseA = 0.6 + Math.random() * 0.4;
      } else {
        var aa = Math.random() * Math.PI * 2, rr = 120 + Math.random() * 260;
        p.tx = 620 + Math.cos(aa) * rr; p.ty = 250 + Math.sin(aa) * rr * 0.55;
        p.baseA = 0.3 + Math.random() * 0.4;
        return;
      }
      p.tx = pt[0]; p.ty = pt[1];
    }

    var parts = new Array(COUNT);
    for (var i = 0; i < COUNT; i++) {
      var p = {
        x: Math.random() * VW, y: Math.random() * VH,
        vx: 0, vy: 0, tx: 0, ty: 0, baseA: 1,
        size: 0.7 + Math.random() * 1.5,
        ph: Math.random() * Math.PI * 2,
        tw: 1.5 + Math.random() * 3.5,
        sp: 0.35 + Math.random() * 0.8,
        switchT: 0, switched: true
      };
      pickTarget(carIdx, p);
      parts[i] = p;
    }

    var W = 0, H = 0, dpr = 1, scl = 1, ox = 0, oy = 0;
    function resize() {
      var r = host.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) {
        var pr = host.parentElement && host.parentElement.getBoundingClientRect();
        if (pr && pr.width > 10 && pr.height > 10) r = pr;
        else { setTimeout(resize, 250); return; }
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      var fitW = W < 900 ? W * 0.96 : W * 0.70;
      scl = Math.min(fitW / VW, (H * 0.86) / VH);
      ox = W < 900 ? (W - VW * scl) * 0.5 : W * 0.985 - VW * scl;
      oy = H * 0.84 - GROUND * scl;
    }
    resize();
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host);
    window.addEventListener('resize', resize);

    var labelIdx = -1;
    function setLabel(idx) {
      if (idx === labelIdx) return;
      labelIdx = idx;
      labelTop.textContent = String(idx + 1).padStart(2, '0') + ' — ' + CARS[idx].name;
      labelSub.textContent = CARS[idx].tag;
    }
    setLabel(carIdx);

    var parallax = { x: 0, y: 0, tx: 0, ty: 0, power: 0, targetPower: 0, selected: false, pointerId: null };

    function currentCarScreenRect(pad) {
      var car = CARS[carIdx];
      if (!ready || !car || !car.rect) return null;
      var R = car.rect;
      var padX = pad == null ? Math.max(24, R.w * scl * 0.08) : pad;
      var padY = pad == null ? Math.max(18, R.h * scl * 0.18) : pad * 0.7;
      return {
        x: ox + R.x * scl - padX,
        y: oy + R.y * scl - padY,
        w: R.w * scl + padX * 2,
        h: R.h * scl + padY * 2
      };
    }

    function pointerWithinCar(e) {
      var hostRect = host.getBoundingClientRect();
      var carRect = currentCarScreenRect();
      if (!carRect || hostRect.width < 10 || hostRect.height < 10) return false;
      var x = e.clientX - hostRect.left;
      var y = e.clientY - hostRect.top;
      return x >= carRect.x && x <= carRect.x + carRect.w && y >= carRect.y && y <= carRect.y + carRect.h;
    }

    function setParallaxTarget(e, selected) {
      var hostRect = host.getBoundingClientRect();
      var carRect = currentCarScreenRect(52);
      if (!carRect || hostRect.width < 10 || hostRect.height < 10) return;
      var x = e.clientX - hostRect.left;
      var y = e.clientY - hostRect.top;
      parallax.tx = clamp01((x - carRect.x) / carRect.w) * 2 - 1;
      parallax.ty = clamp01((y - carRect.y) / carRect.h) * 2 - 1;
      parallax.targetPower = selected ? 1 : 0.42;
    }

    function resetParallaxTarget() {
      parallax.tx = 0;
      parallax.ty = 0;
      parallax.targetPower = 0;
    }

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      if (!pointerWithinCar(e)) return;
      parallax.selected = true;
      parallax.pointerId = e.pointerId == null ? null : e.pointerId;
      setParallaxTarget(e, true);
    }

    function onPointerMove(e) {
      if (parallax.selected && (parallax.pointerId == null || e.pointerId === parallax.pointerId)) {
        setParallaxTarget(e, true);
        return;
      }
      if (pointerWithinCar(e)) setParallaxTarget(e, false);
      else resetParallaxTarget();
    }

    function onPointerUp(e) {
      if (!parallax.selected) return;
      if (e.type !== 'blur' && parallax.pointerId != null && e.pointerId !== parallax.pointerId) return;
      parallax.selected = false;
      parallax.pointerId = null;
      resetParallaxTarget();
    }

    function attachParallaxListeners() {
      if (host.__parallaxAttached) return;
      host.__parallaxAttached = true;
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { passive: true });
      window.addEventListener('pointercancel', onPointerUp, { passive: true });
      window.addEventListener('blur', onPointerUp);
    }

    function detachParallaxListeners() {
      if (!host.__parallaxAttached) return;
      host.__parallaxAttached = false;
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onPointerUp);
    }

    this.__attachParallax = attachParallaxListeners;
    this.__detachParallax = detachParallaxListeners;
    attachParallaxListeners();

    function drawCar(g, car, alpha, beat, sheen, motion) {
      if (!car.img || !car.rect || alpha <= 0.004) return;
      var R = car.rect;
      motion = motion || { x: 0, y: 0, rot: 0, scale: 1 };
      var cx = R.x + R.w * 0.5;
      var cy = R.y + R.h * 0.58;
      g.save();
      g.globalAlpha = alpha;

      if (motion.x || motion.y || motion.rot || motion.scale !== 1) {
        g.translate(cx + motion.x, cy + motion.y);
        g.rotate(motion.rot || 0);
        g.scale(motion.scale || 1, motion.scale || 1);
        g.translate(-cx, -cy);
      }

      // ground shadow + gold floor glow
      var grd = g.createRadialGradient(cx, GROUND + 6, 10, cx, GROUND + 6, R.w * 0.55);
      grd.addColorStop(0, 'rgba(0,0,0,0.65)');
      grd.addColorStop(0.55, 'rgba(' + GOLD + ',' + (0.05 + 0.10 * beat).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(cx, GROUND + 8); g.scale(1, 0.12); g.translate(-cx, -(GROUND + 8));
      g.fillStyle = grd; g.beginPath(); g.arc(cx, GROUND + 8, R.w * 0.55, 0, Math.PI * 2); g.fill(); g.restore();

      // the photograph
      g.drawImage(car.img, R.x, R.y, R.w, R.h);

      // gold rim light along the traced silhouette (brighter on top)
      if (car.poly) {
        var rim = g.createLinearGradient(0, R.y - 10, 0, GROUND);
        rim.addColorStop(0, 'rgba(' + GOLD + ',' + (0.75 + 0.2 * beat).toFixed(3) + ')');
        rim.addColorStop(0.5, 'rgba(' + GOLD + ',0.22)');
        rim.addColorStop(1, 'rgba(' + GOLD + ',0.06)');
        g.strokeStyle = rim; g.lineWidth = 1.6;
        g.beginPath(); trace(g, car.poly, true); g.stroke();
      }

      // ignition beat: headlights flare + light cones (car faces right)
      if (beat > 0.01 && car.lights.length) {
        g.globalCompositeOperation = 'lighter';
        car.lights.forEach(function (pt) {
          var fr = (14 + 30 * beat);
          var fg = g.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], fr);
          fg.addColorStop(0, 'rgba(255,244,214,' + (0.85 * beat).toFixed(3) + ')');
          fg.addColorStop(0.35, 'rgba(' + GOLD + ',' + (0.35 * beat).toFixed(3) + ')');
          fg.addColorStop(1, 'rgba(' + GOLD + ',0)');
          g.fillStyle = fg;
          g.beginPath(); g.arc(pt[0], pt[1], fr, 0, Math.PI * 2); g.fill();
          // forward cone (cars face left)
          g.save();
          g.translate(pt[0], pt[1]); g.scale(-3.4, 1);
          var cg = g.createRadialGradient(0, 0, 0, 0, 0, 26 * beat + 6);
          cg.addColorStop(0, 'rgba(255,238,200,' + (0.16 * beat).toFixed(3) + ')');
          cg.addColorStop(1, 'rgba(255,238,200,0)');
          g.fillStyle = cg;
          g.beginPath(); g.arc(0, 0, 26 * beat + 6, -Math.PI / 2, Math.PI / 2); g.fill();
          g.restore();
        });
        // faint overall lift of the body
        g.globalAlpha = alpha * 0.10 * beat;
        g.drawImage(car.img, R.x, R.y, R.w, R.h);
        g.globalAlpha = alpha;
        g.globalCompositeOperation = 'source-over';
      }

      // sheen sweep clipped to silhouette
      if (car.poly && sheen > 0.001 && sheen < 0.999) {
        var sx = lerp(R.x - 180, R.x + R.w + 180, sheen);
        g.save();
        g.beginPath(); trace(g, car.poly, true); g.clip();
        var sg = g.createLinearGradient(sx - 120, 0, sx + 120, 0);
        sg.addColorStop(0, 'rgba(' + GOLD + ',0)');
        sg.addColorStop(0.5, 'rgba(' + GOLD + ',0.14)');
        sg.addColorStop(1, 'rgba(' + GOLD + ',0)');
        g.fillStyle = sg;
        g.fillRect(sx - 130, R.y - 20, 260, R.h + 40);
        g.restore();
      }

      g.restore();
    }

    var start = performance.now() / 1000;
    var lastTc = 0, lastFrame = performance.now() / 1000;

    // debug/preview hooks
    host.__seek = function (sec) { start = performance.now() / 1000 - sec; lastTc = sec % T_TOTAL; };
    host.__setCar = function (i) {
      carIdx = normalizeCarIndex(i, CARS.length); pendingIdx = -1; setLabel(carIdx);
      for (var z = 0; z < COUNT; z++) { pickTarget(carIdx, parts[z]); parts[z].switched = true; }
    };
    host.__renderAt = function (sec, steps) {
      steps = steps || 1;
      var base = performance.now();
      start = base / 1000 - sec + (steps - 1) * 0.016;
      lastFrame = base / 1000 - 0.016;
      lastTc = Math.max(0, (sec - steps * 0.016)) % T_TOTAL;
      for (var k = 0; k < steps; k++) frameInner(base + k * 16);
    };
    host.__ready = function () { return ready; };

    function frame(nowMs) {
      try { frameInner(nowMs); } catch (e) { host.__err = String(e && e.stack || e); return; }
      host.__raf = requestAnimationFrame(frame);
    }

    function frameInner(nowMs) {
      var now = nowMs / 1000;
      var dt = Math.max(0.001, Math.min(now - lastFrame, 0.05));
      lastFrame = now;
      var t = now - start;
      var tc = ready ? (t % T_TOTAL) : (T_SWIRL * 0.5);

      if (ready) {
        if (tc < lastTc && pendingIdx >= 0) {
          carIdx = pendingIdx; pendingIdx = -1;
          try { localStorage.setItem(LS_KEY, String(carIdx)); } catch (e) {}
          setLabel(carIdx);
        }
        if (lastTc < B_DISS && tc >= B_DISS && pendingIdx < 0) {
          pendingIdx = normalizeCarIndex(carIdx + 1, CARS.length);
          for (var j = 0; j < COUNT; j++) {
            parts[j].switched = false;
            parts[j].switchT = tc + Math.random() * 1.7;
          }
        }
        lastTc = tc;
      }

      var ph = ready ? phaseAt(tc) : { carAlpha: 0, beat: 0, noiseAmp: 24, sheen: 0, labelA: 0 };
      var car = CARS[carIdx];

      label.style.opacity = ph.labelA.toFixed(3);

      var k = 1 - Math.pow(0.0001, dt);
      var damp = Math.pow(0.082, dt);
      var amp = ph.noiseAmp;
      var parallaxEase = 1 - Math.pow(0.002, dt);
      parallax.x += (parallax.tx - parallax.x) * parallaxEase;
      parallax.y += (parallax.ty - parallax.y) * parallaxEase;
      parallax.power += (parallax.targetPower - parallax.power) * parallaxEase;
      var motionPower = parallax.power * clamp01(ph.carAlpha * 1.4);
      var motionX = parallax.x * motionPower;
      var motionY = parallax.y * motionPower;
      var carMotion = {
        x: motionX * 26,
        y: motionY * 14,
        rot: motionX * 0.018,
        scale: 1 + motionPower * 0.012
      };
      var particlePushX = motionX * 14;
      var particlePushY = motionY * 8;
      for (var n = 0; n < COUNT; n++) {
        var q = parts[n];
        if (pendingIdx >= 0 && !q.switched && tc >= q.switchT) {
          pickTarget(pendingIdx, q);
          q.switched = true;
        }
        var ttx = q.tx + particlePushX + (Math.sin(t * q.sp + q.ph) + 0.5 * Math.sin(q.ty * 0.021 + t * 0.8)) * amp;
        var tty = q.ty + particlePushY + (Math.cos(t * q.sp * 0.83 + q.ph * 1.7) + 0.5 * Math.cos(q.tx * 0.017 - t * 0.6)) * amp * 0.8;
        q.vx += (ttx - q.x) * k * 2.6;
        q.vy += (tty - q.y) * k * 2.6;
        q.vx *= damp; q.vy *= damp;
        q.x += q.vx * dt * 60 * 0.16;
        q.y += q.vy * dt * 60 * 0.16;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var camX = Math.sin(t * 0.11) * 9, camY = Math.cos(t * 0.085) * 6;
      var camS = 1 + 0.013 * Math.sin(t * 0.064);
      var pivX = VW * 0.55, pivY = VH * 0.62;
      ctx.setTransform(dpr * scl * camS, 0, 0, dpr * scl * camS,
        dpr * (ox + camX * scl + pivX * scl * (1 - camS)),
        dpr * (oy + camY * scl + pivY * scl * (1 - camS)));

      drawCar(ctx, car, ph.carAlpha, ph.beat, ph.sheen, carMotion);

      ctx.globalCompositeOperation = 'lighter';
      var dimmer = 1 - ph.carAlpha * 0.42;
      for (var m = 0; m < COUNT; m++) {
        var r2 = parts[m];
        var tws = 0.62 + 0.38 * Math.sin(t * r2.tw + r2.ph);
        ctx.globalAlpha = r2.baseA * tws * dimmer;
        var sz = r2.size * (1 + 0.25 * tws);
        ctx.drawImage(sprite, r2.x - sz, r2.y - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function staticFrame() {
      if (!ready) { setTimeout(staticFrame, 300); return; }
      resize();
      for (var i = 0; i < COUNT; i++) pickTarget(carIdx, parts[i]);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * scl, 0, 0, dpr * scl, dpr * ox, dpr * oy);
      drawCar(ctx, CARS[carIdx], 0.5, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (var m = 0; m < COUNT; m++) {
        var q = parts[m];
        var jx = (Math.random() - 0.5) * 5, jy = (Math.random() - 0.5) * 4;
        ctx.globalAlpha = q.baseA * (0.4 + Math.random() * 0.45);
        ctx.drawImage(sprite, q.tx + jx - q.size, q.ty + jy - q.size, q.size * 2, q.size * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      label.style.opacity = '1';
    }

    this.__startStop = function () {
      if (host.__raf) { cancelAnimationFrame(host.__raf); host.__raf = 0; }
      if (reduced.matches) staticFrame();
      else host.__raf = requestAnimationFrame(frame);
    };
    if (reduced.addEventListener) reduced.addEventListener('change', this.__startStop);
    this.__startStop();
  };

  HeroParticles.prototype.disconnectedCallback = function () {
    if (this.__raf) { cancelAnimationFrame(this.__raf); this.__raf = 0; }
    if (this.__detachParallax) this.__detachParallax();
  };

  customElements.define('hero-particles', HeroParticles);
})();
