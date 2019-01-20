/**
 * 根据配置文件生成代码
 * 1. 获取配置项
 * 2. 根据配置项找到component和目标模板
 * 3. 分析component，产出ast节点
 * 4. 分析目标模板，将component产出节点插入
 */
const fs = require('fs')
const babel = require('@babel/core')
const traverse = require('@babel/traverse').default
const t = require('@babel/types')
const g = require('@babel/generator').default

const config = require('./config')
const { type, opt, children } = config

function generatorAst(src) {
    const sourceCode = fs.readFileSync(src)
    // 获取目标模板
    const ast = babel.parse(sourceCode, {
        parserOpts: {
            sourceType: 'module',
            plugins: [
                'classProperties',
                'jsx',
            ]
        }
    })
    return ast
}
const ast = generatorAst(`./src/${type}.jsx`)
// fs.writeFileSync('./ast.json', JSON.stringify(ast))

// 根据children获取component
let componentAst = []
children.forEach(item => {
    componentAst.push(generatorAst(`./src/component/${item.name}.jsx`))
})

componentAst.forEach((item, index) => {
    children[index].props = []
    traverse(item, {
        Identifier: function (path) {
            if (path.node.name === 'defaultProps') {
                const expression = path.findParent((path) => path.key === 'expression');
                expression.node.right.properties.forEach(item => {
                    children[index].props.push(item.key.name)
                })
            }
        }
    });
})

/**
 * 向模板中插入component
 * 1. import 
 * 2. class 与 export
 * 3. const 结构语句
 * 4. render中return的div中插入component以及属性
 */
traverse(ast, {
    ImportDeclaration: function (path) {
        const tc = path.node.trailingComments
        if (tc && tc[0].value === 'import') {
            path.insertAfter(t.expressionStatement(t.stringLiteral("A little high, little low.")));
        }
    }
})
const out = g(ast, {
    retainLines: true,
    compact: false,
    concise: false,
    quotes: "double",
})
fs.writeFileSync('./output.js', JSON.stringify(out.code))