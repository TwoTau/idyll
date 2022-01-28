const Lexer = require('./src/lexer');
const compile = require('./src');

function print(input) {
    let lex = Lexer();
    let results = lex(input);
    let compiled = compile(input, { async: false });

    console.log(results.tokens.join(' '));
    console.dir(compiled, { depth: null });
    // console.log(JSON.stringify(compiled, null, 2));
}

print('Hello {VarDisplay var=v work="yes" /}');
// print('{noindent /} hello!');
// print('{Equation}test{/Equation}');
// print('{title:Title test /}'); // doesn't work
// print('shorthand {component:content /}'); // doesn't work
// print('before $$test with $ inside $$ outside \\$123');
// print('{Cd x:0}y = 0{/Cd}');
// print('{title}Fast \& Accurate Gaussian Kernel Density Estimation{/title}');