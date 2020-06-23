"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Brain = exports.Entity = void 0;
const Common = require("./common");
class Entity {
    constructor(callbacks, brain, neurons) {
        this.callbacks = callbacks;
        this.brain = brain;
        this.score = 0;
        this.neurons = neurons || new Common.NeuronBoard(brain.size.x, brain.size.y);
    }
    reward(amount) {
        this.score += amount;
        this.brain.reward(amount);
    }
    tick(dendrites, brain, power, fade) {
        dendrites.compute(this.neurons, power);
        this.callbacks.tick(this, power, brain);
        if (fade)
            this.neurons.amplifyAll(Math.pow(fade, power));
    }
    lobeGet(brain, name) {
        if (!brain.lobes.has(name))
            throw new Error(`Tried to retrieve missing lobe '${name}' from Entity's Brain!`);
        return new Brain.Lobe.Reference(brain.lobes.get(name), this);
    }
    lobeAdd(brain, name, lobe) {
        if (brain.lobes.has(name))
            throw new Error(`Tried to register already existing lobe '${name}' into Entity's Brain!`);
        brain.lobes.set(name, lobe);
        return new Brain.Lobe.Reference(lobe, this);
    }
    get(brain, name) {
        return this.lobeGet(brain, name).get();
    }
    set(brain, name, values) {
        this.lobeGet(brain, name).set(values);
    }
}
exports.Entity = Entity;
class Brain {
    constructor(size) {
        this.size = size;
        this.entities = new Set();
        this.lobes = new Map();
        this.score = 0;
    }
    reward(amount) {
        this.score += amount;
    }
    tick(dendrites, power, fade) {
        if (!power)
            power = 1.0;
        this.entities.forEach((ent) => {
            ent.tick(dendrites, this, power, fade);
        });
    }
    makeEntity(callbacks) {
        let neurons = new Common.NeuronBoard(this.size.x, this.size.y);
        let entity = new Entity(callbacks, this);
        this.entities.add(entity);
        return entity;
    }
    lobeAdd(name, lobe) {
        if (this.lobes.has(name))
            throw new Error(`Tried to register already existing lobe '${name}' into Brain!`);
        this.lobes.set(name, lobe);
    }
    lobeGet(name) {
        if (!this.lobes.has(name))
            throw new Error(`Tried to retrieve missing lobe '${name}' from Brain!`);
        return this.lobes.get(name);
    }
    lobeMake(name, from, to) {
        let lobe = new Brain.Lobe(this.size, from, to);
        this.lobeAdd(name, lobe);
        return lobe;
    }
    lobeMakeSized(name, from, size) {
        let to = {
            x: from.x + size.x,
            y: from.y + size.y,
        };
        return this.lobeMake(name, from, size);
    }
}
exports.Brain = Brain;
(function (Brain) {
    class Lobe {
        constructor(compatSize, from, to) {
            this.from = from;
            this.to = to;
            this.fixBounds(compatSize);
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
        warnClamp(which, compat, coord) {
            let { x: ox, y: oy } = coord;
            let cnew = Common.CoordXY.clamp(compat, coord);
            if (cnew.x != ox || cnew.y != oy)
                console.warn(`Clamped ${which} coordinates from ${ox},${oy} to ${cnew.x},${cnew.y}`);
        }
        fixBounds(compat) {
            if (compat) {
                this.warnClamp('from', compat, this.from);
                this.warnClamp('to', compat, this.to);
            }
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
    Brain.Lobe = Lobe;
    (function (Lobe) {
        class Reference {
            constructor(lobe, entity) {
                this.lobe = lobe;
                this.entity = entity;
            }
            get() {
                return this.lobe.get(this.entity.neurons);
            }
            set(values) {
                return this.lobe.set(this.entity.neurons, values);
            }
        }
        Lobe.Reference = Reference;
    })(Lobe = Brain.Lobe || (Brain.Lobe = {}));
})(Brain = exports.Brain || (exports.Brain = {}));
//# sourceMappingURL=enviro.js.map