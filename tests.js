// Run with: node tests.js
'use strict';
const assert = require('assert');
const {
  checkTTTWinner, checkC4WinFrom, c4Drop, isC4BoardFull, makeC4Board,
  makeDBState, dbDraw, dbIsComplete, dbScore,
  makeDBTriState, dbTriDraw, dbTriIsComplete, dbTriScore,
} = require('./game-logic.js');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

function suite(name) {
  console.log(`\n${name}`);
}

// ─── UNIT TESTS ─────────────────────────────────────────────────────────────

suite('Unit — checkTTTWinner');

test('returns null on empty board', () => {
  assert.strictEqual(checkTTTWinner(Array(9).fill('')), null);
});

test('returns null on partial board with no winner', () => {
  const s = ['X','O','X', 'O','X','', '', '',''];
  assert.strictEqual(checkTTTWinner(s), null);
});

test('detects top-row win for X', () => {
  const s = ['X','X','X', 'O','O','', '', '',''];
  const r = checkTTTWinner(s);
  assert.strictEqual(r.winner, 'X');
  assert.deepStrictEqual(r.line, [0, 1, 2]);
});

test('detects middle-row win for O', () => {
  const s = ['X','','X', 'O','O','O', '','X',''];
  const r = checkTTTWinner(s);
  assert.strictEqual(r.winner, 'O');
  assert.deepStrictEqual(r.line, [3, 4, 5]);
});

test('detects column win', () => {
  const s = ['X','O','', 'X','O','', 'X','',''];
  const r = checkTTTWinner(s);
  assert.strictEqual(r.winner, 'X');
  assert.deepStrictEqual(r.line, [0, 3, 6]);
});

test('detects main diagonal win', () => {
  const s = ['X','O','O', '','X','O', '','','X'];
  const r = checkTTTWinner(s);
  assert.strictEqual(r.winner, 'X');
  assert.deepStrictEqual(r.line, [0, 4, 8]);
});

test('detects anti-diagonal win', () => {
  const s = ['O','O','X', 'O','X','', 'X','',''];
  const r = checkTTTWinner(s);
  assert.strictEqual(r.winner, 'X');
  assert.deepStrictEqual(r.line, [2, 4, 6]);
});

test('detects draw on full board', () => {
  const s = ['X','O','X', 'X','O','O', 'O','X','X'];
  const r = checkTTTWinner(s);
  assert.strictEqual(r.winner, 'draw');
});

suite('Unit — c4Drop');

test('drops to bottom of empty column', () => {
  const board = makeC4Board(5);
  const r = c4Drop(board, 5, 2, 'p1');
  assert.strictEqual(r.row, 4);
  assert.strictEqual(r.state[4][2], 'p1');
});

test('stacks on top of existing piece', () => {
  let board = makeC4Board(5);
  let r = c4Drop(board, 5, 2, 'p1');
  r = c4Drop(r.state, 5, 2, 'p2');
  assert.strictEqual(r.row, 3);
  assert.strictEqual(r.state[3][2], 'p2');
  assert.strictEqual(r.state[4][2], 'p1');
});

test('does not mutate original state', () => {
  const board = makeC4Board(4);
  c4Drop(board, 4, 0, 'p1');
  assert.strictEqual(board[3][0], '');
});

test('returns null when column is full', () => {
  let board = makeC4Board(3);
  board = c4Drop(board, 3, 1, 'p1').state;
  board = c4Drop(board, 3, 1, 'p2').state;
  board = c4Drop(board, 3, 1, 'p1').state;
  assert.strictEqual(c4Drop(board, 3, 1, 'p2'), null);
});

suite('Unit — checkC4WinFrom');

test('returns null when no sequence', () => {
  const board = makeC4Board(5);
  board[4][0] = 'p1';
  assert.strictEqual(checkC4WinFrom(board, 5, 4, 0), null);
});

test('detects horizontal 4', () => {
  const board = makeC4Board(5);
  [0,1,2,3].forEach(c => { board[4][c] = 'p1'; });
  const line = checkC4WinFrom(board, 5, 4, 1);
  assert.ok(line.length >= 4);
});

test('detects vertical 4', () => {
  const board = makeC4Board(6);
  [2,3,4,5].forEach(r => { board[r][0] = 'p2'; });
  const line = checkC4WinFrom(board, 6, 5, 0);
  assert.ok(line.length >= 4);
});

test('detects diagonal 4 (down-right)', () => {
  const board = makeC4Board(6);
  [[2,0],[3,1],[4,2],[5,3]].forEach(([r,c]) => { board[r][c] = 'p1'; });
  const line = checkC4WinFrom(board, 6, 4, 2);
  assert.ok(line.length >= 4);
});

test('detects diagonal 4 (down-left)', () => {
  const board = makeC4Board(6);
  [[2,3],[3,2],[4,1],[5,0]].forEach(([r,c]) => { board[r][c] = 'p2'; });
  const line = checkC4WinFrom(board, 6, 3, 2);
  assert.ok(line.length >= 4);
});

test('only 3 in a row returns null', () => {
  const board = makeC4Board(5);
  [0,1,2].forEach(c => { board[4][c] = 'p1'; });
  assert.strictEqual(checkC4WinFrom(board, 5, 4, 1), null);
});

suite('Unit — isC4BoardFull');

test('returns false on empty board', () => {
  assert.strictEqual(isC4BoardFull(makeC4Board(4)), false);
});

test('returns false on partial board', () => {
  const board = makeC4Board(4);
  board[3][0] = 'p1';
  assert.strictEqual(isC4BoardFull(board), false);
});

test('returns true on fully filled board', () => {
  const board = makeC4Board(3);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) board[r][c] = 'p1';
  assert.strictEqual(isC4BoardFull(board), true);
});

// ─── INTEGRATION TESTS ───────────────────────────────────────────────────────

suite('Integration — full TTT game: X wins bottom row');

test('X wins via moves 6,7,8', () => {
  let s = Array(9).fill('');
  const moves = [
    [0, 'X'], [3, 'O'],
    [1, 'X'], [4, 'O'],
    [2, 'X'],
  ];
  let result = null;
  for (const [i, p] of moves) {
    s[i] = p;
    result = checkTTTWinner(s);
    if (result) break;
  }
  assert.strictEqual(result?.winner, 'X');
  assert.deepStrictEqual(result?.line, [0, 1, 2]);
});

suite('Integration — full TTT game: draw');

test('no winner after 9 moves on draw board', () => {
  // Results in X O X / O O X / X X O — no three in a row
  const moves   = [0, 1, 2, 3, 5, 4, 6, 8, 7];
  const players = ['X','O','X','O','X','O','X','O','X'];
  let s = Array(9).fill('');
  let result = null;
  for (let i = 0; i < moves.length; i++) {
    s[moves[i]] = players[i];
    result = checkTTTWinner(s);
  }
  assert.strictEqual(result?.winner, 'draw');
});

suite('Integration — full C4 game: p1 wins horizontally');

test('p1 drops 4 in a row in bottom row', () => {
  let board = makeC4Board(6);
  let row, winLine;
  for (let col = 0; col < 4; col++) {
    const r = c4Drop(board, 6, col, 'p1');
    board = r.state;
    row = r.row;
    winLine = checkC4WinFrom(board, 6, row, col);
  }
  assert.ok(winLine !== null);
  assert.strictEqual(winLine.length, 4);
});

suite('Integration — full C4 game: p2 wins vertically');

test('p2 stacks 4 in column 0', () => {
  let board = makeC4Board(6);
  let row, winLine;
  for (let i = 0; i < 4; i++) {
    const r = c4Drop(board, 6, 0, 'p2');
    board = r.state;
    row = r.row;
    winLine = checkC4WinFrom(board, 6, row, 0);
  }
  assert.ok(winLine !== null);
  assert.strictEqual(winLine.length, 4);
});

// ─── 1-TO-1 TESTS (exact state snapshots) ────────────────────────────────────

suite('1-to-1 — TTT exact board state after 3 moves');

test('board matches expected snapshot after X→O→X', () => {
  let s = Array(9).fill('');
  s[4] = 'X'; s[0] = 'O'; s[8] = 'X';
  assert.deepStrictEqual(s, ['O','','', '','X','', '','','X']);
});

suite('1-to-1 — C4 exact state after 3 drops in same column');

test('column 0 has p1,p2,p1 stacked from bottom', () => {
  let board = makeC4Board(5);
  board = c4Drop(board, 5, 0, 'p1').state;
  board = c4Drop(board, 5, 0, 'p2').state;
  board = c4Drop(board, 5, 0, 'p1').state;
  assert.strictEqual(board[4][0], 'p1');
  assert.strictEqual(board[3][0], 'p2');
  assert.strictEqual(board[2][0], 'p1');
  assert.strictEqual(board[1][0], '');
  assert.strictEqual(board[0][0], '');
});

suite('1-to-1 — C4 win line contains exact cells');

test('horizontal win line is exactly columns 0–3 in bottom row', () => {
  const board = makeC4Board(5);
  [0,1,2,3].forEach(c => { board[4][c] = 'p1'; });
  const line = checkC4WinFrom(board, 5, 4, 0);
  const sorted = [...line].sort((a,b) => a[1]-b[1]);
  assert.deepStrictEqual(sorted, [[4,0],[4,1],[4,2],[4,3]]);
});

// ─── UNIT TESTS — Dots & Boxes (square) ──────────────────────────────────────

suite('Unit — makeDBState');

test('borders are pre-drawn', () => {
  const s = makeDBState(3);
  // top and bottom rows all drawn
  for (let c = 0; c < 3; c++) { assert.ok(s.h[0][c]); assert.ok(s.h[3][c]); }
  // left and right columns all drawn
  for (let r = 0; r < 3; r++) { assert.ok(s.v[r][0]); assert.ok(s.v[r][3]); }
  // inner lines not drawn
  assert.strictEqual(s.h[1][0], false);
  assert.strictEqual(s.v[0][1], false);
});

test('all boxes start null', () => {
  const s = makeDBState(3);
  assert.ok(s.boxes.every(row => row.every(b => b === null)));
});

suite('Unit — dbDraw (square)');

test('returns null if line already drawn (border)', () => {
  const s = makeDBState(3);
  assert.strictEqual(dbDraw(s, 3, true, 0, 0, 'p1'), null);
});

test('drawing an inner horizontal line does not mutate original state', () => {
  const s = makeDBState(3);
  dbDraw(s, 3, true, 1, 0, 'p1');
  assert.strictEqual(s.h[1][0], false);
});

test('drawing third side does not claim box; fourth side does', () => {
  let s = makeDBState(2);
  // box (0,0) needs h[0][0](border), h[1][0], v[0][0](border), v[0][1]
  let r = dbDraw(s, 2, true, 1, 0, 'p1');   // h[1][0]
  assert.strictEqual(r.scored, 0); assert.strictEqual(r.newState.boxes[0][0], null);
  r = dbDraw(r.newState, 2, false, 0, 1, 'p1'); // v[0][1] — completes box (0,0)
  assert.strictEqual(r.scored, 1); assert.strictEqual(r.newState.boxes[0][0], 'p1');
});

test('drawing a line that completes two boxes scores 2', () => {
  let s = makeDBState(2);
  // Prepare: v[0][1] and v[1][1] already drawn so both boxes need only h[1][0]
  // box(0,0): h[0][0](B), h[1][0], v[0][0](B), v[0][1] → needs v[0][1] + h[1][0]
  // box(1,0): h[1][0], h[2][0](B), v[1][0](B), v[1][1] → needs v[1][1] + h[1][0]
  s = dbDraw(s, 2, false, 0, 1, 'p1').newState; // v[0][1]
  s = dbDraw(s, 2, false, 1, 1, 'p1').newState; // v[1][1]
  const r = dbDraw(s, 2, true, 1, 0, 'p1');     // h[1][0] → completes both
  assert.strictEqual(r.scored, 2);
  assert.strictEqual(r.newState.boxes[0][0], 'p1');
  assert.strictEqual(r.newState.boxes[1][0], 'p1');
});

suite('Unit — dbIsComplete / dbScore');

test('dbIsComplete returns false on fresh board', () => {
  assert.strictEqual(dbIsComplete(makeDBState(3)), false);
});

test('dbIsComplete returns true when all boxes claimed', () => {
  const s = makeDBState(2);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) s.boxes[r][c] = 'p1';
  assert.strictEqual(dbIsComplete(s), true);
});

test('dbScore counts correctly', () => {
  const boxes = [['p1','p2'],['p2','p1']];
  const sc = dbScore(boxes);
  assert.strictEqual(sc.p1, 2); assert.strictEqual(sc.p2, 2);
});

// ─── UNIT TESTS — Dots & Boxes (triangle) ────────────────────────────────────

suite('Unit — makeDBTriState');

test('borders pre-drawn: left edge dl[l][0], right edge dr[l][l], bottom h[n][j]', () => {
  const s = makeDBTriState(3);
  for (let l = 0; l < 3; l++) { assert.ok(s.dl[l][0]); assert.ok(s.dr[l][l]); }
  for (let j = 0; j < 3; j++) assert.ok(s.h[3][j]);
  assert.strictEqual(s.dl[1][1], false); // inner line not drawn
});

test('all triangles start null', () => {
  const s = makeDBTriState(3);
  assert.ok(s.upT.every(r => r.every(t => t === null)));
  assert.ok(s.dnT.every(r => r.every(t => t === null)));
});

suite('Unit — dbTriDraw');

test('returns null if line already drawn (border)', () => {
  const s = makeDBTriState(3);
  assert.strictEqual(dbTriDraw(s, 'dl', 0, 0, 'p1'), null);
  assert.strictEqual(dbTriDraw(s, 'dr', 1, 1, 'p1'), null);
  assert.strictEqual(dbTriDraw(s, 'h',  3, 0, 'p1'), null);
});

test('upward triangle (0,0) claimed when all 3 sides drawn', () => {
  // Upward(0,0): dl[0][0](border), dr[0][0](border), h[1][0]
  // dl and dr are already borders, so drawing h[1][0] completes it
  let s = makeDBTriState(3);
  const r = dbTriDraw(s, 'h', 1, 0, 'p1');
  assert.strictEqual(r.scored, 1);
  assert.strictEqual(r.newState.upT[0][0], 'p1');
});

test('downward triangle (1,0) claimed when all 3 sides drawn', () => {
  // Downward(1,0): h[1][0], dr[1][0], dl[1][1]
  let s = makeDBTriState(3);
  s = dbTriDraw(s, 'h',  1, 0, 'p1').newState;  // also claims upT[0][0]
  s = dbTriDraw(s, 'dr', 1, 0, 'p2').newState;
  const r = dbTriDraw(s, 'dl', 1, 1, 'p2');
  assert.strictEqual(r.scored, 1);
  assert.strictEqual(r.newState.dnT[1][0], 'p2');
});

test('does not mutate original state', () => {
  const s = makeDBTriState(3);
  dbTriDraw(s, 'h', 1, 0, 'p1');
  assert.strictEqual(s.h[1][0], false);
});

suite('Unit — dbTriIsComplete / dbTriScore');

test('dbTriIsComplete returns false on fresh state', () => {
  assert.strictEqual(dbTriIsComplete(makeDBTriState(2)), false);
});

test('dbTriScore counts across upT and dnT', () => {
  const s = makeDBTriState(2);
  s.upT[0][0] = 'p1'; s.upT[1][0] = 'p2'; s.upT[1][1] = 'p1'; s.dnT[1][0] = 'p2';
  const sc = dbTriScore(s);
  assert.strictEqual(sc.p1, 2); assert.strictEqual(sc.p2, 2);
});

// ─── INTEGRATION TESTS — Dots & Boxes ────────────────────────────────────────

suite('Integration — DB square 2×2 full game: p1 wins');

test('all 4 boxes get claimed in a 2×2 full game', () => {
  let s = makeDBState(2);
  // Draw inner lines: v[0][1], v[1][1], then h[1][0] and h[1][1]
  // h[1][0] completes box(0,0) and box(1,0); h[1][1] completes box(0,1) and box(1,1)
  s = dbDraw(s, 2, false, 0, 1, 'p1').newState; // v[0][1]
  s = dbDraw(s, 2, false, 1, 1, 'p2').newState; // v[1][1]
  s = dbDraw(s, 2, true,  1, 0, 'p1').newState; // h[1][0] → claims box(0,0) + box(1,0)
  s = dbDraw(s, 2, true,  1, 1, 'p1').newState; // h[1][1] → claims box(0,1) + box(1,1)
  assert.ok(dbIsComplete(s));
  const sc = dbScore(s.boxes);
  assert.strictEqual(sc.p1 + sc.p2, 4);
});

suite('Integration — DB triangle n=2 full game');

test('full n=2 triangle: all 4 triangles claimed', () => {
  let s = makeDBTriState(2);
  // n=2: upT[0][0], upT[1][0], upT[1][1], dnT[1][0]
  // Upward(0,0): dl[0][0](B), dr[0][0](B), h[1][0] → draw h[1][0]
  let r = dbTriDraw(s, 'h', 1, 0, 'p1'); s = r.newState;
  assert.strictEqual(s.upT[0][0], 'p1');
  // Upward(1,0): dl[1][0](B), dr[1][0], h[2][0](B) → draw dr[1][0]
  r = dbTriDraw(s, 'dr', 1, 0, 'p2'); s = r.newState;
  // Downward(1,0): h[1][0](drawn), dr[1][0](drawn), dl[1][1] → draw dl[1][1]
  r = dbTriDraw(s, 'dl', 1, 1, 'p2'); s = r.newState;
  assert.strictEqual(s.dnT[1][0], 'p2');
  assert.strictEqual(s.upT[1][0], 'p2');
  // Upward(1,1): dl[1][1](drawn), dr[1][1](B), h[2][1](B) → already complete
  assert.strictEqual(s.upT[1][1], 'p2');
  assert.ok(dbTriIsComplete(s));
  const sc = dbTriScore(s);
  assert.strictEqual(sc.p1, 1); assert.strictEqual(sc.p2, 3);
});

// ─── 1-TO-1 TESTS — Dots & Boxes ─────────────────────────────────────────────

suite('1-to-1 — DB square exact state after drawing h[1][0] in 3×3');

test('h[1][0] drawn, no box claimed, original state unchanged', () => {
  const s0 = makeDBState(3);
  const r  = dbDraw(s0, 3, true, 1, 0, 'p1');
  assert.strictEqual(r.scored, 0);
  assert.ok(r.newState.h[1][0]);
  assert.strictEqual(s0.h[1][0], false);
  assert.ok(r.newState.boxes.every(row => row.every(b => b === null)));
});

suite('1-to-1 — DB tri exact state: upT[0][0] claimed with first move in n=3');

test('drawing h[1][0] in n=3 immediately claims upT[0][0]', () => {
  const s = makeDBTriState(3);
  const r = dbTriDraw(s, 'h', 1, 0, 'p2');
  assert.strictEqual(r.scored, 1);
  assert.strictEqual(r.newState.upT[0][0], 'p2');
  assert.strictEqual(r.newState.dnT[1][0], null); // downward not yet complete
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
if (failed === 0) {
  console.log(`All ${passed} tests passed.`);
} else {
  console.log(`${passed} passed, ${failed} failed.`);
  process.exit(1);
}
