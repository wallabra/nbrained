"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = exports.Genetics = exports.Common = void 0;
var Common;
(function (Common) {
    function randomWeight() {
        return Math.random() * 1.5 - 0.5;
    }
    Common.randomWeight = randomWeight;
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
    Common.NeuronBoard = NeuronBoard;
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
    Common.Dendrite = Dendrite;
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
        makeDendriteId(size) {
            return Array({ length: size || 12 }, () => {
                let s = Math.floor(Math.random() * 256).toString(16);
                while (s.length < 2)
                    s = '0' + s;
                return s;
            }).join('');
        }
        makeDendrite(source, dest, weight, id) {
            if (weight == null)
                weight = randomWeight();
            if (id == null)
                id = this.makeDendriteId();
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
    Common.DendriteSet = DendriteSet;
})(Common = exports.Common || (exports.Common = {}));
var Genetics;
(function (Genetics) {
    Genetics.geneTypes = new Map();
    function apply(gene, target) {
        return Genetics.geneTypes.get(gene.type)(gene.data, target);
    }
    Genetics.apply = apply;
    Genetics.geneTypes.set('weight', (data, brain) => {
        if (!brain.dendrites.has(data.which))
            return false;
        brain.dendrites.get(data.which).weight += data.offset;
        return true;
    });
    Genetics.geneTypes.set('new', (data, brain) => {
        if (brain.dendrites.has(data.id))
            return false;
        brain.makeDendrite(data.source, data.dest, data.weight, data.id);
        return true;
    });
    Genetics.geneTypes.set('delete', (data, brain) => {
        if (!brain.dendrites.has(data.id))
            return false;
        brain.removeDendrite(data.which);
        return true;
    });
    Genetics.geneTypes.set('split', (data, brain) => {
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
    });
    Genetics.geneTypes.set('shift', (data, brain) => {
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
    });
})(Genetics = exports.Genetics || (exports.Genetics = {}));
var Environment;
(function (Environment) {
    class Agent {
        constructor(brain, callbacks) {
            this.brain = brain;
            this.callbacks = callbacks;
        }
        tick(dendrites, power) {
            dendrites.compute(this.brain.neurons, power);
            this.callbacks.tick(this.brain, power);
        }
    }
    Environment.Agent = Agent;
    (function (Agent) {
        class Lobe {
            constructor(compat, from, to) {
                this.from = from;
                this.to = to;
                compat.clampCoords(this.from);
                compat.clampCoords(this.to);
                this.fixBounds();
                this.width = this.to.x - this.from.x + 1;
                this.height = this.to.y - this.from.y + 1;
                this.area = this.width * this.height;
            }
            fixBoundsX() {
                if (this.to.x < this.from.x) {
                    let sw = this.from.x;
                    this.to.x = this.from.x;
                    this.from.x = sw;
                }
            }
            fixBoundsY() {
                if (this.to.y < this.from.y) {
                    let sw = this.from.y;
                    this.to.y = this.from.y;
                    this.from.y = sw;
                }
            }
            fixBounds() {
                this.fixBoundsX();
                this.fixBoundsY();
            }
            get(neurons) {
                let res = [];
                for (let y = this.from.y; y <= this.to.y; y++)
                    for (let x = this.from.x; x <= this.to.x; x++) {
                        res.push(neurons.get(x, y));
                    }
                return res;
            }
            set(neurons, values) {
                if (values.length < this.area)
                    throw new Error(`Insufficient values to set this Lobe to; expected ${this.area}, got ${values.length}`);
                let i = 0;
                for (let y = this.from.y; y <= this.to.y; y++)
                    for (let x = this.from.x; x <= this.to.x; x++) {
                        neurons.set(x, y, values[i++]);
                    }
            }
        }
        Agent.Lobe = Lobe;
        class LobeRef {
            constructor(lobe, neurons) {
                this.lobe = lobe;
                this.neurons = neurons;
            }
            get() {
                return this.lobe.get(this.neurons);
            }
            set(values) {
                return this.lobe.set(this.neurons, values);
            }
        }
        Agent.LobeRef = LobeRef;
        class Brain {
            constructor(size) {
                this.size = size;
                this.lobes = new Map();
                this.neurons = new Common.NeuronBoard(size.x, size.y);
            }
            lobe(name) {
                if (!this.lobes.has(name))
                    throw new Error(`Tried to retrieve missing lobe '${name}' from Brain!`);
                return new LobeRef(this.lobes.get(name), this.neurons);
            }
            register(name, lobe) {
                if (this.lobes.has(name))
                    throw new Error(`Tried to register already existing lobe '${name}' into Brain!`);
                this.lobes.set(name, lobe);
                return new LobeRef(lobe, this.neurons);
            }
        }
        Agent.Brain = Brain;
    })(Agent = Environment.Agent || (Environment.Agent = {}));
})(Environment = exports.Environment || (exports.Environment = {}));
//# sourceMappingURL=index.js.map