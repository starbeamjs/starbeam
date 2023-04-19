/**
 * Adapted from https://github.com/martinheidegger/monospace-char-width/tree/master
 *
 * Copyright (c) Year 2015, Martin Heidegger
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */
function isSurrogate(c: number) {
  return c >= 0xd800 && c <= 0xd8ff;
}

function surrogatePair(c: number, c1: number) {
  return (0x10000 + ((c & 0x3ff) << 10)) | (c1 & 0x3ff);
}

function isSurrogateDouble(c: number, c1: number) {
  // only [\u20000-\u2A6D6\u2A6D7-\u2F7FF\u2F800-\u2FA1D\u2FA1E-\u2FFFD\u30000-\u3FFFD] is full width.
  c = surrogatePair(c, c1);
  return (
    (c >= 0x20000 && c <= 0x2a6d6) ||
    (c >= 0x2a6d7 && c <= 0x2f7ff) ||
    (c >= 0x2f800 && c <= 0x2fa1d) ||
    (c >= 0x2fa1e && c <= 0x2fffd) ||
    (c >= 0x30000 && c <= 0x3fffd) ||
    (c >= 0xe0100 && c <= 0xe01ef) ||
    (c >= 0xf0000 && c <= 0xffffd) ||
    (c >= 0x100000 && c <= 0x10fffd)
  );
}

function isDouble(c: number) {
  return (
    c === 0x3000 ||
    (c >= 0xff01 && c <= 0xff60) ||
    (c >= 0xffe0 && c <= 0xffe6) ||
    (c >= 0x1100 && c <= 0x115f) ||
    (c >= 0x2329 && c <= 0x232a) ||
    (c >= 0x2e80 && c <= 0x2ffb) ||
    (c >= 0x3001 && c <= 0x303e) ||
    (c >= 0x3041 && c <= 0x33ff) ||
    (c >= 0x3400 && c <= 0x4db5) ||
    (c >= 0x4e00 && c <= 0x9fbb) ||
    (c >= 0xa000 && c <= 0xa4c6) ||
    (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0xf900 && c <= 0xfad9) ||
    (c >= 0xfe10 && c <= 0xfe19) ||
    (c >= 0xfe30 && c <= 0xfe6b) ||
    c === 0x00a1 ||
    c === 0x00a4 ||
    (c >= 0x00a7 && c <= 0x00a8) ||
    c === 0x00aa ||
    (c >= 0x00ad && c <= 0x00ae) ||
    (c >= 0x00b0 && c <= 0x00b4) ||
    (c >= 0x00b6 && c <= 0x00ba) ||
    (c >= 0x00bc && c <= 0x00bf) ||
    c === 0x00c6 ||
    c === 0x00d0 ||
    (c >= 0x00d7 && c <= 0x00d8) ||
    (c >= 0x00de && c <= 0x00e1) ||
    c === 0x00e6 ||
    c === 0x00f0 ||
    (c >= 0x00f7 && c <= 0x00f8) ||
    c === 0x00fc ||
    c === 0x00fe ||
    c === 0x0101 ||
    c === 0x0113 ||
    c === 0x011b ||
    (c >= 0x0126 && c <= 0x0127) ||
    c === 0x012b ||
    (c >= 0x0131 && c <= 0x0133) ||
    c === 0x0138 ||
    (c >= 0x013f && c <= 0x0142) ||
    c === 0x0144 ||
    (c >= 0x0148 && c <= 0x014b) ||
    c === 0x014d ||
    (c >= 0x0152 && c <= 0x0153) ||
    (c >= 0x0166 && c <= 0x0167) ||
    c === 0x016b ||
    c === 0x01ce ||
    c === 0x01d0 ||
    c === 0x01d2 ||
    c === 0x01d4 ||
    c === 0x01d6 ||
    c === 0x01d8 ||
    c === 0x01da ||
    c === 0x01dc ||
    c === 0x0251 ||
    c === 0x0261 ||
    c === 0x02c4 ||
    c === 0x02c7 ||
    (c >= 0x02c9 && c <= 0x02cb) ||
    c === 0x02cd ||
    c === 0x02d0 ||
    (c >= 0x02d8 && c <= 0x02db) ||
    c === 0x02dd ||
    c === 0x02df ||
    (c >= 0x0300 && c <= 0x036f) ||
    (c >= 0x0391 && c <= 0x03a9) ||
    (c >= 0x03b1 && c <= 0x03c1) ||
    (c >= 0x03c3 && c <= 0x03c9) ||
    c === 0x0401 ||
    (c >= 0x0410 && c <= 0x044f) ||
    c === 0x0451 ||
    c === 0x2010 ||
    (c >= 0x2013 && c <= 0x2016) ||
    (c >= 0x2018 && c <= 0x2019) ||
    (c >= 0x201c && c <= 0x201d) ||
    (c >= 0x2020 && c <= 0x2022) ||
    (c >= 0x2024 && c <= 0x2027) ||
    c === 0x2030 ||
    (c >= 0x2032 && c <= 0x2033) ||
    c === 0x2035 ||
    c === 0x203b ||
    c === 0x203e ||
    c === 0x2074 ||
    c === 0x207f ||
    (c >= 0x2081 && c <= 0x2084) ||
    c === 0x20ac ||
    c === 0x2103 ||
    c === 0x2105 ||
    c === 0x2109 ||
    c === 0x2113 ||
    c === 0x2116 ||
    (c >= 0x2121 && c <= 0x2122) ||
    c === 0x2126 ||
    c === 0x212b ||
    (c >= 0x2153 && c <= 0x2154) ||
    (c >= 0x215b && c <= 0x215e) ||
    (c >= 0x2160 && c <= 0x216b) ||
    (c >= 0x2170 && c <= 0x2179) ||
    (c >= 0x2190 && c <= 0x2199) ||
    (c >= 0x21b8 && c <= 0x21b9) ||
    c === 0x21d2 ||
    c === 0x21d4 ||
    c === 0x21e7 ||
    c === 0x2200 ||
    (c >= 0x2202 && c <= 0x2203) ||
    (c >= 0x2207 && c <= 0x2208) ||
    c === 0x220b ||
    c === 0x220f ||
    c === 0x2211 ||
    c === 0x2215 ||
    c === 0x221a ||
    (c >= 0x221d && c <= 0x2220) ||
    c === 0x2223 ||
    c === 0x2225 ||
    (c >= 0x2227 && c <= 0x222c) ||
    c === 0x222e ||
    (c >= 0x2234 && c <= 0x2237) ||
    (c >= 0x223c && c <= 0x223d) ||
    c === 0x2248 ||
    c === 0x224c ||
    c === 0x2252 ||
    (c >= 0x2260 && c <= 0x2261) ||
    (c >= 0x2264 && c <= 0x2267) ||
    (c >= 0x226a && c <= 0x226b) ||
    (c >= 0x226e && c <= 0x226f) ||
    (c >= 0x2282 && c <= 0x2283) ||
    (c >= 0x2286 && c <= 0x2287) ||
    c === 0x2295 ||
    c === 0x2299 ||
    c === 0x22a5 ||
    c === 0x22bf ||
    c === 0x2312 ||
    (c >= 0x2460 && c <= 0x24e9) ||
    (c >= 0x24eb && c <= 0x254b) ||
    (c >= 0x2550 && c <= 0x2573) ||
    (c >= 0x2580 && c <= 0x258f) ||
    (c >= 0x2592 && c <= 0x2595) ||
    (c >= 0x25a0 && c <= 0x25a1) ||
    (c >= 0x25a3 && c <= 0x25a9) ||
    (c >= 0x25b2 && c <= 0x25b3) ||
    (c >= 0x25b6 && c <= 0x25b7) ||
    (c >= 0x25bc && c <= 0x25bd) ||
    (c >= 0x25c0 && c <= 0x25c1) ||
    (c >= 0x25c6 && c <= 0x25c8) ||
    c === 0x25cb ||
    (c >= 0x25ce && c <= 0x25d1) ||
    (c >= 0x25e2 && c <= 0x25e5) ||
    c === 0x25ef ||
    (c >= 0x2605 && c <= 0x2606) ||
    c === 0x2609 ||
    (c >= 0x260e && c <= 0x260f) ||
    (c >= 0x2614 && c <= 0x2615) ||
    c === 0x261c ||
    c === 0x261e ||
    c === 0x2640 ||
    c === 0x2642 ||
    (c >= 0x2660 && c <= 0x2661) ||
    (c >= 0x2663 && c <= 0x2665) ||
    (c >= 0x2667 && c <= 0x266a) ||
    (c >= 0x266c && c <= 0x266d) ||
    c === 0x266f ||
    c === 0x273d ||
    (c >= 0x2776 && c <= 0x277f) ||
    (c >= 0xe000 && c <= 0xf8ff) ||
    (c >= 0xfe00 && c <= 0xfe0f) ||
    c === 0xfffd
  );
}

// https://en.wikipedia.org/wiki/Control_character
function isZero(c: number) {
  return isSurrogate(c) || c === 0 || c === 7 || c === 127;
}

export function terminalStringWidth(source: string): number {
  let width = 0;
  for (let i = 0; i < source.length; i++) {
    width += terminalStringAt(source, i);
  }

  return width;
}

function terminalStringAt(source: string, cBefore: number): 2 | 1 | 0 | -1 {
  const c = source.charCodeAt(cBefore);
  if (isSurrogate(cBefore)) {
    return isSurrogateDouble(cBefore, c) ? 2 : 1;
  }

  if (isZero(c)) {
    return 0;
  }

  if (isDouble(c)) {
    return 2;
  }

  if (c === 8) {
    // backwards delete
    return -1;
  }

  return 1;
}
