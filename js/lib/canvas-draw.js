// ═══════════════════════════════════════════════════
// canvas-draw.js — shared drawing infrastructure
// Exposed as window.CanvasDraw
// ═══════════════════════════════════════════════════

(function () {

  // ── internal state ──────────────────────────────
  let _canvas        = null;
  let _ctx           = null;
  let _strokes       = [];
  let _currentStroke = [];
  let _isDrawing     = false;
  let _lastX         = 0;
  let _lastY         = 0;
  let _tremorInterval   = null;
  let _tremorWrapperEl  = null;   // reference held so setTremorScale can apply transforms
  let _tremorProgress   = 0;      // 0–1, set by setTremorScale(); drives amplitude + frequency
  let _lastTremorFire   = 0;      // timestamp of last actual jiggle
  let _lastData      = null;
  let _listeners     = []; // [{ el, type, fn }]
  let _onStrokeEnd   = null;

  // ── helpers ─────────────────────────────────────
  function getPointerPos(canvas, e) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top)  * scaleY)
    };
  }

  function addListener(el, type, fn) {
    _listeners.push({ el, type, fn });
    el.addEventListener(type, fn);
  }

  // ── public API ──────────────────────────────────
  window.CanvasDraw = {

    init(canvasEl, options = {}) {
      _canvas       = canvasEl;
      _ctx          = canvasEl.getContext('2d');
      _onStrokeEnd  = options.onStrokeEnd || null;
      _strokes       = [];
      _currentStroke = [];
      _isDrawing    = false;
      _lastData     = null;
      _listeners    = [];

      _ctx.lineCap     = 'round';
      _ctx.lineJoin    = 'round';
      _ctx.lineWidth   = 3;
      _ctx.strokeStyle = '#1c1917';

      const onDown = (e) => {
        if (!_canvas) return;
        _canvas.setPointerCapture(e.pointerId);
        const { x, y } = getPointerPos(_canvas, e);
        _isDrawing     = true;
        _lastX         = x;
        _lastY         = y;
        _currentStroke = [x, y];
        _ctx.beginPath();
        _ctx.moveTo(x, y);
      };

      const onMove = (e) => {
        if (!_isDrawing || !_canvas) return;
        const { x, y } = getPointerPos(_canvas, e);
        _ctx.lineTo(x, y);
        _ctx.stroke();
        _ctx.beginPath();
        _ctx.moveTo(x, y);

        const dx = Math.round(x) - _lastX;
        const dy = Math.round(y) - _lastY;

        if (Math.abs(dx) > 127 || Math.abs(dy) > 127) {
          // delta too large for single bytes — seal the current stroke and start fresh
          if (_currentStroke.length > 2) {
            _strokes.push(_currentStroke);
          }
          _currentStroke = [Math.round(x), Math.round(y)];
        } else {
          _currentStroke.push(dx, dy);
        }

        _lastX = Math.round(x);
        _lastY = Math.round(y);
      };

      const onEnd = (e) => {
        if (!_isDrawing) return;
        _isDrawing = false;
        if (_currentStroke.length > 2) {
          _strokes.push(_currentStroke);
        }
        _currentStroke = [];
        if (_onStrokeEnd) _onStrokeEnd();
      };

      addListener(canvasEl, 'pointerdown',   onDown);
      addListener(canvasEl, 'pointermove',   onMove);
      addListener(canvasEl, 'pointerup',     onEnd);
      addListener(canvasEl, 'pointercancel', onEnd);
      addListener(canvasEl, 'pointerleave',  onEnd);

      return this;
    },

    clear() {
      if (!_canvas) return;
      _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
      _strokes       = [];
      _currentStroke = [];
      _isDrawing     = false;
    },

    lock() {
      // idempotent — if already locked return cached data
      if (_canvas === null) return _lastData;

      for (const { el, type, fn } of _listeners) {
        el.removeEventListener(type, fn);
      }
      _listeners = [];

      if (_currentStroke.length > 2) {
        _strokes.push(_currentStroke);
        _currentStroke = [];
      }

      const data = {
        w: _canvas.width,
        h: _canvas.height,
        s: _strokes
      };

      _lastData = data;
      _canvas   = null;
      _ctx      = null;

      return data;
    },

    render(canvasEl, data, options = {}) {
      const ctx         = canvasEl.getContext('2d');
      const lineWidth   = options.lineWidth   !== undefined ? options.lineWidth   : 3;
      const strokeStyle = options.strokeStyle !== undefined ? options.strokeStyle : '#1c1917';

      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.lineWidth   = lineWidth;
      ctx.strokeStyle = strokeStyle;

      for (const stroke of data.s) {
        if (stroke.length < 2) continue;

        let x = stroke[0];
        let y = stroke[1];

        ctx.beginPath();
        ctx.moveTo(x, y);

        for (let i = 2; i < stroke.length - 1; i += 2) {
          x += stroke[i];
          y += stroke[i + 1];
          ctx.lineTo(x, y);
        }

        ctx.stroke();
      }
    },

    undo() {
      if (!_canvas || _strokes.length === 0) return;
      _strokes.pop();
      // redraw remaining strokes
      _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
      _ctx.lineCap     = 'round';
      _ctx.lineJoin    = 'round';
      _ctx.lineWidth   = 3;
      _ctx.strokeStyle = '#1c1917';
      for (const stroke of _strokes) {
        if (stroke.length < 2) continue;
        let x = stroke[0];
        let y = stroke[1];
        _ctx.beginPath();
        _ctx.moveTo(x, y);
        for (let i = 2; i < stroke.length - 1; i += 2) {
          x += stroke[i];
          y += stroke[i + 1];
          _ctx.lineTo(x, y);
        }
        _ctx.stroke();
      }
      if (_onStrokeEnd) _onStrokeEnd();
    },

    setTremor(wrapperEl, enabled) {
      if (enabled) {
        // clear any existing interval before starting a new one — no stacking
        if (_tremorInterval !== null) {
          clearInterval(_tremorInterval);
          _tremorInterval = null;
        }

        _tremorWrapperEl = wrapperEl;
        _tremorProgress  = 0;
        _lastTremorFire  = 0;

        // fast poll at 100ms; actual jiggle fires based on _tremorProgress-derived interval
        _tremorInterval = setInterval(() => {
          const now = Date.now();
          // amplitude: 5px at start → 20px at end; interval: 1500ms at start → 150ms at end
          const amplitude      = 5 + _tremorProgress * 15;
          const effectiveMs    = 1500 - _tremorProgress * 1350;
          if (now - _lastTremorFire >= effectiveMs) {
            const x = (Math.random() * 2 - 1) * amplitude;
            const y = (Math.random() * 2 - 1) * amplitude;
            wrapperEl.style.transform = `translate(${x}px, ${y}px)`;
            _lastTremorFire = now;
          }
        }, 100);

      } else {
        clearInterval(_tremorInterval);
        _tremorInterval  = null;
        _tremorWrapperEl = null;
        _tremorProgress  = 0;
        if (wrapperEl) wrapperEl.style.transform = '';
      }
    },

    // progress: 0–1. Called on each countdown tick to scale tremor intensity.
    setTremorScale(progress) {
      _tremorProgress = Math.max(0, Math.min(1, progress));
    },

    setBlur(canvasEl, durationMs) {
      canvasEl.style.filter     = 'blur(5px)';
      canvasEl.style.transition = `filter ${durationMs}ms linear`;
      // next frame triggers the CSS transition from 5px → 0px
      requestAnimationFrame(() => {
        canvasEl.style.filter = 'blur(0px)';
      });
    }
  };

})();
