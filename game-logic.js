// Pure game logic — no DOM, usable in Node (tests) and browser (index.html).

const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// state: string[9], each '' | 'X' | 'O'
// returns { winner: 'X'|'O'|'draw', line: number[] } or null
function checkTTTWinner(state) {
  for (const [a, b, c] of TTT_LINES) {
    if (state[a] && state[a] === state[b] && state[a] === state[c])
      return { winner: state[a], line: [a, b, c] };
  }
  if (state.every(v => v !== '')) return { winner: 'draw', line: [] };
  return null;
}

const C4_DIRS = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // diagonal down-right
  [1, -1], // diagonal down-left
];

// state: string[size][size], each '' | 'p1' | 'p2'
// returns winning cells [[r,c], ...] (length >= 4) or null
function checkC4WinFrom(state, size, r, c) {
  const p = state[r][c];
  if (!p) return null;
  for (const [dr, dc] of C4_DIRS) {
    const line = [[r, c]];
    for (const sign of [-1, 1]) {
      let rr = r + dr * sign, cc = c + dc * sign;
      while (rr >= 0 && rr < size && cc >= 0 && cc < size && state[rr][cc] === p) {
        line.push([rr, cc]);
        rr += dr * sign; cc += dc * sign;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

// Returns { row, state: newState } if drop succeeded, null if column full.
// Does not mutate the original state.
function c4Drop(state, size, col, player) {
  for (let r = size - 1; r >= 0; r--) {
    if (state[r][col] === '') {
      const next = state.map(row => [...row]);
      next[r][col] = player;
      return { row: r, state: next };
    }
  }
  return null;
}

function isC4BoardFull(state) {
  return state.every(row => row.every(v => v !== ''));
}

function makeC4Board(size) {
  return Array.from({ length: size }, () => Array(size).fill(''));
}

// ─── DOTS AND BOXES ──────────────────────────────────────────────────────────

// Square / Rhombus grid (identical logic, different SVG rendering)
// n = number of boxes per row/col
// h[r][c]: r=0..n, c=0..n-1  (horizontal lines)
// v[r][c]: r=0..n-1, c=0..n  (vertical lines)
// boxes[r][c]: null|'p1'|'p2', r/c=0..n-1
function makeDBState(n) {
  const h = Array.from({length: n+1}, () => Array(n).fill(false));
  const v = Array.from({length: n}, () => Array(n+1).fill(false));
  const boxes = Array.from({length: n}, () => Array(n).fill(null));
  for (let c = 0; c < n; c++) { h[0][c] = true; h[n][c] = true; }
  for (let r = 0; r < n; r++) { v[r][0] = true; v[r][n] = true; }
  return { h, v, boxes };
}

// isH: true=horizontal, false=vertical; r,c: line indices
// Returns null if line already drawn, else { newState, scored }
function dbDraw(state, n, isH, r, c, player) {
  const s = {
    h: state.h.map(row => [...row]),
    v: state.v.map(row => [...row]),
    boxes: state.boxes.map(row => [...row]),
  };
  if (isH) { if (s.h[r][c]) return null; s.h[r][c] = true; }
  else      { if (s.v[r][c]) return null; s.v[r][c] = true; }
  let scored = 0;
  for (const [br, bc] of (isH ? [[r-1,c],[r,c]] : [[r,c-1],[r,c]])) {
    if (br < 0 || br >= n || bc < 0 || bc >= n || s.boxes[br][bc]) continue;
    if (s.h[br][bc] && s.h[br+1][bc] && s.v[br][bc] && s.v[br][bc+1]) {
      s.boxes[br][bc] = player; scored++;
    }
  }
  return { newState: s, scored };
}

function dbIsComplete(state) {
  return state.boxes.every(row => row.every(b => b !== null));
}

function dbScore(boxes) {
  let p1 = 0, p2 = 0;
  for (const row of boxes) for (const b of row) { if (b === 'p1') p1++; if (b === 'p2') p2++; }
  return { p1, p2 };
}

// Triangle grid: n layers, n² triangles
// h[row]: row horizontal lines (h[row] has `row` elements, row=0..n)
// dl[l][j]: down-left line (l,j)→(l+1,j), l=0..n-1, j=0..l
// dr[l][j]: down-right line (l,j)→(l+1,j+1), l=0..n-1, j=0..l
// upT[l][j]: null|'p1'|'p2', upward triangle l=0..n-1, j=0..l
// dnT[l][j]: null|'p1'|'p2', downward triangle l=0..n-1, j=0..l-1
// Borders: dl[l][0], dr[l][l], h[n][j]
function makeDBTriState(n) {
  const h = [];
  for (let row = 0; row <= n; row++) h.push(Array(row).fill(false));
  const dl = [], dr = [];
  for (let l = 0; l < n; l++) { dl.push(Array(l+1).fill(false)); dr.push(Array(l+1).fill(false)); }
  const upT = [], dnT = [];
  for (let l = 0; l < n; l++) { upT.push(Array(l+1).fill(null)); dnT.push(Array(l).fill(null)); }
  for (let l = 0; l < n; l++) { dl[l][0] = true; dr[l][l] = true; }
  for (let j = 0; j < n; j++) h[n][j] = true;
  return { h, dl, dr, upT, dnT, n };
}

// type: 'h' (a=row, b=col-idx), 'dl' (a=layer, b=j), 'dr' (a=layer, b=j)
// Returns null if already drawn, else { newState, scored }
function dbTriDraw(state, type, a, b, player) {
  const s = {
    h: state.h.map(r => [...r]), dl: state.dl.map(r => [...r]),
    dr: state.dr.map(r => [...r]), upT: state.upT.map(r => [...r]),
    dnT: state.dnT.map(r => [...r]), n: state.n,
  };
  let scored = 0;
  if (type === 'h') {
    if (s.h[a][b]) return null; s.h[a][b] = true;
    if (a > 0)    scored += _dbClaimUp(s, a-1, b, player);
    if (a < s.n)  scored += _dbClaimDn(s, a,   b, player);
  } else if (type === 'dl') {
    if (s.dl[a][b]) return null; s.dl[a][b] = true;
    scored += _dbClaimUp(s, a, b, player);
    if (b > 0) scored += _dbClaimDn(s, a, b-1, player);
  } else {
    if (s.dr[a][b]) return null; s.dr[a][b] = true;
    scored += _dbClaimUp(s, a, b, player);
    if (b < a) scored += _dbClaimDn(s, a, b, player);
  }
  return { newState: s, scored };
}

// Upward triangle (l,j): sides dl[l][j], dr[l][j], h[l+1][j]
function _dbClaimUp(s, l, j, player) {
  if (l < 0 || l >= s.n || j < 0 || j > l || s.upT[l][j]) return 0;
  if (s.dl[l][j] && s.dr[l][j] && s.h[l+1][j]) { s.upT[l][j] = player; return 1; }
  return 0;
}

// Downward triangle (l,j): sides h[l][j], dr[l][j], dl[l][j+1]
function _dbClaimDn(s, l, j, player) {
  if (l < 1 || l >= s.n || j < 0 || j >= l || s.dnT[l][j]) return 0;
  if (s.h[l][j] && s.dr[l][j] && s.dl[l][j+1]) { s.dnT[l][j] = player; return 1; }
  return 0;
}

function dbTriIsComplete(state) {
  return state.upT.every(r => r.every(t => t !== null)) &&
         state.dnT.every(r => r.every(t => t !== null));
}

function dbTriScore(state) {
  let p1 = 0, p2 = 0;
  for (const r of state.upT) for (const t of r) { if (t === 'p1') p1++; if (t === 'p2') p2++; }
  for (const r of state.dnT) for (const t of r) { if (t === 'p1') p1++; if (t === 'p2') p2++; }
  return { p1, p2 };
}

if (typeof module !== 'undefined') {
  module.exports = {
    checkTTTWinner, checkC4WinFrom, c4Drop, isC4BoardFull, makeC4Board, TTT_LINES, C4_DIRS,
    makeDBState, dbDraw, dbIsComplete, dbScore,
    makeDBTriState, dbTriDraw, dbTriIsComplete, dbTriScore,
  };
}
