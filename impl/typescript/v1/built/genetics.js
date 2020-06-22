"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.random = exports.apply = exports.makeType = exports.GeneTypes = void 0;
const Common = require("./common");
exports.GeneTypes = new Map();
function makeType(name, born, rand) {
    let res = {
        typename: name,
        born: born,
        rand: rand
    };
    exports.GeneTypes.set(name, res);
    return res;
}
exports.makeType = makeType;
function apply(gene, target) {
    return exports.GeneTypes.get(gene.type).born(gene.data, target);
}
exports.apply = apply;
function assert(bool, desc) {
    if (!bool)
        throw new Error("Assertion failed: " + desc);
}
function random(brain, type) {
    let gdata = null;
    let gtype = null;
    let origTries;
    let tries = origTries = 50;
    let newType = type;
    while (gdata == null) {
        if (tries-- <= 0) {
            throw new Error(`Random gene generation failed ${origTries} times! Aborting.`);
        }
        if (!type)
            newType = Array.from(exports.GeneTypes.keys())[Math.floor(exports.GeneTypes.size * Math.random())];
        gtype = exports.GeneTypes.get(newType);
        gdata = gtype.rand(brain);
    }
    assert(gtype != null, 'gtype != null');
    return {
        data: gdata,
        type: newType
    };
}
exports.random = random;
makeType('weight', (data, brain) => {
    if (!brain.dendrites.has(data.which))
        return false;
    brain.dendrites.get(data.which).weight += data.offset;
    return true;
}, (brain) => {
    let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];
    if (!dend)
        return null;
    return {
        which: dend,
        weight: Common.Random.weightOffset()
    };
});
makeType('new', (data, brain) => {
    if (brain.dendrites.has(data.id))
        return false;
    brain.makeDendrite(data.source, data.dest, data.weight, data.id);
    return true;
}, (brain) => {
    let id;
    while (!id || brain.dendrites.has(id))
        id = Common.Random.id(20);
    return {
        id: id,
        source: brain.randomCoords(),
        dest: brain.randomCoords(),
        weight: Common.Random.weight()
    };
});
makeType('delete', (data, brain) => {
    if (!brain.dendrites.has(data.which))
        return false;
    brain.removeDendrite(data.which);
    return true;
}, (brain) => {
    let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];
    if (!dend)
        return null;
    return {
        which: dend
    };
});
makeType('split', (data, brain) => {
    if (!brain.dendrites.has(data.id))
        return false;
    let dend = brain.dendrites.get(data.id);
    let src = dend.source;
    let dst = dend.dest;
    let w = dend.weight;
    let wroot = Math.sqrt(w);
    let w1 = data.pivot;
    let w2 = w / data.pivot;
    brain.removeDendrite(data.id);
    brain.makeDendrite(src, data.middle, w1);
    brain.makeDendrite(data.middle, dst, w2);
    return true;
}, (brain) => {
    let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];
    if (!dend)
        return null;
    return {
        id: dend,
        middle: brain.randomCoords(),
        pivot: Common.Random.weightOffset()
    };
});
makeType('shift', (data, brain) => {
    if (!brain.dendrites.has(data.id))
        return false;
    let dend = brain.dendrites.get(data.id);
    let src = dend.source;
    let dst = dend.dest;
    let w = dend.weight;
    if (data.only === 'source')
        src = brain.clampCoords({ x: src.x + data.offset.x, y: dst.y + data.offset.y });
    if (data.only === 'dest')
        dst = brain.clampCoords({ x: dst.x + data.offset.x, y: dst.y + data.offset.y });
    brain.removeDendrite(data.id);
    brain.makeDendrite(src, dst, w, data.id);
    return true;
}, (brain) => {
    let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];
    if (!dend)
        return null;
    return {
        id: dend,
        offset: Common.Random.posOffset(3),
        only: ['source', 'dest', null][Math.floor(3 * Math.random())]
    };
});
//# sourceMappingURL=genetics.js.map