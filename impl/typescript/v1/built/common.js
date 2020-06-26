"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DendriteMesh = exports.Random = exports.Dendrite = exports.CoordXY = exports.NeuronBoard = void 0;
const Genetics = __importStar(require("./genetics"));
class NeuronBoard {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        let area = this.area = width * height;
        this.neurons = [];
    }
    clone() {
        let res = new NeuronBoard(this.width, this.height);
        res.neurons.push.apply(res.neurons, this.neurons);
        return res;
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
    function is(obj) {
        return !!(obj.x && obj.y);
    }
    CoordXY.is = is;
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
        if (!isNaN(val) && val > 0)
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
        this.origin = [];
    }
    static breed(a, b) {
        let res = new DendriteMesh(Math.max(a.minWidth, b.minWidth), Math.max(a.minHeight, b.minHeight));
        let genes = Array.from(a.origin || []).concat(b.origin || []);
        if (genes.length)
            res.mutate(genes, false);
        return res;
    }
    clone() {
        let res = new DendriteMesh(this.minWidth, this.minHeight);
        res.origin = Array.from(this.origin);
        this.dendrites.forEach((dend, key) => {
            res.dendrites.set(key, dend.clone());
        });
        return res;
    }
    mutateRandom(numGenes, clone = false) {
        let res;
        if (clone)
            res = this.clone();
        else
            res = this;
        for (let i = 0; i < numGenes; i++) {
            let gene = Genetics.random(res);
            if (Genetics.apply(gene, res))
                res.origin.push(gene);
            else
                throw new Error(`Dendrite mesh incompatible with random <${gene.type}> gene #${i}`);
        }
        return res;
    }
    mutate(genes, clone = false, doThrow = true) {
        let res;
        if (clone)
            res = this.clone();
        else
            res = this;
        genes.forEach((gene, ind) => {
            if (Genetics.apply(gene, res))
                res.origin.push(gene);
            else if (doThrow)
                throw new Error(`Dendrite mesh incompatible with <${gene.type}> gene in index #${ind + 1} of list passed to DendriteSet.mutate`);
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
    assertFitNeurons(neurons) {
        if (neurons.width < this.minWidth || neurons.height < this.minHeight)
            throw new Error(`Neuron board passed too small for this dendrite mesh, in at least one dimension; expected at least ${this.minWidth}x${this.minHeight}, got ${neurons.width}x${neurons.height}`);
    }
    assertFitBrain(brain) {
        if (brain.size.x < this.minWidth || brain.size.y < this.minHeight)
            throw new Error(`Brain passed too small for dendrite mesh, in at least one dimension; expected at least ${this.minWidth}x${this.minHeight}, got ${brain.size.x}x${brain.size.y}`);
    }
    compute(neurons, power) {
        this.assertFitNeurons(neurons);
        let changes = new ChangeBuffer();
        this.dendrites.forEach((dend) => {
            dend.compute(neurons, changes, power);
        });
        changes.commit(neurons);
    }
}
exports.DendriteMesh = DendriteMesh;
//# sourceMappingURL=common.js.map