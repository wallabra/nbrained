export namespace Common {
    export function randomWeight() {
        return Math.random() * 1.5 - 0.5;
    }

    export class NeuronBoard {
        protected neurons: number[];
        public area: number;

        constructor(public width: number, public height: number) {
            let area = this.area = width * height;
            this.neurons = Array.from({ length: area }, () => 0);
        }

        index(x: number, y: number) {
            return y * this.width + x;
        }

        set(x: number, y: number, val: number) {
            let i = this.index(x, y);

            this.neurons[i] = val;
        }

        get(x: number, y: number) {
            let i = this.index(x, y);

            return this.neurons[i];
        }

        add(x: number, y: number, val: number) {
            let i = this.index(x, y);

            this.neurons[i] += val;
        }

        clampCoords(coords: NeuronPos) {
            if (coords.x < 0) coords.x = 0;
            if (coords.y < 0) coords.y = 0;

            if (coords.x >= this.width)
                coords.x = this.width - 1;
            
            if (coords.y >= this.height)
                coords.y = this.height - 1;

            return coords;
        }
    }

    export interface NeuronPos {
        x: number,
        y: number
    }

    interface Change {
        pos: NeuronPos
        val: number,
    }

    class ChangeBuffer {
        protected changes: Map<string, Change> = new Map();
        
        keyFor(x: number, y: number) {
            return `${x},${y}`;
        }

        add(x: number, y: number, val: number) {
            let key = this.keyFor(x, y);
            
            let ch = this.changes.get(key);

            if (ch)
                ch.val += val; // Map values are mutable
            
            else
                this.changes.set(key, { pos: { x: x, y: y }, val: val });
        }

        commit(to: NeuronBoard) {
            this.changes.forEach((val) => {
                to.add(val.pos.x, val.pos.y, val.val);
            })
        }
    }

    export class Dendrite {
        public weight: number;

        constructor(public id: string, public source: NeuronPos, public dest: NeuronPos, weight: number) {
            this.weight = (weight != null) ? weight : Math.random(); // (a == null) == (a === null || a === undefined)
        }

        compute(neurons: NeuronBoard, changes: ChangeBuffer, power: number) {
            changes.add(this.dest.x, this.dest.y, neurons.get(this.source.x, this.source.y) * power * this.weight);
        }
    }

    export class DendriteSet {
        public dendrites: Map<string, Dendrite> = new Map();
        public origin?: DendriteSet.Origin = null;
    
        constructor(public minWidth: number, public minHeight: number) {
            // property initializing constructor
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
    
        mutate(genes: Genetics.Gene[]): DendriteSet {
            let res = this.derive();
    
            genes.forEach((gene, ind) => {
                if (!Genetics.apply(gene, res))
                    throw new Error(`Dendrite set incompatible with ${gene.type} gene in index #${ind} of list passed to DendriteSet.mutate`);
            });
                
            return res;
        }
    
        makeDendriteId(size?: number) {
            return Array({ length: size || 12 }, () => {
                let s = Math.floor(Math.random() * 256).toString(16);
    
                while (s.length < 2) s = '0' + s;
    
                return s;
            }).join('');
        }
    
        makeDendrite(source: NeuronPos, dest: NeuronPos, weight?: number, id?: string) {
            if (weight == null) weight = randomWeight();
            if (id == null) id = this.makeDendriteId();
    
            let dend = new Dendrite(id, source, dest, weight);
            this.dendrites.set(id, dend);
    
            return dend;
        }
    
        removeDendrite(id: string) {
            this.dendrites.delete(id);
        }
    
        clampCoords(coords: NeuronPos) {
            if (coords.x < 0) coords.x = 0;
            if (coords.y < 0) coords.y = 0;
    
            if (coords.x >= this.minWidth)
                coords.x = this.minWidth - 1;
            
            if (coords.y >= this.minHeight)
                coords.y = this.minHeight - 1;
    
            return coords;
        }
    
        compute(neurons: NeuronBoard, power: number) {
            if (neurons.width < this.minWidth || neurons.height < this.minHeight)
                throw new Error(`Neuron board passed too small for this dendrite set, in at least one dimension; expected at least ${this.minWidth}x${this.minHeight}, got ${neurons.width}x${neurons.height}`);
    
            let changes = new ChangeBuffer();
    
            this.dendrites.forEach((dend) => {
                dend.compute(neurons, changes, power);
            });
    
            changes.commit(neurons);
        }
    }
    
    export namespace DendriteSet {
        export interface Origin {
            from: DendriteSet,
            genes: Genetics.Gene[]
        }
    }
}

export namespace Genetics {
    type Data = { [key: string]: any };

    export interface Gene {
        data: Data;
        type: string;
    }

    export type GeneType = (data: Data, brain: Common.DendriteSet) => boolean;

    export const geneTypes: Map<string, GeneType> = new Map();

    export function apply(gene: Gene, target: Common.DendriteSet): boolean {
        return geneTypes.get(gene.type)(gene.data, target);
    }

    geneTypes.set('weight', (data: Data, brain: Common.DendriteSet) => {
        if (!brain.dendrites.has(data.which))
            return false;
        
        brain.dendrites.get(data.which).weight += data.offset;
        return true;
    });

    geneTypes.set('new', (data: Data, brain: Common.DendriteSet) => {
        if (brain.dendrites.has(data.id))
            return false;
        
        brain.makeDendrite(data.source, data.dest, data.weight, data.id);
        return true;
    });

    geneTypes.set('delete', (data: Data, brain: Common.DendriteSet) => {
        if (!brain.dendrites.has(data.id))
            return false;
        
        brain.removeDendrite(data.which);
        return true;
    });


    geneTypes.set('split', (data: Data, brain: Common.DendriteSet) => {
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

    geneTypes.set('shift', (data: Data, brain: Common.DendriteSet) => {
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
        
        // remake the dendrite entirely,
        // preventing bugs via immutability
        brain.removeDendrite(data.id);
        brain.makeDendrite(src, dst, w, data.id);

        return true;
    });
}

export namespace Environment {
    export interface AgentCallbacks {
        tick: (brain: Agent.Brain, power: number) => void;
    }

    export class Agent {
        constructor(public brain: Agent.Brain, private callbacks: AgentCallbacks) {
            // property initializing constructor
        }

        tick(dendrites: Common.DendriteSet, power: number) {
            dendrites.compute(this.brain.neurons, power);
            this.callbacks.tick(this.brain, power);
        }
    }

    export namespace Agent {
        export class Lobe {
            public width: number;
            public height: number;
            public area: number;

            constructor(compat: Common.DendriteSet, public from: Common.NeuronPos, public to: Common.NeuronPos) {
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

        export class LobeRef {
            constructor(public lobe: Lobe, public neurons: Common.NeuronBoard) {}

            get(): number[] {
                return this.lobe.get(this.neurons);
            }

            set(values: number[]) {
                return this.lobe.set(this.neurons, values);
            }
        }

        export class Brain {
            public neurons: Common.NeuronBoard;
            public lobes: Map<string, Lobe> = new Map();

            constructor(public size: Common.NeuronPos) {
                this.neurons = new Common.NeuronBoard(size.x, size.y);
            }

            lobe(name: string): LobeRef {
                if (!this.lobes.has(name))
                    throw new Error(`Tried to retrieve missing lobe '${name}' from Brain!`);

                return new LobeRef(this.lobes.get(name), this.neurons);
            }

            register(name: string, lobe: Lobe): LobeRef {
                if (this.lobes.has(name))
                    throw new Error(`Tried to register already existing lobe '${name}' into Brain!`);

                this.lobes.set(name, lobe);
                    
                return new LobeRef(lobe, this.neurons);
            }
        }
    }
}
