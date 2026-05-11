import treeify from 'treeify';

const testObj = {
  apples: 'gala',    
  oranges: 'mandarin'
}

const asTree = treeify.asTree(testObj, true)

const lines = []
const asLines = treeify.asLines(testObj, true, (line) => {lines.push(line)})

//const asLines1 = treeify.asLines(testObj, () => {})
//const asLines2 = treeify.asLines(testObj, true, () => {})


console.log(asTree)
console.log(asLines)

console.log(lines)
debugger
