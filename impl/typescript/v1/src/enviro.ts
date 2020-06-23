import * as Common from './common';



export class Entity {
    public neurons: Common.NeuronBoard;

    public score: number = 0;


    constructor(private callbacks: Entity.Callbacks, public brain: Brain, neurons?: Common.NeuronBoard) {
        this.neurons = neurons || new Common.NeuronBoard(brain.size.x, brain.size.y);
    }

    reward(amount: number) {
        this.score += amount;
        this.brain.reward(amount);
    }
    
    tick(dendrites: Common.DendriteMesh, brain: Brain, power: number, fade?: number) {
        if (fade)
            this.neurons.amplifyAll(Math.pow(fade, power));

        dendrites.compute(this.neurons, power);
        this.callbacks.tick(this, power, brain);
    }

    lobeGet(brain: Brain, name: string): Brain.Lobe.Reference {
        if (!brain.lobes.has(name))
            throw new Error(`Tried to retrieve missing lobe '${name}' from Entity's Brain!`);
        
        return new Brain.Lobe.Reference(brain.lobes.get(name), this);
    }
    
    lobeAdd(brain: Brain, name: string, lobe: Brain.Lobe): Brain.Lobe.Reference {
        if (brain.lobes.has(name))
            throw new Error(`Tried to register already existing lobe '${name}' into Entity's Brain!`);
        
        brain.lobes.set(name, lobe);
        
        return new Brain.Lobe.Reference(lobe, this);
    }

    get(brain: Brain, name: string): number[] {
        return this.lobeGet(brain, name).get();
    }

    set(brain: Brain, name: string, values: number[]) {
        this.lobeGet(brain, name).set(values);
    }
}

export namespace Entity {
    export interface Callbacks {
        tick: (entity: Entity, power: number, brain: Brain) => void;
    }

    export type Initializer = () => Promise<Entity.Callbacks>;
}

/**
 * One single Brain can control several entities,
 * each with their own NeuronBoard instance.
 */
export class Brain {
    public entities: Set<Entity> = new Set();
    public lobes: Map<string, Brain.Lobe> = new Map();

    public score: number = 0;

    
    constructor(public size: Common.CoordXY) {
        // property initializing constructor
    }

    reward(amount: number) {
        this.score += amount;
    }

    tick(dendrites: Common.DendriteMesh, power?: number, fade?: number) {
        if (!power) power = 1.0;

        this.entities.forEach((ent) => {
            ent.tick(dendrites, this, power, fade);
        });
    }
    
    makeEntity(callbacks: Entity.Callbacks): Entity {
        let neurons = new Common.NeuronBoard(this.size.x, this.size.y);

        let entity = new Entity(callbacks, this);
        this.entities.add(entity);

        return entity;
    }

    lobeAdd(name: string, lobe: Brain.Lobe) {
        if (this.lobes.has(name))
            throw new Error(`Tried to register already existing lobe '${name}' into Brain!`);
        
        this.lobes.set(name, lobe);
    }

    lobeGet(name: string): Brain.Lobe {
        if (!this.lobes.has(name))
            throw new Error(`Tried to retrieve missing lobe '${name}' from Brain!`);
        
        return this.lobes.get(name);
    }

    lobeMake(name: string, from: Common.CoordXY, to: Common.CoordXY): Brain.Lobe {
        let lobe = new Brain.Lobe(this.size, from, to);

        this.lobeAdd(name, lobe);
        return lobe;
    }

    lobeMakeSized(name: string, from: Common.CoordXY, size: Common.CoordXY): Brain.Lobe {
        let to = {
            x: from.x + size.x,
            y: from.y + size.y,
        };

        return this.lobeMake(name, from, size);
    }
}

export namespace Brain {
    export class Lobe {
        public width: number;
        public height: number;
        public area: number;
        
        constructor(compatSize: Common.CoordXY, public from: Common.CoordXY, public to: Common.CoordXY) {
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

        warnClamp(which: string, compat: Common.CoordXY, coord: Common.CoordXY) {
            let { x: ox, y: oy } = coord;
            let cnew = Common.CoordXY.clamp(compat, coord);

            if (cnew.x != ox || cnew.y != oy)
                console.warn(`Clamped ${which} coordinates from ${ox},${oy} to ${cnew.x},${cnew.y}`);
        }
        
        fixBounds(compat?: Common.CoordXY) {
            if (compat) {
                this.warnClamp('from', compat, this.from);
                this.warnClamp('to', compat, this.to);
            }
            
            this.fixBoundsX();
            this.fixBoundsY();
        }
        
        get(neurons: Common.NeuronBoard): number[] {
            let res = [];
            
            for (let y = this.from.y; y <= this.to.y; y++) for (let x = this.from.x; x <= this.to.x; x++) {
                res.push(neurons.get(x, y));
            }
            
            return res;
        }
        
        set(neurons: Common.NeuronBoard, values: number[]) {
            if (values.length < this.area)
                throw new Error(`Insufficient values to set this Lobe to; expected ${this.area}, got ${values.length}`);
            
            let i = 0;
            
            for (let y = this.from.y; y <= this.to.y; y++) for (let x = this.from.x; x <= this.to.x; x++) {
                neurons.set(x, y, values[i++]);
            }
        }
    }
    
    export namespace Lobe {
        export class Reference {
            constructor(public lobe: Lobe, public entity: Entity) {}
            
            get(): number[] {
                return this.lobe.get(this.entity.neurons);
            }
            
            set(values: number[]) {
                return this.lobe.set(this.entity.neurons, values);
            }
        }
    }
}
