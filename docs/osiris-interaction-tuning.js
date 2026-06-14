(() => {
  const canvas = document.getElementById('globeCanvas');
  if (!canvas) return;

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'crosshair';

  const hasCore = () => (
    typeof model !== 'undefined' &&
    typeof ctx !== 'undefined' &&
    typeof project === 'function' &&
    typeof clamp === 'function' &&
    typeof tone === 'function' &&
    typeof layerTone !== 'undefined'
  );

  function tune() {
    if (!hasCore()) return setTimeout(tune, 50);

    const originalResize = resize;
    resize = function tunedResize() {
      originalResize();
      const mobile = innerWidth < 760;
      const max = Math.max(innerWidth, innerHeight) * (mobile ? 4.8 : 3.8);
      const min = mobile ? 220 : 260;
      model.size.r = clamp((mobile ? innerWidth * 0.72 : Math.min(innerWidth, innerHeight) * 0.44) * model.view.zoom, min, max);
    };

    const originalSetZoom = setZoom;
    setZoom = function tunedSetZoom(z) {
      model.view.zoom = clamp(z, 0.74, 8.5);
      resize();
      if (model.view.zoom > 1.48 && typeof ensureStates === 'function') ensureStates();
      if (model.view.zoom > 1.8 && typeof ensureFullLive === 'function') ensureFullLive();
    };

    drawNodes = function tunedDrawNodes() {
      const d = lod();
      const zoom = model.view.zoom;
      const max = zoom > 5.2 ? 2600 : zoom > 3.2 ? 2200 : zoom > 2.2 ? 1600 : zoom > 1.4 ? 900 : 520;
      const labelBudget = zoom > 5.2 ? 95 : zoom > 4.1 ? 60 : zoom > 3.1 ? 36 : zoom > 2.35 ? 18 : 0;
      let drawn = 0;
      let labels = 0;

      for (let i = 0; i < model.visibleNodes.length && drawn < max; i += 1) {
        const n = model.visibleNodes[i];
        const p = project(n.lat, n.lon, 1.015);
        if (!p.visible) continue;

        const c = tone(n.tone || layerTone[n.layer], 1);
        const s = (n.size || 3.6) * d.node;
        ctx.save();
        ctx.fillStyle = c;
        ctx.strokeStyle = 'rgba(4,7,10,.88)';
        ctx.lineWidth = 2;
        ctx.shadowColor = c;
        ctx.shadowBlur = s > 5 ? 16 : 7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (n === model.selected) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, s + 9, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(245,217,107,.9)';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }

        const shouldLabel = n.label && (
          n === model.selected ||
          (zoom > 2.8 && n.priority) ||
          (zoom > 3.35 && labels < labelBudget)
        );
        if (shouldLabel) {
          labels += 1;
          ctx.shadowBlur = 7;
          ctx.font = `${zoom > 4.8 ? 700 : 600} ${zoom > 4.8 ? 14 : 13}px ui-monospace,SFMono-Regular,Menlo,monospace`;
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(0,0,0,.82)';
          ctx.strokeText(n.label, p.x + 9, p.y + 13);
          ctx.fillStyle = c;
          ctx.fillText(n.label, p.x + 9, p.y + 13);
        }
        ctx.restore();
        drawn += 1;
      }
    };

    nearestNode = function tunedNearestNode(x, y) {
      const zoom = model.view.zoom;
      const radius = zoom > 4 ? 42 : zoom > 2.2 ? 34 : 28;
      let best = null;
      let bestDist = radius;
      const limit = Math.min(model.visibleNodes.length, zoom > 3 ? 2600 : 1800);
      for (let i = 0; i < limit; i += 1) {
        const n = model.visibleNodes[i];
        const p = project(n.lat, n.lon, 1.015);
        if (!p.visible) continue;
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < bestDist) {
          best = n;
          bestDist = dist;
        }
      }
      return best;
    };

    resize();
    const eventMeta = document.getElementById('eventMeta');
    if (eventMeta) eventMeta.textContent = 'DRAG TO ORBIT · PINCH/WHEEL TO ZOOM DEEP · TAP A NODE';
  }

  tune();

  const sampleOffsets = [
    [0, 0], [16, 0], [-16, 0], [0, 16], [0, -16],
    [26, 0], [-26, 0], [0, 26], [0, -26],
    [18, 18], [-18, 18], [18, -18], [-18, -18]
  ];

  let down = null;
  let activePointers = 0;
  canvas.addEventListener('pointerdown', (event) => {
    activePointers += 1;
    down = { id: event.pointerId, x: event.clientX, y: event.clientY, t: Date.now(), multi: activePointers > 1 };
  }, { passive: true });

  canvas.addEventListener('pointerup', (event) => {
    const start = down;
    activePointers = Math.max(0, activePointers - 1);
    if (!start || start.id !== event.pointerId || start.multi) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 34 || Date.now() - start.t > 650) return;

    setTimeout(() => {
      if (typeof nearestNode !== 'function' || typeof selectNode !== 'function') return;
      for (const [dx, dy] of sampleOffsets) {
        const node = nearestNode(event.clientX + dx, event.clientY + dy);
        if (node) {
          selectNode(node);
          break;
        }
      }
    }, 0);
  }, { passive: true });

  canvas.addEventListener('pointercancel', () => {
    activePointers = Math.max(0, activePointers - 1);
    down = null;
  }, { passive: true });
})();
