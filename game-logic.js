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

if (typeof module !== 'undefined') {
  module.exports = { checkTTTWinner, checkC4WinFrom, c4Drop, isC4BoardFull, makeC4Board, TTT_LINES, C4_DIRS };
}
