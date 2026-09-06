(() => {
  const q = window.__finalQA = { draws: {}, mutations: [], started: performance.now() };
  const original = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect = function (...args) {
    if (this.canvas.closest('#monitors')) {
      const key = this.canvas.id || JSON.stringify({ ...this.canvas.dataset });
      const times = q.draws[key] ||= [];
      times.push(performance.now());
      if (times.length > 10000) times.splice(0, 5000);
    }
    return original.apply(this, args);
  };
  q.fps = durationMs => new Promise(resolve => {
    const timestamps = [];
    function frame(t) {
      timestamps.push(t);
      if (timestamps.length < 2 || t - timestamps[0] < durationMs) requestAnimationFrame(frame);
      else {
        const gaps = timestamps.slice(1).map((t, i) => t - timestamps[i]);
        const sorted = [...gaps].sort((a, b) => a - b);
        resolve({ timestamps, frames: gaps.length, durationMs: t - timestamps[0],
          fps: gaps.length * 1000 / (t - timestamps[0]),
          p95FrameMs: sorted[Math.floor(sorted.length * .95)], maxFrameMs: sorted.at(-1) });
      }
    }
    requestAnimationFrame(frame);
  });
  q.cadence = () => Object.fromEntries(Object.entries(q.draws).map(([key, times]) => {
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    const sorted = [...gaps].sort((a, b) => a - b);
    return [key, { samples: times.length, maxMs: sorted.at(-1) ?? null,
      p95Ms: sorted[Math.floor(sorted.length * .95)] ?? null, intervalsMs: gaps }];
  }));
  q.coldStart = null;
  q.fps(5000).then(result => { q.coldStart = result; });
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(records => {
      if (records.some(r => (r.target.nodeType === 1 ? r.target : r.target.parentElement)?.closest('[data-live],[data-metric],[data-model-summary]'))) {
        q.mutations.push(performance.now());
        if (q.mutations.length > 10000) q.mutations.splice(0, 5000);
      }
    }).observe(document.documentElement, {subtree: true, childList: true, characterData: true});
  });
  q.snapshot = () => ({ elapsed: document.querySelector('#elapsed')?.textContent,
    values: [...document.querySelectorAll('[data-live],[data-metric],[data-model-summary]')].map(e => e.textContent),
    plots: [...document.querySelectorAll('#monitors canvas')].map(c => c.toDataURL()),
    anatomy: document.querySelector('#anatomy')?.toDataURL(),
    labels: document.querySelector('#organ-labels')?.textContent });
  q.device = () => {
    const c = document.querySelector('#anatomy'), gl = c.getContext('webgl2') || c.getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return { userAgent: navigator.userAgent, platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory ?? null,
      viewport: { width: innerWidth, height: innerHeight }, dpr: devicePixelRatio,
      webglVersion: gl?.getParameter(gl.VERSION),
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null,
      glError: gl?.getError() };
  };
})();
