"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DendriteSet = exports.Random = exports.Dendrite = exports.CoordXY = exports.NeuronBoard = void 0;
const Genetics = require("./genetics");
class NeuronBoard {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        let area = this.area = width * height;
        this.neurons = Array.from({ length: area }, () => 0);
    }
    index(x, y) {
        return y * this.width + x;
    }
    set(x, y, val) {
        let i = this.index(x, y);
        this.neurons[i] = val;
    }
    get(x, y) {
        let i = this.index(x, y);
        return this.neurons[i];
    }
    add(x, y, val) {
        let i = this.index(x, y);
        this.neurons[i] += val;
    }
    clampCoords(coords) {
        if (coords.x < 0)
            coords.x = 0;
        if (coords.y < 0)
            coords.y = 0;
        if (coords.x >= this.width)
            coords.x = this.width - 1;
        if (coords.y >= this.height)
            coords.y = this.height - 1;
        return coords;
    }
}
exports.NeuronBoard = NeuronBoard;
var CoordXY;
(function (CoordXY) {
    function clamp(compat, coords) {
        if (coords.x < 0)
            coords.x = 0;
        if (coords.y < 0)
            coords.y = 0;
        if (coords.x >= compat.x)
            coords.x = compat.x - 1;
        if (coords.y >= compat.y)
            coords.y = compat.y - 1;
        return coords;
    }
    CoordXY.clamp = clamp;
})(CoordXY = exports.CoordXY || (exports.CoordXY = {}));
class ChangeBuffer {
    constructor() {
        this.changes = new Map();
    }
    keyFor(x, y) {
        return `${x},${y}`;
    }
    add(x, y, val) {
        let key = this.keyFor(x, y);
        let ch = this.changes.get(key);
        if (ch)
            ch.val += val;
        else
            this.changes.set(key, { pos: { x: x, y: y }, val: val });
    }
    commit(to) {
        this.changes.forEach((val) => {
            to.add(val.pos.x, val.pos.y, val.val);
        });
    }
}
class Dendrite {
    constructor(id, source, dest, weight) {
        this.id = id;
        this.source = source;
        this.dest = dest;
        this.weight = (weight != null) ? weight : Math.random();
    }
    compute(neurons, changes, power) {
        changes.add(this.dest.x, this.dest.y, neurons.get(this.source.x, this.source.y) * power * this.weight);
    }
}
exports.Dendrite = Dendrite;
var Random;
(function (Random) {
    function posOffset(maxDist) {
        return {
            x: Math.round(Math.random() * maxDist * 2 - maxDist),
            y: Math.round(Math.random() * maxDist * 2 - maxDist),
        };
    }
    Random.posOffset = posOffset;
    function id(size) {
        return Array({ length: size || 12 }, () => {
            let s = Math.floor(Math.random() * 256).toString(16);
            while (s.length < 2)
                s = '0' + s;
            return s;
        }).join('');
    }
    Random.id = id;
    function weight() {
        return Math.pow(Math.random() * 1.5 - 0.5, 1.5);
    }
    Random.weight = weight;
    function weightOffset() {
        return Math.pow(Math.random() * 1.5 - 0.75, 2.5);
    }
    Random.weightOffset = weightOffset;
})(Random = exports.Random || (exports.Random = {}));
class DendriteSet {
    constructor(minWidth, minHeight) {
        this.minWidth = minWidth;
        this.minHeight = minHeight;
        this.dendrites = new Map();
        this.origin = null;
    }
    derive() {
        let res = new DendriteSet(this.minWidth, this.minHeight);
        if (!this.origin)
            res.origin = { from: this, genes: [] };
        else
            res.origin = { from: this.origin.from, genes: Array.from(this.origin.genes) };
        res.dendrites = new Map(this.dendrites);
        return res;
    }
    mutate(genes) {
        let res = this.derive();
        genes.forEach((gene, ind) => {
            if (!Genetics.apply(gene, res))
                throw new Error(`Dendrite set incompatible with ${gene.type} gene in index #${ind} of list passed to DendriteSet.mutate`);
        });
        return res;
    }
    randomCoords() {
        return {
            x: Math.floor(Math.random() * (this.minWidth + 1)),
            y: Math.floor(Math.random() * (this.minHeight + 1)),
        };
    }
    makeDendrite(source, dest, weight, id) {
        if (weight == null)
            weight = Random.weight();
        if (id == null)
            id = Random.id();
        let dend = new Dendrite(id, source, dest, weight);
        this.dendrites.set(id, dend);
        return dend;
    }
    removeDendrite(id) {
        this.dendrites.delete(id);
    }
    clampCoords(coords) {
        if (coords.x < 0)
            coords.x = 0;
        if (coords.y < 0)
            coords.y = 0;
        if (coords.x >= this.minWidth)
            coords.x = this.minWidth - 1;
        if (coords.y >= this.minHeight)
            coords.y = this.minHeight - 1;
        return coords;
    }
    compute(neurons, power) {
        if (neurons.width < this.minWidth || neurons.height < this.minHeight)
            throw new Error(`Neuron board passed too small for this dendrite set, in at least one dimension; expected at least ${this.minWidth}x${this.minHeight}, got ${neurons.width}x${neurons.height}`);
        let changes = new ChangeBuffer();
        this.dendrites.forEach((dend) => {
            dend.compute(neurons, changes, power);
        });
        changes.commit(neurons);
    }
}
exports.DendriteSet = DendriteSet;
//# sourceMappingURL=common.js.map