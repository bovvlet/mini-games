// Run with: node tests.js
'use strict';
const assert = require('assert');
const {
  checkTTTWinner, checkC4WinFrom, c4Drop, isC4BoardFull, makeC4Board,
  makeDBCells, makeDBTriCells, makeDBRhombusCells, makeDBFieldState, dbDraw, dbIsComplete, dbScore,
  HM_WORDS, hmPickWord, hmWrongGuesses, hmIsWon,
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

// ─── UNIT TESTS — Dots & Boxes (cell masks) ──────────────────────────────────

suite('Unit — DB cell masks');

test('makeDBCells(3) returns 3×3 all-true mask', () => {
  const cells = makeDBCells(3);
  assert.strictEqual(cells.length, 3);
  assert.ok(cells.every(row => row.length === 3 && row.every(v => v === true)));
});

test('makeDBTriCells(3): cells[r][c] = (r+c < 3)', () => {
  const cells = makeDBTriCells(3);
  assert.strictEqual(cells[0][2], true);  // 0+2=2 < 3
  assert.strictEqual(cells[1][1], true);  // 1+1=2 < 3
  assert.strictEqual(cells[1][2], false); // 1+2=3 not < 3
  assert.strictEqual(cells[2][0], true);  // 2+0=2 < 3
  assert.strictEqual(cells[2][1], false); // 2+1=3 not < 3
  const count = cells.flat().filter(Boolean).length;
  assert.strictEqual(count, 6); // n*(n+1)/2 = 6
});

test('makeDBRhombusCells(2) returns 3×3 with 5 cells (cross shape)', () => {
  const cells = makeDBRhombusCells(2);
  assert.strictEqual(cells.length, 3);
  assert.ok(cells[1].every(v => v === true)); // center row all true
  assert.strictEqual(cells[0][0], false);
  assert.strictEqual(cells[0][1], true);
  const count = cells.flat().filter(Boolean).length;
  assert.strictEqual(count, 5);
});

test('makeDBRhombusCells(3) returns 5×5 with 13 cells', () => {
  const cells = makeDBRhombusCells(3);
  assert.strictEqual(cells.length, 5);
  assert.strictEqual(cells.flat().filter(Boolean).length, 13);
});

// ─── UNIT TESTS — makeDBFieldState ───────────────────────────────────────────

suite('Unit — makeDBFieldState');

test('square 2×2: outer borders pre-drawn, inner lines not drawn', () => {
  const cells = makeDBCells(2);
  const s = makeDBFieldState(cells);
  assert.ok(s.h[0][0]); assert.ok(s.h[0][1]); // top border
  assert.ok(s.h[2][0]); assert.ok(s.h[2][1]); // bottom border
  assert.ok(s.v[0][0]); assert.ok(s.v[1][0]); // left border
  assert.ok(s.v[0][2]); assert.ok(s.v[1][2]); // right border
  assert.strictEqual(s.h[1][0], false); // inner line not drawn
  assert.strictEqual(s.v[0][1], false); // inner line not drawn
  assert.ok(s.boxes.every(row => row.every(b => b === null)));
});

test('triangle n=2: top border and left border pre-drawn', () => {
  const cells = makeDBTriCells(2); // cells: [[T,T],[T,F]]
  const s = makeDBFieldState(cells);
  assert.ok(s.h[0][0]); assert.ok(s.h[0][1]); // top border (row 0)
  assert.ok(s.v[0][0]); assert.ok(s.v[1][0]); // left border (col 0)
  assert.ok(s.h[2][0]); // bottom border of row 1
  assert.ok(s.v[0][2]); // right border of (0,1)
  assert.strictEqual(s.h[1][0], false); // inner line (0,0)↔(1,0) not drawn
});

// ─── UNIT TESTS — dbDraw ─────────────────────────────────────────────────────

suite('Unit — dbDraw');

test('returns null if line already drawn (border)', () => {
  const cells = makeDBCells(2);
  const s = makeDBFieldState(cells);
  assert.strictEqual(dbDraw(s, cells, true, 0, 0, 'p1'), null);  // h[0][0] is border
  assert.strictEqual(dbDraw(s, cells, false, 0, 0, 'p1'), null); // v[0][0] is border
});

test('drawing inner line does not mutate original state', () => {
  const cells = makeDBCells(2);
  const s = makeDBFieldState(cells);
  dbDraw(s, cells, true, 1, 0, 'p1');
  assert.strictEqual(s.h[1][0], false);
});

test('third side does not claim box; fourth side does', () => {
  const cells = makeDBCells(2);
  let s = makeDBFieldState(cells);
  // cell(0,0): h[0][0](B), h[1][0], v[0][0](B), v[0][1] → needs h[1][0] + v[0][1]
  let r = dbDraw(s, cells, true, 1, 0, 'p1');
  assert.strictEqual(r.scored, 0); assert.strictEqual(r.newState.boxes[0][0], null);
  r = dbDraw(r.newState, cells, false, 0, 1, 'p1'); // v[0][1] → completes cell(0,0)
  assert.strictEqual(r.scored, 1); assert.strictEqual(r.newState.boxes[0][0], 'p1');
});

test('one line can complete two boxes (scores 2)', () => {
  const cells = makeDBCells(2);
  let s = makeDBFieldState(cells);
  // draw v[0][1] and v[1][1] so both box(0,0) and box(1,0) only need h[1][0]
  s = dbDraw(s, cells, false, 0, 1, 'p1').newState;
  s = dbDraw(s, cells, false, 1, 1, 'p1').newState;
  const r = dbDraw(s, cells, true, 1, 0, 'p1');
  assert.strictEqual(r.scored, 2);
  assert.strictEqual(r.newState.boxes[0][0], 'p1');
  assert.strictEqual(r.newState.boxes[1][0], 'p1');
});

test('triangle cell: completing all 4 sides claims the cell', () => {
  const cells = makeDBTriCells(3);
  let s = makeDBFieldState(cells);
  // cell(0,0): h[0][0](B), h[1][0], v[0][0](B), v[0][1]
  let r = dbDraw(s, cells, true, 1, 0, 'p1');
  assert.strictEqual(r.scored, 0);
  r = dbDraw(r.newState, cells, false, 0, 1, 'p1');
  assert.strictEqual(r.scored, 1);
  assert.strictEqual(r.newState.boxes[0][0], 'p1');
});

// ─── UNIT TESTS — dbIsComplete / dbScore ─────────────────────────────────────

suite('Unit — dbIsComplete / dbScore');

test('dbIsComplete returns false on fresh square board', () => {
  const cells = makeDBCells(3);
  assert.strictEqual(dbIsComplete(makeDBFieldState(cells), cells), false);
});

test('dbIsComplete returns true when all field cells claimed', () => {
  const cells = makeDBCells(2);
  const s = makeDBFieldState(cells);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) s.boxes[r][c] = 'p1';
  assert.strictEqual(dbIsComplete(s, cells), true);
});

test('dbIsComplete for triangle ignores out-of-field cells', () => {
  const cells = makeDBTriCells(2); // [T,T],[T,F] → 3 cells
  const s = makeDBFieldState(cells);
  s.boxes[0][0] = 'p1'; s.boxes[0][1] = 'p2'; s.boxes[1][0] = 'p1';
  // cells[1][1] is false so boxes[1][1] is irrelevant
  assert.strictEqual(dbIsComplete(s, cells), true);
});

test('dbScore counts correctly for square', () => {
  const cells = makeDBCells(2);
  const s = makeDBFieldState(cells);
  s.boxes[0][0] = 'p1'; s.boxes[0][1] = 'p2'; s.boxes[1][0] = 'p2'; s.boxes[1][1] = 'p1';
  const sc = dbScore(s, cells);
  assert.strictEqual(sc.p1, 2); assert.strictEqual(sc.p2, 2);
});

test('dbScore for triangle ignores out-of-field cells', () => {
  const cells = makeDBTriCells(2);
  const s = makeDBFieldState(cells);
  s.boxes[0][0] = 'p1'; s.boxes[0][1] = 'p1'; s.boxes[1][0] = 'p2';
  s.boxes[1][1] = 'p2'; // out-of-field — must be ignored
  const sc = dbScore(s, cells);
  assert.strictEqual(sc.p1, 2); assert.strictEqual(sc.p2, 1);
});

// ─── INTEGRATION TESTS — Dots & Boxes ────────────────────────────────────────

suite('Integration — DB square 2×2 full game');

test('all 4 boxes get claimed in a 2×2 full game', () => {
  const cells = makeDBCells(2);
  let s = makeDBFieldState(cells);
  s = dbDraw(s, cells, false, 0, 1, 'p1').newState; // v[0][1]
  s = dbDraw(s, cells, false, 1, 1, 'p2').newState; // v[1][1]
  s = dbDraw(s, cells, true,  1, 0, 'p1').newState; // h[1][0] → claims (0,0)+(1,0)
  s = dbDraw(s, cells, true,  1, 1, 'p1').newState; // h[1][1] → claims (0,1)+(1,1)
  assert.ok(dbIsComplete(s, cells));
  const sc = dbScore(s, cells);
  assert.strictEqual(sc.p1 + sc.p2, 4);
});

suite('Integration — DB triangle n=3 claiming corner cell');

test('two inner lines complete top-left cell in n=3 triangle', () => {
  const cells = makeDBTriCells(3);
  let s = makeDBFieldState(cells);
  s = dbDraw(s, cells, true,  1, 0, 'p1').newState;
  const r = dbDraw(s, cells, false, 0, 1, 'p1');
  assert.strictEqual(r.scored, 1);
  assert.strictEqual(r.newState.boxes[0][0], 'p1');
});

suite('Integration — DB rhombus n=2 full game');

test('p1 claims all 5 cells in n=2 rhombus in 4 moves', () => {
  // n=2 rhombus: cells (0,1),(1,0),(1,1),(1,2),(2,1) — 5 cells
  // inner lines: h[1][1], h[2][1], v[1][1], v[1][2]
  // drawing each inner line also completes the outer cells (3 border sides + 1 inner)
  const cells = makeDBRhombusCells(2);
  let s = makeDBFieldState(cells), r;
  r = dbDraw(s, cells, true,  1, 1, 'p1'); s = r.newState; assert.strictEqual(r.scored, 1); // claims (0,1)
  r = dbDraw(s, cells, true,  2, 1, 'p1'); s = r.newState; assert.strictEqual(r.scored, 1); // claims (2,1)
  r = dbDraw(s, cells, false, 1, 1, 'p1'); s = r.newState; assert.strictEqual(r.scored, 1); // claims (1,0)
  r = dbDraw(s, cells, false, 1, 2, 'p1');                  assert.strictEqual(r.scored, 2); // claims (1,1)+(1,2)
  assert.ok(dbIsComplete(r.newState, cells));
  const sc = dbScore(r.newState, cells);
  assert.strictEqual(sc.p1, 5); assert.strictEqual(sc.p2, 0);
});

// ─── 1-TO-1 TESTS — Dots & Boxes ─────────────────────────────────────────────

suite('1-to-1 — DB square: first inner line leaves no box claimed');

test('h[1][0] drawn in 3×3, scored=0, original state unchanged', () => {
  const cells = makeDBCells(3);
  const s0 = makeDBFieldState(cells);
  const r = dbDraw(s0, cells, true, 1, 0, 'p1');
  assert.strictEqual(r.scored, 0);
  assert.ok(r.newState.h[1][0]);
  assert.strictEqual(s0.h[1][0], false); // immutable
  assert.ok(r.newState.boxes.every(row => row.every(b => b === null)));
});

suite('1-to-1 — DB field cell counts');

test('makeDBTriCells(4) has 10 cells (4+3+2+1)', () => {
  assert.strictEqual(makeDBTriCells(4).flat().filter(Boolean).length, 10);
});

test('makeDBRhombusCells(4) has 25 cells', () => {
  assert.strictEqual(makeDBRhombusCells(4).flat().filter(Boolean).length, 25);
});

// ─── HANGMAN TESTS ───────────────────────────────────────────────────────────

suite('Unit — hmWrongGuesses');

test('returns empty array with no guesses', () => {
  assert.deepStrictEqual(hmWrongGuesses('КОШКА', new Set()), []);
});

test('correct guess not included in wrong list', () => {
  assert.deepStrictEqual(hmWrongGuesses('КОШКА', new Set(['К'])), []);
});

test('wrong guess appears in result', () => {
  const wrong = hmWrongGuesses('КОШКА', new Set(['К', 'А', 'Б']));
  assert.deepStrictEqual(wrong, ['Б']);
});

test('multiple wrong guesses all returned', () => {
  const wrong = hmWrongGuesses('КОТ', new Set(['А', 'Б', 'В', 'К']));
  assert.deepStrictEqual(wrong.sort(), ['А', 'Б', 'В'].sort());
});

suite('Unit — hmIsWon');

test('returns false with no guesses', () => {
  assert.strictEqual(hmIsWon('КОШКА', new Set()), false);
});

test('returns false with only some letters guessed', () => {
  assert.strictEqual(hmIsWon('КОШКА', new Set(['К','О'])), false);
});

test('returns true when all unique letters guessed', () => {
  // КОШКА has letters К, О, Ш, А
  assert.strictEqual(hmIsWon('КОШКА', new Set(['К','О','Ш','А'])), true);
});

test('returns true even with extra wrong guesses in set', () => {
  assert.strictEqual(hmIsWon('КОТ', new Set(['К','О','Т','Б','В'])), true);
});

suite('Unit — hmPickWord');

test('returns a string for each level', () => {
  assert.strictEqual(typeof hmPickWord(1), 'string');
  assert.strictEqual(typeof hmPickWord(2), 'string');
  assert.strictEqual(typeof hmPickWord(3), 'string');
});

test('word from level 1 is in the level 1 list', () => {
  for (let i = 0; i < 10; i++) {
    const w = hmPickWord(1);
    assert.ok(HM_WORDS[1].includes(w), `${w} not in level 1`);
  }
});

test('word from level 3 is in the level 3 list', () => {
  for (let i = 0; i < 10; i++) {
    const w = hmPickWord(3);
    assert.ok(HM_WORDS[3].includes(w), `${w} not in level 3`);
  }
});

test('each level has exactly 100 words', () => {
  assert.strictEqual(HM_WORDS[1].length, 100);
  assert.strictEqual(HM_WORDS[2].length, 100);
  assert.strictEqual(HM_WORDS[3].length, 100);
});

suite('Integration — HM full win game');

test('guessing all letters wins the word ТИГР', () => {
  const word = 'ТИГР';
  const guessed = new Set();
  let won = false;
  for (const letter of ['Т','И','Г','Р']) {
    guessed.add(letter);
    if (hmIsWon(word, guessed)) { won = true; break; }
  }
  assert.strictEqual(won, true);
  assert.strictEqual(hmWrongGuesses(word, guessed).length, 0);
});

test('9 wrong guesses trigger game over', () => {
  const word = 'КОТ';
  const guessed = new Set(['А','Б','В','Г','Д','Е','Ж','З','И']);
  assert.strictEqual(hmWrongGuesses(word, guessed).length, 9);
  assert.strictEqual(hmIsWon(word, guessed), false);
});

suite('Integration — HM partial game');

test('mid-game: 3 correct + 2 wrong guesses', () => {
  const word = 'СОБАКА';
  const guessed = new Set(['С','О','Б','Х','Й']); // С,О,Б correct; Х,Й wrong
  assert.strictEqual(hmWrongGuesses(word, guessed).length, 2);
  assert.strictEqual(hmIsWon(word, guessed), false);
});

test('turn does not change if wrong guess — wrong count increments', () => {
  const word = 'ВОЛК';
  const g1 = new Set(['А']);
  const g2 = new Set(['А','Б']);
  assert.strictEqual(hmWrongGuesses(word, g1).length, 1);
  assert.strictEqual(hmWrongGuesses(word, g2).length, 2);
});

suite('1-to-1 — HM exact state snapshots');

test('КОШКА: guessing К,О,Ш,А reveals word, Б,В wrong', () => {
  const word = 'КОШКА';
  const guessed = new Set(['К','О','Ш','А','Б','В']);
  assert.strictEqual(hmIsWon(word, guessed), true);
  assert.deepStrictEqual(hmWrongGuesses(word, guessed).sort(), ['Б','В'].sort());
});

test('revealed letters match for СЛОН after guessing С and Л', () => {
  const word = 'СЛОН';
  const guessed = new Set(['С','Л']);
  const revealed = [...word].map(ch => guessed.has(ch) ? ch : '_');
  assert.deepStrictEqual(revealed, ['С','Л','_','_']);
});

test('no duplicate words across levels', () => {
  const all = [...HM_WORDS[1], ...HM_WORDS[2], ...HM_WORDS[3]];
  const unique = new Set(all);
  assert.strictEqual(all.length, unique.size);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
if (failed === 0) {
  console.log(`All ${passed} tests passed.`);
} else {
  console.log(`${passed} passed, ${failed} failed.`);
  process.exit(1);
}
