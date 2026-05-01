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

// ─── DOTS AND BOXES (unified sparse-grid) ────────────────────────────────────
// All three field types (square, triangle, rhombus) share the same logic.
// cells[r][c] = true means that grid cell exists in the field.
// h[r][c]: horizontal line above row r at column c  (r=0..rows, c=0..cols-1)
// v[r][c]: vertical line left of column c at row r  (r=0..rows-1, c=0..cols)
// boxes[r][c]: null|'p1'|'p2' — only meaningful where cells[r][c]=true

// Square field: n×n, all cells exist
function makeDBCells(n) {
  return Array.from({length: n}, () => Array(n).fill(true));
}

// Triangle field: right-triangle staircase; row r has cells at cols 0..n-1-r
// cells[r][c] = (r + c < n)
function makeDBTriCells(n) {
  return Array.from({length: n}, (_, r) =>
    Array.from({length: n}, (_, c) => r + c < n)
  );
}

// Rhombus (diamond) field: (2n-1) × (2n-1) grid
// cells[r][c] = |r-(n-1)| + |c-(n-1)| <= n-1
function makeDBRhombusCells(n) {
  const size = 2 * n - 1;
  return Array.from({length: size}, (_, r) =>
    Array.from({length: size}, (_, c) =>
      Math.abs(r - (n - 1)) + Math.abs(c - (n - 1)) <= n - 1
    )
  );
}

// Create h/v/boxes state for any cells mask, pre-drawing all border lines.
// A border line is an edge shared by exactly one cell (field edge).
function makeDBFieldState(cells) {
  const rows = cells.length, cols = cells[0].length;
  const h = Array.from({length: rows + 1}, () => Array(cols).fill(false));
  const v = Array.from({length: rows}, () => Array(cols + 1).fill(false));
  const boxes = Array.from({length: rows}, () => Array(cols).fill(null));
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c < cols; c++) {
      const above = r > 0 && cells[r - 1][c];
      const below = r < rows && cells[r][c];
      if (above !== below) h[r][c] = true;
    }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c <= cols; c++) {
      const left  = c > 0 && cells[r][c - 1];
      const right = c < cols && cells[r][c];
      if (left !== right) v[r][c] = true;
    }
  return {h, v, boxes};
}

// Draw a line. Returns null if already drawn, else {newState, scored}.
function dbDraw(state, cells, isH, r, c, player) {
  const rows = cells.length, cols = cells[0].length;
  const s = {
    h: state.h.map(row => [...row]),
    v: state.v.map(row => [...row]),
    boxes: state.boxes.map(row => [...row]),
  };
  if (isH) { if (s.h[r][c]) return null; s.h[r][c] = true; }
  else      { if (s.v[r][c]) return null; s.v[r][c] = true; }
  let scored = 0;
  for (const [br, bc] of (isH ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]])) {
    if (br < 0 || br >= rows || bc < 0 || bc >= cols) continue;
    if (!cells[br][bc] || s.boxes[br][bc]) continue;
    if (s.h[br][bc] && s.h[br + 1][bc] && s.v[br][bc] && s.v[br][bc + 1]) {
      s.boxes[br][bc] = player; scored++;
    }
  }
  return {newState: s, scored};
}

// True when every cell in the field mask is claimed.
function dbIsComplete(state, cells) {
  for (let r = 0; r < cells.length; r++)
    for (let c = 0; c < cells[r].length; c++)
      if (cells[r][c] && state.boxes[r][c] === null) return false;
  return true;
}

// Count claimed boxes per player (ignores cells outside the mask).
function dbScore(state, cells) {
  let p1 = 0, p2 = 0;
  for (let r = 0; r < cells.length; r++)
    for (let c = 0; c < cells[r].length; c++) {
      if (!cells[r][c]) continue;
      if (state.boxes[r][c] === 'p1') p1++;
      else if (state.boxes[r][c] === 'p2') p2++;
    }
  return {p1, p2};
}

if (typeof module !== 'undefined') {
  module.exports = {
    checkTTTWinner, checkC4WinFrom, c4Drop, isC4BoardFull, makeC4Board, TTT_LINES, C4_DIRS,
    makeDBCells, makeDBTriCells, makeDBRhombusCells, makeDBFieldState, dbDraw, dbIsComplete, dbScore,
  };
}
