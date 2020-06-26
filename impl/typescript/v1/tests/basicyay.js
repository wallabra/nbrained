const nbrained = require('..')

let brain = new nbrained.Environment.Brain({ x: 25, y: 8 })

let entity = brain.makeEntity({
    tick: (entity, power, brain) => {
        //entity.set(brain, 'input', [-2, Math.random(), 1, Math.random(), 1, 1, -Math.random(), 2, -1])
        let yay = entity.get(brain, 'yay').reduce((a, b) => a + b, 0)
        console.log('Yay value:', yay)
        entity.reward(yay)
    }
})

let inputLobe = brain.lobeMakeSized('input', { x: 1, y: 2 }, { x: 3, y: 3 })
let yesLobe = brain.lobeMakeSized('yes', { x: 0, y: 5 }, { x: 2, y: 3 })
let yayLobe = brain.lobeMakeSized('yay', { x: 8, y: 2 }, { x: 1, y: 4 })

let dendrites = new nbrained.Common.DendriteMesh(25, 8)

for (let i = 0; i < 5000; i++) {
    let gene = nbrained.Genetics.random(dendrites)
    
    //console.log(`Added gene: ${gene.type} ${JSON.stringify(gene.data)}`)
    dendrites = dendrites.mutate([gene])
}

console.log('Result has', dendrites.dendrites.size, 'dendrites.')

function doATick(i, power) {
    console.clear();
    console.log(`[Tick #${i}]`)

    inputLobe.set(entity.neurons, [2, Math.random(), 1, Math.random(), 1, 1, Math.random(), 2, 1])
    yesLobe.set(entity.neurons, [ 1, 1, 1, 1, 1, 1 ])

    brain.tick(dendrites, power, 0.9)

    console.log('Score:', entity.score)

    let mat = entity.neurons.matrixLines()

    console.log('+=====\n' + mat.join('\n') + '\n+=====\n')
}

intv = 0.08;

for (let i = 1; i <= 500; i++)
    setTimeout(() => doATick(i, intv), intv * 1000 * i)
