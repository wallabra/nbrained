"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DendriteMesh = exports.Random = exports.Dendrite = exports.CoordXY = exports.NeuronBoard = void 0;
const Genetics = require("./genetics");
class NeuronBoard {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        let area = this.area = width * height;
        this.neurons = [];
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
        if (!this.neurons[i])
            return this.neurons[i] = 0;
        return this.neurons[i];
    }
    amplifyAll(much) {
        this.neurons.forEach((v, i) => {
            if (v)
                this.neurons[i] *= much;
        });
    }
    add(x, y, val) {
        let i = this.index(x, y);
        if (!this.neurons[i])
            this.neurons[i] = val;
        else
            this.neurons[i] = this.neurons[i] + val;
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
    matrixLines(chars = '_,. \'^+') {
        let targMax = chars.length - 1;
        if (this.neurons.length === 0)
            return [];
        let srcMax = this.neurons.reduce((a, b) => Math.max(a, b), -Infinity);
        let srcMin = this.neurons.reduce((a, b) => Math.min(a, b), +Infinity);
        let srcSiz = srcMax - srcMin;
        let srcMaxPos = Math.max(0, srcMax);
        let srcMinPos = Math.max(0, srcMin);
        let srcSizPos = srcMaxPos - srcMinPos;
        let srcMaxNeg = Math.min(0, srcMax);
        let srcMinNeg = Math.min(0, srcMin);
        let srcSizNeg = srcMaxNeg - srcMinNeg;
        let lines = [];
        for (let y = 0; y < this.height; y++) {
            let l = '';
            for (let x = 0; x < this.width; x++) {
                let power = this.get(x, y);
                let targ;
                if (power >= 0)
                    targ = Math.round(targMax / 2 + targMax / 2 * (power - srcMinPos) / srcSizPos);
                else
                    targ = Math.round(targMax / 2 * (power - srcMinNeg) / srcSizNeg);
                l += chars[targ];
            }
            lines.push(l);
            l = '';
        }
        return lines;
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
            ch = this.changes.set(key, { pos: { x: x, y: y }, val: val }).get(key);
    }
    commit(to) {
        this.changes.forEach((ch) => {
            if (ch.val) {
                to.add(ch.pos.x, ch.pos.y, ch.val);
            }
        });
    }
}
class Dendrite {
    constructor(id, source, dest, weight) {
        this.id = id;
        this.source = source;
        this.dest = dest;
        this.weight = weight;
        if (this.weight == null)
            this.weight = Random.weight();
    }
    compute(neurons, changes, power) {
        let val = neurons.get(this.source.x, this.source.y);
        if (val && !isNaN(val))
            changes.add(this.dest.x, this.dest.y, val * power * this.weight);
    }
    clone() {
        return new Dendrite(this.id, this.source, this.dest, this.weight);
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
        return Array.from({ length: size || 12 }, () => {
            let s = Math.floor(Math.random() * 256).toString(16);
            while (s.length < 2)
                s = '0' + s;
            return s;
        }).join('');
    }
    Random.id = id;
    function weight() {
        return Math.random() * 1.5 - 0.5;
    }
    Random.weight = weight;
    function weightOffset() {
        return Math.random() * 1.5 - 0.75;
    }
    Random.weightOffset = weightOffset;
})(Random = exports.Random || (exports.Random = {}));
class DendriteMesh {
    constructor(minWidth, minHeight) {
        this.minWidth = minWidth;
        this.minHeight = minHeight;
        this.dendrites = new Map();
        this.origin = null;
    }
    derive() {
        let res = new DendriteMesh(this.minWidth, this.minHeight);
        if (!this.origin)
            res.origin = { from: this, genes: [] };
        else
            res.origin = { from: this.origin.from, genes: Array.from(this.origin.genes) };
        this.dendrites.forEach((dend, key) => {
            res.dendrites.set(key, dend.clone());
        });
        return res;
    }
    mutate(genes) {
        let res = this.derive();
        genes.forEach((gene, ind) => {
            if (!Genetics.apply(gene, res))
                throw new Error(`Dendrite mesh incompatible with <${gene.type}> gene in index #${ind} of list passed to DendriteSet.mutate`);
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
            throw new Error(`Neuron board passed too small for this dendrite mesh, in at least one dimension; expected at least ${this.minWidth}x${this.minHeight}, got ${neurons.width}x${neurons.height}`);
        let changes = new ChangeBuffer();
        this.dendrites.forEach((dend) => {
            dend.compute(neurons, changes, power);
        });
        changes.commit(neurons);
    }
}
exports.DendriteMesh = DendriteMesh;
//# sourceMappingURL=common.js.map