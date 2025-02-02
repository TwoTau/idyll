var _templateObject = _taggedTemplateLiteralLoose(['$$s*([^$]*s*[\ns\t]*((?!($$)).\n?)*)[\ns\t]*s*$$'], ['\\$\\$\\s*([^$]*\\s*[\\n\\s\\t]*((?!(\\$\\$)).\\n?)*)[\\n\\s\\t]*\\s*\\$\\$']),
    _templateObject2 = _taggedTemplateLiteralLoose(['{s*(', ')s*([^/}]*)s*}[\ns\t]*(((?!({s*/(', ')s*})).\n?)*)[\ns\t]*{s*/s*(', ')s*}'], ['{\\s*(', ')\\s*([^\\/}]*)\\s*}[\\n\\s\\t]*(((?!({\\s*\\/(', ')\\s*})).\\n?)*)[\\n\\s\\t]*{\\s*\\/\\s*(', ')\\s*}']);

function _taggedTemplateLiteralLoose(strings, raw) { strings.raw = raw; return strings; }

var Lexer = require('lex');

var formatToken = function formatToken(text) {
  text = text || '';
  var results = [];
  results.push('TOKEN_VALUE_START');
  results.push('"' + text.replace(/\"/g, '&quot;').replace(/\\{/, '{').replace(/\\}/, '}') + '"');
  results.push('TOKEN_VALUE_END');
  return results;
};

var shouldBreak = function shouldBreak(text) {
  if (text.trim() === '' && (text.match(/\n/g) || []).length > 1) {
    return true;
  }
  return false;
};

var currentInput = null;

var lex = function lex(options) {
  var alias = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var _Object$assign = Object.assign({}, {
    row: 1,
    column: 1,
    outer: true,
    skipLists: false,
    inComponent: false,
    inStyleComponent: false,
    gotName: false
  }, options || {}),
      row = _Object$assign.row,
      column = _Object$assign.column,
      outer = _Object$assign.outer,
      skipLists = _Object$assign.skipLists,
      inComponent = _Object$assign.inComponent,
      inStyleComponent = _Object$assign.inStyleComponent,
      gotName = _Object$assign.gotName;

  var lexer = new Lexer(function (chr) {
    var errorString = '\n      Error lexing input, unexpected token: ' + chr + '\n\n      Found near index ' + (this.index - 1) + ':\n\n      ' + currentInput.substring(Math.max(0, this.index - 10), Math.min(this.index + 10, currentInput.length - 1)) + '\n    ';
    throw new Error(errorString);
  });

  var recurse = function recurse(str, opts) {
    return lex(Object.assign({ row: row, column: column, outer: false }, opts || {}), alias)(str).tokens;
  };
  var findAliases = function findAliases(name) {
    var aliasNames = Object.keys(alias);
    return [name].concat(aliasNames.filter(function (aliasName) {
      return alias[aliasName].toLowerCase() === name.toLowerCase();
    })).join('|');
  };
  var updatePosition = function updatePosition(lexeme) {
    var lines = lexeme.split('\n');
    row += lines.length - 1;
    if (lines.length > 1) {
      column = 0;
    }
    column += lines[lines.length - 1].length;
  };

  // Rules at the front are pre-processed,
  // e.g. equations, and code snippets
  // that shouldn't be formatted.
  // for $$ syntax
  lexer.addRule(new RegExp(String.raw(_templateObject), 'i'), function (lexeme, innerText) {
    inComponent = false;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['OPEN_BRACKET', 'COMPONENT_NAME'].concat(formatToken('equation')).concat(['CLOSE_BRACKET']).concat(['WORDS']).concat(formatToken(innerText.trim())).concat(['OPEN_BRACKET', 'FORWARD_SLASH', 'COMPONENT_NAME']).concat(formatToken('equation')).concat(['CLOSE_BRACKET']);
  });
  var equationAliases = findAliases('equation');
  lexer.addRule(new RegExp(String.raw(_templateObject2, equationAliases, equationAliases, equationAliases), 'i'), function (lexeme, tagName, props, innerText) {
    inComponent = false;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['OPEN_BRACKET', 'COMPONENT_NAME'].concat(formatToken('equation')).concat(recurse(props, { inComponent: true, gotName: true })).concat(['CLOSE_BRACKET']).concat(['WORDS']).concat(formatToken(innerText.trim())).concat(['OPEN_BRACKET', 'FORWARD_SLASH', 'COMPONENT_NAME']).concat(formatToken('equation')).concat(['CLOSE_BRACKET']);
  });
  var codeAlias = findAliases('code');
  lexer.addRule(new RegExp(String.raw(_templateObject2, codeAlias, codeAlias, codeAlias), 'i'), function (lexeme, tagName, props, innerText) {
    inComponent = false;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['OPEN_BRACKET', 'COMPONENT_NAME'].concat(formatToken('code')).concat(recurse(props, { inComponent: true, gotName: true })).concat(['CLOSE_BRACKET']).concat(['WORDS']).concat(formatToken(innerText.trim())).concat(['OPEN_BRACKET', 'FORWARD_SLASH', 'COMPONENT_NAME']).concat(formatToken('code')).concat(['CLOSE_BRACKET']);
  });
  lexer.addRule(/`{4}(\S*)\n(((?!````)[\s\S])*[^\n])\n?\s*`{4}/g, function (lexeme, language, text) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['MULTILINE_CODE'].concat(formatToken(language)).concat(formatToken(text));
  });
  lexer.addRule(/`{3}(\S*)\n(((?!```)[\s\S])*[^\n])\n?\s*`{3}/g, function (lexeme, language, text) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['MULTILINE_CODE'].concat(formatToken(language)).concat(formatToken(text));
  });
  lexer.addRule(/```(((?!```)[^\n])+)```/, function (lexeme, text) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['INLINE_CODE'].concat(formatToken(text.trim()));
  });
  lexer.addRule(/``(((?!``)[^\n])+)``/, function (lexeme, text) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['INLINE_CODE'].concat(formatToken(text.trim()));
  });
  lexer.addRule(/`([^\n\`]+)`/, function (lexeme, text) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['INLINE_CODE'].concat(formatToken(text.trim()));
  });

  lexer.addRule(/[\s\n]*(#{1,6})\s*([^\n{]+)[\n\s]*/gm, function (lexeme, hashes, text) {
    if (this.reject) return;
    updatePosition(lexeme);
    return ['BREAK', 'HEADER_' + hashes.length].concat(recurse(text, { skipLists: true })).concat(['HEADER_END']);
  });

  lexer.addRule(/[\s\n]*>\s*([^\n{]+)[\n\s]*/gm, function (lexeme, text) {
    if (this.reject) return;
    updatePosition(lexeme);
    return ['BREAK', 'QUOTE_START'].concat(recurse(text, { skipLists: true })).concat(['QUOTE_END']);
  });

  lexer.addRule(/\*\*([^\s\n][^\*]*[^\s\n])\*\*(\s*)/g, function (lexeme, text, trailingSpace) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    var ret = ['STRONG'].concat(recurse(text, { skipLists: true })).concat(['STRONG_END']);
    if (trailingSpace) {
      if (shouldBreak(trailingSpace)) {
        ret = ret.concat(['BREAK']);
      } else {
        ret = ret.concat(['WORDS']).concat(formatToken(trailingSpace));
      }
    }
    return ret;
  });
  lexer.addRule(/__([^\s\n][^_]*[^\s\n])__(\s*)/g, function (lexeme, text, trailingSpace) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    var ret = ['STRONG'].concat(recurse(text, { skipLists: true })).concat(['STRONG_END']);
    if (trailingSpace) {
      if (shouldBreak(trailingSpace)) {
        ret = ret.concat(['BREAK']);
      } else {
        ret = ret.concat(['WORDS']).concat(formatToken(trailingSpace));
      }
    }
    return ret;
  });
  lexer.addRule(/\*([^\s\n\*][^\*]*[^\s\n\*])\*(\s*)/g, function (lexeme, text, trailingSpace) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    var ret = ['EM'].concat(recurse(text, { skipLists: true })).concat(['EM_END']);
    if (trailingSpace) {
      if (shouldBreak(trailingSpace)) {
        ret = ret.concat(['BREAK']);
      } else {
        ret = ret.concat(['WORDS']).concat(formatToken(trailingSpace));
      }
    }
    return ret;
  });
  lexer.addRule(/_([^\s\n_][^_]*[^\s\n_])_(\s*)/g, function (lexeme, text, trailingSpace) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    var ret = ['EM'].concat(recurse(text, { skipLists: true })).concat(['EM_END']);
    if (trailingSpace) {
      if (shouldBreak(trailingSpace)) {
        ret = ret.concat(['BREAK']);
      } else {
        ret = ret.concat(['WORDS']).concat(formatToken(trailingSpace));
      }
    }
    return ret;
  });

  lexer.addRule(/~~([^\s\n][^~]*[^\s\n])~~(\s*)/g, function (lexeme, text, trailingSpace) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    var ret = ['STRIKE'].concat(recurse(text, { skipLists: true })).concat(['STRIKE_END']);
    if (trailingSpace) {
      if (shouldBreak(trailingSpace)) {
        ret = ret.concat(['BREAK']);
      } else {
        ret = ret.concat(['WORDS']).concat(formatToken(trailingSpace));
      }
    }
    return ret;
  });

  lexer.addRule(/\^([^\s\n\^][^\^]*[^\s\n\^])\^(\s*)/g, function (lexeme, text, trailingSpace) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    var ret = ['SUPER'].concat(recurse(text, { skipLists: true })).concat(['SUPER_END']);
    if (trailingSpace) {
      if (shouldBreak(trailingSpace)) {
        ret = ret.concat(['BREAK']);
      } else {
        ret = ret.concat(['WORDS']).concat(formatToken(trailingSpace));
      }
    }
    return ret;
  });

  lexer.addRule(/~([^\s\n~][^~]*[^\s\n~])~(\s*)/g, function (lexeme, text, trailingSpace) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    var ret = ['SUB'].concat(recurse(text, { skipLists: true })).concat(['SUB_END']);
    if (trailingSpace) {
      if (shouldBreak(trailingSpace)) {
        ret = ret.concat(['BREAK']);
      } else {
        ret = ret.concat(['WORDS']).concat(formatToken(trailingSpace));
      }
    }
    return ret;
  });

  lexer.addRule(/^\s*([\-\*]\s+([^\n]*)\n)*([\-\*]\s+([^\n]*)\n?)/gm, function (lexeme) {
    this.reject = inComponent || skipLists;
    if (this.reject) return;
    updatePosition(lexeme);
    var items = lexeme.trim().split('\n');
    var matches = items.map(function (item) {
      return (/[\-\*]\s*([^\n]*)/.exec(item)[1]
      );
    });
    var output = ['BREAK', 'UNORDERED_LIST'];
    matches.forEach(function (item) {
      output = output.concat(['LIST_ITEM']).concat(recurse(item.trim() || ' '));
    });
    return output.concat(['LIST_END']);
  });

  lexer.addRule(/^\s*(\d+\.\s+([^\n]*)\n)*(\d+\.\s+([^\n]*)\n?)/gm, function (lexeme) {
    this.reject = inComponent || skipLists;
    if (this.reject) return;
    updatePosition(lexeme);
    var items = lexeme.trim().split('\n');
    var matches = items.map(function (item) {
      return (/\d+\.\s*([^\n]*)/.exec(item)[1]
      );
    });
    var output = ['BREAK', 'ORDERED_LIST'];
    matches.forEach(function (item) {
      output = output.concat(['LIST_ITEM']).concat(recurse(item));
    });
    return output.concat(['LIST_END']);
  });

  // rule to convert ~x=123 into derived variables
  lexer.addRule(/\s*~((\s*\w*\s*(:?=)\s*[^\n,]*)[^\n,](,[^\n]\s*\w*\s*(:?=)\s*[^\n,]*)*)/g, function (lexeme, variableDeclarations) {
    if (this.reject) return;
    updatePosition(lexeme);
    var output = [];
    variableDeclarations.split(',').forEach(function (declaration) {
      if (declaration[declaration.indexOf('=') - 1] === ':') {
        output = output.concat(['OPEN_BRACKET', 'COMPONENT_NAME']).concat(formatToken('derived')).concat(['COMPONENT_WORD']).concat(formatToken('name')).concat('PARAM_SEPARATOR', 'COMPONENT_WORD').concat(formatToken(declaration.split(':=')[0].trim())).concat(['COMPONENT_WORD']).concat(formatToken('value')).concat(['PARAM_SEPARATOR']).concat(['EXPRESSION']).concat(formatToken('`' + declaration.split(':=')[1].trim() + '`')).concat(['FORWARD_SLASH', 'CLOSE_BRACKET']);
      } else {
        output = output.concat(['OPEN_BRACKET', 'COMPONENT_NAME']).concat(formatToken('var')).concat(['COMPONENT_WORD']).concat(formatToken('name')).concat('PARAM_SEPARATOR', 'COMPONENT_WORD').concat(formatToken(declaration.split('=')[0].trim())).concat(['COMPONENT_WORD']).concat(formatToken('value')).concat('PARAM_SEPARATOR').concat(recurse(declaration.split('=')[1].trim(), { inComponent: true })).concat(['FORWARD_SLASH', 'CLOSE_BRACKET']);
      }
    });
    return output;
  });
  lexer.addRule(/!\[([^\]]*)\]\(([^\)]*)\)/, function (lexeme, text, link) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['IMAGE'].concat(formatToken(text)).concat(formatToken(link));
  });

  lexer.addRule(/\[([^\]]*)\]\(([^\)]*)\)/, function (lexeme, text, link) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['LINK'].concat(formatToken(text)).concat(formatToken(link));
  });

  lexer.addRule(/(\n\s*\/\/[^\n]*|\/\/\s+[^\n]*)/, function (lexeme) {
    updatePosition(lexeme);
    if (lexeme.startsWith('\n')) {
      return ['BREAK'];
    }
  });

  lexer.addRule(/\/(\n?[^`\*\[{\/\n\]}!\\\d_\^~])*/gm, function (lexeme) {
    this.reject = inComponent && !inStyleComponent || lexeme.trim() === '';
    if (this.reject) return;
    updatePosition(lexeme);
    return ['WORDS'].concat(formatToken(lexeme));
  });

  lexer.addRule(/(\n?[^`\*\[{\/\n\]}!\\\d_\^~\$])+/, function (lexeme) {
    this.reject = inComponent && !inStyleComponent || lexeme.trim() === '';
    if (this.reject) return;
    updatePosition(lexeme);
    return ['WORDS'].concat(formatToken(lexeme));
  });
  // Match on separately so we can greedily match the
  // other tags.
  lexer.addRule(/[!\d\*_\^~`] */, function (lexeme) {
    this.reject = inComponent && !inStyleComponent || lexeme.trim() === '';
    if (this.reject) return;
    updatePosition(lexeme);
    return ['WORDS'].concat(formatToken(lexeme));
  });
  lexer.addRule(/\\[{}\$]?/, function (lexeme) {
    this.reject = inComponent && !inStyleComponent || lexeme.trim() === '';
    if (this.reject) return;
    updatePosition(lexeme);
    return ['WORDS'].concat(formatToken(lexeme));
  });

  lexer.addRule(/\s*\n{2,}\s*/, function (lexeme) {
    this.reject = inComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['BREAK'];
  });

  lexer.addRule(/[ \t\n]+/, function (lexeme) {
    updatePosition(lexeme);
  });

  lexer.addRule(/\[((?::[^:+=\-0-9\s\/}\]"'`\.](?:[^:=\s\/}\]"'`]*[^:=\s\/}\]"'`\.])*)+)/, function (lexeme, style) {
    inComponent = true;
    inStyleComponent = true;
    if (this.reject) return;
    var styleClasses = style.split(':').filter(function (x) {
      return x;
    }).join(' ');
    updatePosition(lexeme);
    return ['OPEN_STYLE_BRACKET', 'STYLE_TAG'].concat(formatToken(styleClasses));
  });

  lexer.addRule(/]/, function (lexeme) {
    inComponent = false;
    inStyleComponent = false;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['CLOSE_STYLE_BRACKET'];
  });

  lexer.addRule(/\]/, function (lexeme) {
    inComponent = false;
    gotName = false;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['FORWARD_SLASH', 'CLOSE_BRACKET'];
  });

  lexer.addRule(/{/, function (lexeme) {
    inComponent = true;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['OPEN_BRACKET'];
  });

  lexer.addRule(/}([ ]*)/, function (lexeme, trailingSpace) {
    inComponent = false;
    gotName = false;
    if (this.reject) return;
    updatePosition(lexeme);
    var ret = ['CLOSE_BRACKET'];
    if (trailingSpace) {
      ret = ret.concat(['WORDS']).concat(formatToken(trailingSpace));
    }
    return ret;
  });

  lexer.addRule(/\//, function (lexeme) {
    this.reject = !inComponent || inStyleComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['FORWARD_SLASH'];
  });

  lexer.addRule(/true|false/, function (lexeme) {
    this.reject = !inComponent || inStyleComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['BOOLEAN'].concat(formatToken(lexeme));
  });

  lexer.addRule(/[^:+=\-0-9\s\/}"'`\.]([^:=\s\/}"'`]*[^:=\s\/}"'`\.])*/, function (lexeme) {
    this.reject = !inComponent || inStyleComponent || gotName;
    if (this.reject) return;
    gotName = true;
    updatePosition(lexeme);
    return ['COMPONENT_NAME'].concat(formatToken(lexeme));
  });

  // TODO: handle slashes and curly brackets in content
  // shorthand component
  lexer.addRule(/([^:+=\-0-9\s\/}"'`\.](?:[^:=\s\/}"'`]*[^:=\s\/}"'`\.])*):([^+=\-0-9\/}"'`\.](?:[^=\/}"'`]*[^=\/}"'`\.])*)/, function (lexeme, name, content) {
    this.reject = !inComponent || inStyleComponent || gotName;
    if (this.reject) return;
    gotName = true;
    updatePosition(lexeme);
    return ['COMPONENT_NAME'].concat(formatToken(name), ['SHORTHAND_COMPONENT_CONTENT'], formatToken(content));
  });

  lexer.addRule(/[^+\-0-9=\s\/}"'`\.][^=\s\/}\]"'`\.]*/, function (lexeme) {
    this.reject = !inComponent || inStyleComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['COMPONENT_WORD'].concat(formatToken(lexeme));
  });

  lexer.addRule(/{[^\}]*}/, function (lexeme) {
    this.reject = !inComponent || inStyleComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['EXPRESSION'].concat(formatToken(lexeme));
  });

  lexer.addRule(/[+\-]?\.?[0-9]+\.?[0-9]*/, function (lexeme) {
    var multiplePeriods = (lexeme.match(new RegExp(/\./, 'g')) || []).length >= 2;
    this.reject = !inComponent || inStyleComponent || multiplePeriods;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['NUMBER'].concat(formatToken(lexeme));
  });

  lexer.addRule(/"[^"]*"/, function (lexeme) {
    this.reject = !inComponent || inStyleComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['STRING'].concat(formatToken(lexeme));
  });
  lexer.addRule(/'([^']*)'/, function (lexeme, str) {
    this.reject = !inComponent || inStyleComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['STRING'].concat(formatToken('"' + str + '"'));
  });

  lexer.addRule(/=/, function (lexeme) {
    this.reject = !inComponent || inStyleComponent;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['PARAM_SEPARATOR'];
  });

  lexer.addRule(/\s*$/, function (lexeme) {
    this.reject = !outer;
    if (this.reject) return;
    updatePosition(lexeme);
    return ['EOF'];
  });

  return function (str) {
    currentInput = str;
    var vals = [];
    var output = [];
    var positions = [];

    lexer.input = str.trim();
    var token = lexer.lex();
    while (token) {
      output.push(token);
      positions.push([row, column]);
      token = lexer.lex();
    }
    return {
      tokens: output,
      positions: positions
    };
  };
};

module.exports = lex;