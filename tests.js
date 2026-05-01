// Run with: node tests.js
'use strict';
const assert = require('assert');
const {
  checkTTTWinner, checkC4WinFrom, c4Drop, isC4BoardFull, makeC4Board,
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

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
if (failed === 0) {
  console.log(`All ${passed} tests passed.`);
} else {
  console.log(`${passed} passed, ${failed} failed.`);
  process.exit(1);
}
