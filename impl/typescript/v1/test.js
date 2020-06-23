const nbrained = require('.')

let brain = new nbrained.Environment.Brain({ x: 25, y: 8 })

let entity = brain.makeEntity({
    tick: (entity, power, brain) => {
        entity.set(brain, 'input', [-1, 1, 1, 1, 1, 1, -1, 1, 1])
        let yay = entity.get(brain, 'yay').reduce((a, b) => a + b, 0)
        console.log('Yay value:', yay)
        entity.reward(yay)
    }
})

let inputLobe = brain.lobeMakeSized('input', { x: 1, y: 2 }, { x: 3, y: 3 })
let yayLobe = brain.lobeMakeSized('yay', { x: 8, y: 2 }, { x: 1, y: 4 })

let dendrites = new nbrained.Common.DendriteMesh(25, 8)

for (let i = 0; i < 5000; i++) {
    let gene = nbrained.Genetics.random(dendrites)
    
    //console.log(`Added gene: ${gene.type} ${JSON.stringify(gene.data)}`)
    dendrites = dendrites.mutate([gene])
}

console.log('Result has', dendrites.dendrites.size, 'dendrites.')

function doATick(i, power) {
    console.log(`[Tick #${i}]`)

    brain.tick(dendrites, power)

    console.log('Score:', entity.score)
}

intv = 0.25;

for (let i = 1; i <= 50; i++)
    setTimeout(() => doATick(i, intv), intv * 1000 * i)
