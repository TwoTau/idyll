'use strict';

var parse = require('./parser');
var Lexer = require('./lexer');
var Processor = require('./processors');

var _require = require('./processors/pre'),
    cleanNewlines = _require.cleanNewlines;

var _require2 = require('./processors/post'),
    hoistVariables = _require2.hoistVariables,
    flattenChildren = _require2.flattenChildren,
    cleanResults = _require2.cleanResults,
    makeFullWidth = _require2.makeFullWidth,
    wrapText = _require2.wrapText,
    autoLinkify = _require2.autoLinkify;

var convertV1ToV2 = require('idyll-ast').converters.convertV1ToV2;

var matter = require('gray-matter');

module.exports = function (input, options, alias, callback) {
  input = Processor(input).pipe(cleanNewlines).end();

  var _matter = matter(input.trim()),
      content = _matter.content,
      data = _matter.data;

  options = Object.assign({}, { spellcheck: false, smartquotes: true, async: true }, options || {});
  var lex = Lexer({}, alias);
  var lexResults = '',
      output = [];
  try {
    lexResults = lex(content);
  } catch (err) {
    console.warn('\nError parsing Idyll markup:\n' + err.message);
    return new Promise(function (resolve, reject) {
      return reject(err);
    });
  }
  try {
    output = parse(content, lexResults.tokens.join(' '), lexResults.positions, options);
  } catch (err) {
    console.warn('\nError parsing Idyll markup:\n' + err.message);
    if (options.async) {
      return new Promise(function (resolve, reject) {
        return reject(err);
      });
    } else {
      throw err;
    }
  }

  var astTransform = Processor(output, options).pipe(hoistVariables).pipe(flattenChildren).pipe(makeFullWidth).pipe(wrapText).pipe(cleanResults).pipe(autoLinkify).end();

  astTransform = convertV1ToV2(astTransform);

  if (options.postProcessors) {
    // Turn them all into promises
    var promises = options.postProcessors.map(function (f) {
      return function (ast) {
        return new Promise(function (resolve, reject) {
          if (f.length === 2) {
            f(ast, function (err, value) {
              if (err) {
                return reject(err);
              }
              resolve(value);
            });
          } else {
            resolve(f(ast));
          }
        });
      };
    });

    return promises.reduce(function (promise, f, i) {
      return promise.then(function (val) {
        return f(val);
      });
    }, Promise.resolve(astTransform));
  } else {
    return options.async ? new Promise(function (resolve) {
      return resolve(astTransform);
    }) : astTransform;
  }
};