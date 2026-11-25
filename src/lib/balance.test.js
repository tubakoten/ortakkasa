// Çalıştırmak için: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseToKurus,
  formatTL,
  splitEqually,
  computeBalances,
  simplifyDebts,
} from './balance.js';

test('parseToKurus', () => {
  assert.equal(parseToKurus('125,50'), 12550);
  assert.equal(parseToKurus('125.5'), 12550);
  assert.equal(parseToKurus('40'), 4000);
  assert.equal(parseToKurus('0,05'), 5);
  assert.equal(parseToKurus('abc'), null);
  assert.equal(parseToKurus('-5'), null);
  assert.equal(parseToKurus('1,234'), null);
});

test('formatTL', () => {
  assert.equal(formatTL(12550), '125,50 TL');
  assert.equal(formatTL(-500), '-5,00 TL');
  assert.equal(formatTL(123456789), '1.234.567,89 TL');
});

test('splitEqually: kalan kuruş dağıtılır, toplam korunur', () => {
  const s = splitEqually(100, ['a', 'b', 'c']);
  assert.deepEqual(s, { a: 34, b: 33, c: 33 });
  assert.equal(Object.values(s).reduce((x, y) => x + y, 0), 100);
});

test('computeBalances: bakiyelerin toplamı her zaman 0', () => {
  const members = ['ali', 'ayse', 'can'];
  const expenses = [
    { paidBy: 'ali', amount: 30000, shares: splitEqually(30000, members) }, // market
    { paidBy: 'ayse', amount: 9000, shares: { ayse: 4500, can: 4500 } }, // taksi
  ];
  const b = computeBalances(members, expenses);
  assert.deepEqual(b, { ali: 20000, ayse: -5500, can: -14500 });
  assert.equal(Object.values(b).reduce((x, y) => x + y, 0), 0);
});

test('settlement bakiyeyi kapatır', () => {
  const members = ['ali', 'can'];
  const expenses = [{ paidBy: 'ali', amount: 1000, shares: { ali: 500, can: 500 } }];
  const settlements = [{ from: 'can', to: 'ali', amount: 500 }];
  assert.deepEqual(computeBalances(members, expenses, settlements), { ali: 0, can: 0 });
});

test('simplifyDebts: en fazla n-1 ödeme ve herkes sıfırlanır', () => {
  // Zincir borç: A->B 100, B->C 100, C->D 100  => tek ödeme: A->D 100
  const balances = { A: -100, B: 0, C: 0, D: 100 };
  assert.deepEqual(simplifyDebts(balances), [{ from: 'A', to: 'D', amount: 100 }]);

  const b2 = { a: -5000, b: -3000, c: 6000, d: 2000 };
  const t = simplifyDebts(b2);
  assert.ok(t.length <= 3);
  const after = { ...b2 };
  for (const { from, to, amount } of t) {
    after[from] += amount;
    after[to] -= amount;
  }
  assert.ok(Object.values(after).every((v) => v === 0));
});

test('simplifyDebts: herkes eşitse ödeme yok', () => {
  assert.deepEqual(simplifyDebts({ a: 0, b: 0 }), []);
});

import { dative } from './tr.js';
test('dative: Türkçe yönelme eki', () => {
  assert.equal(dative('Begüm'), "Begüm'e");
  assert.equal(dative('Işıl'), "Işıl'a");
  assert.equal(dative('Rabia'), "Rabia'ya");
  assert.equal(dative('Ece'), "Ece'ye");
  assert.equal(dative('tuba nil'), "tuba nil'e");
  assert.equal(dative('İrem'), "İrem'e");
});

import { formatMoney, parseRate, toKurus, convertShares } from './currency.js';
test('formatMoney: para birimine göre', () => {
  assert.equal(formatMoney(12550, 'EUR'), '125,50 €');
  assert.equal(formatMoney(250, 'GAU'), '2,50 gr altın');
  assert.equal(formatMoney(100000), '1.000,00 TL');
});

test('parseRate: Türkçe ve noktalı biçim', () => {
  assert.equal(parseRate('36,8012'), 36.8012);
  assert.equal(parseRate('6.198,49'), 6198.49);
  assert.equal(parseRate('36.80'), 36.8);
  assert.equal(parseRate('abc'), null);
  assert.equal(parseRate('0'), null);
});

test('döviz -> TL çevirisi ve payların toplamı korunur', () => {
  const rate = 36.8013;
  const total = toKurus(10000, rate); // 100,00 EUR
  assert.equal(total, 368013);
  const shares = convertShares({ a: 3333, b: 3333, c: 3334 }, rate, total);
  assert.equal(Object.values(shares).reduce((x, y) => x + y, 0), total);
});
