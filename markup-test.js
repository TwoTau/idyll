const Lexer = require('./src/lexer');
const compile = require('./src');

function print(input) {
    let lex = Lexer();
    let results = lex(input);
    let compiled = compile(input, { async: false });

    console.log(results.tokens.join(' '));
    console.dir(compiled, { depth: null });
}

// Style
print('[:tcolor(1):bg(#fa0) content with spaces]')
print('[:bold important! [:red very important!]] [:small unimportant]')
print('[:style1:style2:style3:style4:style5 chaining styles]')
print('{style style="tcolor(1)"}verbose style syntax{/style}')

// Components
print('{sampler list={[1,2,3]} delay=2000 loop=true random=false /}');
print('{component foo=d bar={beque - 1+2 * 3} /}')
print('{title}Fast \& Accurate Gaussian Kernel Density Estimation{/title}')
print('{shorthand_component: very concise content}')

// Math
print('before $$test with $ inside $$ outside \\$123');
print('{equation}SA = 2 * \\tau r^2{/equation}');

// New md extensions
print('log ~2.0~ (256) = 2 ^3.0^')
print('this should be ~~crossed out~~')

// Don't work yet:
// print('escape \[ escaped! \]')