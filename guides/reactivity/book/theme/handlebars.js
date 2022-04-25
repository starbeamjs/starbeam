// @ts-check

/*
Language: Handlebars
Requires: xml.js
Author: Robin Ward <robin.ward@gmail.com>
Description: Matcher for Handlebars as well as EmberJS additions.
Website: https://handlebarsjs.com
Category: template
*/

/// <reference path="./hljs.d.ts" />

const regex = hljs.regex;

/**
 *
 * @param {Mode} mode
 * @returns {Mode}
 */
function mode(mode) {
  return mode;
}

// hljs.inherit(hljs.QUOTE_STRING_MODE, {
//   begin: /b?"/,
//   illegal: null
// }),

const STRING_DQ = mode({
  ...hljs.QUOTE_STRING_MODE,
  scope: "string.double",
  illegal: null,
});

const IDENT_START = /[a-z]/;
const LOOKAHEAD = /[\s})]/;

const IDENT = mode({
  scope: "variable",
  match: regex.concat(
    regex.anyNumberOfTimes(IDENT_START),
    regex.lookahead(regex.either(LOOKAHEAD, "."))
  ),
});

const THIS = {
  scope: "variable.language",
  match: "this",
};

const HEAD = {
  contains: [THIS, IDENT],
};

const MEMBER = {
  contains: [
    {
      string: ".",
      scope: "punctuation",
    },
    IDENT,
  ],
};

const PATH = mode({
  begin: /(?=[a-z])/,
  excludeBegin: false,
  contains: [
    mode({
      scope: "variable.language",
      match: "this",
    }),
    mode({
      scope: "variable",
      match: /[a-z]+/,
    }),
  ],
});

const MUSTACHE = {
  scope: "string.template",
  begin: "{{",
  beginScope: "punctuation",
  end: "}}",
  endScope: "punctuation",
  contains: [PATH, STRING_DQ],
};

const syntax = {
  name: "Handlebars",
  aliases: ["hbs", "html.hbs", "html.handlebars", "htmlbars"],
  subLanguage: "xml",
  contains: [MUSTACHE],
};

hljs.registerLanguage("handlebars", () => syntax);
