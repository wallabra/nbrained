console.log('(Importing nbrained...)')
const nbrained = require('..')


console.log('(Making gym...)')
let gym = new nbrained.Evolver.Gym(
    (compet) => {
        let brain = compet.brain

        brain.lobeMakeSized('input', { x: 1, y: 2 }, { x: 3, y: 3 })
        brain.lobeMakeSized('yes', { x: 0, y: 5 }, { x: 2, y: 3 })
        brain.lobeMakeSized('yay', { x: 8, y: 2 }, { x: 1, y: 4 })

        compet.initEntities(40)
    },
    {
        tick: (entity, power, brain) => {
            entity.set(brain, 'input', Array(9).fill(0).map(() => Math.random()))
            entity.set(brain, 'yes', Array(5).fill(1))

            let yay = entity.get(brain, 'yay').reduce((a, b) => a + b, 0)
            entity.reward(yay)
        }
    }
)

gym.configure({
    bootstrap: 400
})

console.log('(Populating gym...)')
let favorite = gym.makeManyFirstFavorite(30, { x: 25, y: 8 })
let entity = Array.from(favorite.brain.entities)[0]
let brain = favorite.brain

function doATick(ei, i, power) {
    gym.tick(power, 0.9)

    console.clear()
    console.log(`[Epoch #${ei} - Tick #${i}]`)

    let yay = entity.get(brain, 'yay').reduce((a, b) => a + b, 0)
    console.log('Score:', entity.score)
    console.log('Yay value:', yay)

    let mat = entity.neurons.matrixLines()
    console.log('+=====\n' + mat.join('\n') + '\n+=====\n')
}

console.log('(Starting epoch loop...)')
intv = 1 / 15
epochTicks = 25
epochs = 250

let ei = 1

function doAEpoch(numTicks, ei, power) {
    for (let i = 1; i <= numTicks; i++)
        setTimeout(() => doATick(ei, i, power), intv * 1000 * i)
}

function nextEpoch() {
    doAEpoch    (epochTicks, ei++, intv)
    
    if (ei <= epochs)
        setTimeout(() => {
            gym.epoch()
            nextEpoch()
        }, intv * 1000 * epochTicks)
}

nextEpoch()
