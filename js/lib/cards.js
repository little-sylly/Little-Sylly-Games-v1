// ═══════════════════════════════════════════════════════════════════════════
// cards.js — Suite-wide playing card rendering module
// Global: window.Cards
// API:    Cards.buildEl(cardData)     → DOM element (card face, SVG-drawn)
//         Cards.buildBackEl(deckIdx)  → DOM element (face-down card)
//
// Data contract (never changes between v1 SVG and future image asset v2):
//   face card:  { rank: 'Q', suit: '♥', deckIdx: 0 }
//   Joker:      { rank: 'Joker', suit: '', deckIdx: 0 }  — suit is '' not null
//
// Future asset swap: only the internals of Cards.buildEl() change.
// pass.js and every future card game call Cards.buildEl(card) — untouched.
// ═══════════════════════════════════════════════════════════════════════════

(function () {

  const RED_SUITS = new Set(['♥', '♦']);

  // ── SVG card face renderer ────────────────────────────────────────────────

  function renderSvgCard(cardData) {
    const { rank, suit } = cardData;
    const isJoker = rank === 'Joker';
    const isRed   = RED_SUITS.has(suit);

    const wrap = document.createElement('div');
    wrap.className = 'pass-card' + (isRed ? ' pass-card-red' : ' pass-card-black') + (isJoker ? ' pass-card-joker' : '');

    if (isJoker) {
      wrap.innerHTML = `
        <span class="pass-card-rank pass-card-rank-tl">🃏</span>
        <span class="pass-card-center-joker">JOKER</span>
        <span class="pass-card-rank pass-card-rank-br">🃏</span>
      `;
    } else {
      const suitColor = isRed ? '#dc2626' : '#18181b';
      wrap.innerHTML = `
        <span class="pass-card-rank pass-card-rank-tl">${rank}<br><span style="color:${suitColor}">${suit}</span></span>
        <span class="pass-card-center-suit" style="color:${suitColor}">${suit}</span>
        <span class="pass-card-rank pass-card-rank-br" style="transform:rotate(180deg)">${rank}<br><span style="color:${suitColor}">${suit}</span></span>
      `;
    }
    return wrap;
  }

  // ── Card back renderer ────────────────────────────────────────────────────

  function renderCardBack(deckIdx) {
    const wrap = document.createElement('div');
    // deckIdx 0 = charcoal grey (Deck 1), deckIdx 1 = crimson red (Deck 2)
    wrap.className = 'pass-card pass-card-back ' + (deckIdx === 1 ? 'pass-card-back-deck2' : 'pass-card-back-deck1');
    return wrap;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  window.Cards = {
    // v1: SVG inline rendering — swap only this internals in v2
    buildEl:     function (cardData)  { return renderSvgCard(cardData); },
    buildBackEl: function (deckIdx)   { return renderCardBack(deckIdx);  },
  };

})();
