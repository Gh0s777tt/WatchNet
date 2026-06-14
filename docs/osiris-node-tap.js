(() => {
  const canvas = document.getElementById('globeCanvas');
  if (!canvas) return;

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'crosshair';

  const getNearest = () => (typeof window.nearestNode === 'function' ? window.nearestNode : null);
  const select = () => (typeof window.selectNode === 'function' ? window.selectNode : null);

  const sampleOffsets = [
    [0, 0], [16, 0], [-16, 0], [0, 16], [0, -16],
    [26, 0], [-26, 0], [0, 26], [0, -26],
    [18, 18], [-18, 18], [18, -18], [-18, -18],
    [36, 0], [-36, 0], [0, 36], [0, -36]
  ];

  const originalNearest = getNearest();
  if (originalNearest) {
    window.nearestNode = function expandedNearestNode(x, y) {
      for (const [dx, dy] of sampleOffsets) {
        const node = originalNearest(x + dx, y + dy);
        if (node) return node;
      }
      return null;
    };
  }

  let down = null;
  let activePointers = 0;

  canvas.addEventListener('pointerdown', (event) => {
    activePointers += 1;
    down = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      t: Date.now(),
      multi: activePointers > 1
    };
  }, { passive: true });

  canvas.addEventListener('pointerup', (event) => {
    const start = down;
    activePointers = Math.max(0, activePointers - 1);
    if (!start || start.id !== event.pointerId || start.multi) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    const elapsed = Date.now() - start.t;
    if (moved > 34 || elapsed > 650) return;

    setTimeout(() => {
      const nearest = getNearest();
      const selectNode = select();
      if (!nearest || !selectNode) return;
      const node = nearest(event.clientX, event.clientY);
      if (node) selectNode(node);
    }, 0);
  }, { passive: true });

  canvas.addEventListener('pointercancel', () => {
    activePointers = Math.max(0, activePointers - 1);
    down = null;
  }, { passive: true });
})();
