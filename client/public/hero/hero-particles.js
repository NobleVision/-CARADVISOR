/* Car Advisor — hero particle morph engine (photo edition).
   One particle pool reshapes itself behind real car photographs:
   swirl -> condense (photo fades in) -> clean three-second photo hold -> dissolve -> next car.
   Registers <hero-particles> as a custom element. Cutouts + metadata live in cars/. */
(function () {
  'use strict';
  if (customElements.get('hero-particles')) return;

  var VW = 1000, VH = 460, GROUND = 404;
  var T_SWIRL = 1.6, T_COND = 2.0, T_IN = 0.8, T_HOLD = 3.0, T_OUT = 0.8, T_DISS = 2.1;
  var T_FLASH_HOLD = 0.5, T_FLASH_FADE = 0.1;
  var FLASH_CORE_ALPHA = 0.66, FLASH_GOLD_ALPHA = 0.28, FLASH_RADIUS = 26;
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

  function cleanHoldAlpha(tc) {
    var fade = 0.34;
    return smooth((tc - B_HOLD) / fade) * (1 - smooth((tc - (B_OUT - fade)) / fade));
  }

  function lampFlashBeat(tc, car) {
    var allowIntro = !car || !car.lampFlash || car.lampFlash.intro !== false;
    if (allowIntro) {
      var flashStart = B_HOLD - T_FLASH_HOLD - 2 * T_FLASH_FADE;
      var assembleBeat = smooth((tc - flashStart) / T_FLASH_FADE) *
        (1 - smooth((tc - (B_HOLD - T_FLASH_FADE)) / T_FLASH_FADE));
      if (assembleBeat > 0.01) return assembleBeat;
    }
    if (tc >= B_OUT && tc < B_DISS) return 0.45 * (1 - smooth((tc - B_OUT) / T_OUT));
    return 0;
  }

  function phaseAt(tc, car) {
    var carAlpha = smooth((tc - B_COND) / (T_COND - 0.2)) * (1 - smooth((tc - B_DISS) / 1.3));
    var cleanPhotoA = cleanHoldAlpha(tc);
    var beat = lampFlashBeat(tc, car);
    var noiseAmp;
    if (tc < B_COND) noiseAmp = lerp(30, 13, smooth(tc / T_SWIRL));
    else if (tc < B_DISS) noiseAmp = lerp(13, 2.2, smooth((tc - B_COND) / 1.4));
    else noiseAmp = lerp(2.2, 34, smooth((tc - B_DISS) / 1.1));
    var particleA = (1 - carAlpha * 0.42) * (1 - cleanPhotoA * 0.78);
    var labelA = smooth((tc - (B_COND + 0.7)) / 0.7) * (1 - smooth((tc - B_DISS) / 0.6));
    return { carAlpha: carAlpha, beat: beat, noiseAmp: noiseAmp, cleanPhotoA: cleanPhotoA, particleA: particleA, labelA: labelA };
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
        car.img = null; car.pools = null; car.poly = null; car.lights = []; car.lampFlash = {};
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
        car.lampFlash = m.lampFlash || {};
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

    function drawCar(g, car, alpha, beat, motion) {
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

      // Ground shadow stays under the transparent PNG; no body outline is drawn over the car.
      var grd = g.createRadialGradient(cx, GROUND + 6, 10, cx, GROUND + 6, R.w * 0.55);
      grd.addColorStop(0, 'rgba(0,0,0,0.65)');
      grd.addColorStop(0.55, 'rgba(' + GOLD + ',' + (0.025 + 0.055 * beat).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(cx, GROUND + 8); g.scale(1, 0.12); g.translate(-cx, -(GROUND + 8));
      g.fillStyle = grd; g.beginPath(); g.arc(cx, GROUND + 8, R.w * 0.55, 0, Math.PI * 2); g.fill(); g.restore();

      // The photo is the top layer, so particles remain behind the opaque car pixels.
      g.drawImage(car.img, R.x, R.y, R.w, R.h);

      // Bright 0.5s lamp accent during assembly/dissolve only; it is off during the clean hold.
      if (beat > 0.01 && car.lights.length) {
        g.globalCompositeOperation = 'lighter';
        car.lights.forEach(function (pt) {
          var isTail = car.lampFlash && car.lampFlash.color === 'red';
          var tailColor = '218,72,72';
          var coreColor = isTail ? '255,126,116' : '255,255,244';
          var warmColor = isTail ? '255,98,88' : '255,244,214';
          var glowColor = isTail ? tailColor : GOLD;
          var fr = FLASH_RADIUS * (0.72 + 0.28 * beat);
          var fg = g.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], fr);
          fg.addColorStop(0, 'rgba(' + coreColor + ',' + (FLASH_CORE_ALPHA * beat).toFixed(3) + ')');
          fg.addColorStop(0.18, 'rgba(' + warmColor + ',' + (0.50 * beat).toFixed(3) + ')');
          fg.addColorStop(0.46, 'rgba(' + glowColor + ',' + (FLASH_GOLD_ALPHA * beat).toFixed(3) + ')');
          fg.addColorStop(1, 'rgba(' + glowColor + ',0)');
          g.fillStyle = fg;
          g.beginPath(); g.arc(pt[0], pt[1], fr, 0, Math.PI * 2); g.fill();
        });
        g.globalCompositeOperation = 'source-over';
      }

      g.restore();
    }

    var start = performance.now() / 1000;
    var lastTc = 0, lastFrame = performance.now() / 1000, frameT = 0;

    function drawParticles(g, particleA) {
      if (particleA <= 0.004) return;
      g.globalCompositeOperation = 'lighter';
      for (var m = 0; m < COUNT; m++) {
        var r2 = parts[m];
        var tws = 0.62 + 0.38 * Math.sin(frameT * r2.tw + r2.ph);
        g.globalAlpha = r2.baseA * tws * particleA;
        var sz = r2.size * (1 + 0.25 * tws);
        g.drawImage(sprite, r2.x - sz, r2.y - sz, sz * 2, sz * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

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
      frameT = t;
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

      var car = CARS[carIdx];
      var ph = ready ? phaseAt(tc, car) : { carAlpha: 0, beat: 0, noiseAmp: 24, cleanPhotoA: 0, particleA: 1, labelA: 0 };

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

      drawParticles(ctx, ph.particleA);
      drawCar(ctx, car, ph.carAlpha, ph.beat, carMotion);
    }

    function staticFrame() {
      if (!ready) { setTimeout(staticFrame, 300); return; }
      resize();
      for (var i = 0; i < COUNT; i++) pickTarget(carIdx, parts[i]);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * scl, 0, 0, dpr * scl, dpr * ox, dpr * oy);
      frameT = 0;
      drawParticles(ctx, 0.18);
      drawCar(ctx, CARS[carIdx], 1, 0);
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
