import * as Genetics from './genetics';



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

    clampCoords(coords: CoordXY) {
        if (coords.x < 0) coords.x = 0;
        if (coords.y < 0) coords.y = 0;

        if (coords.x >= this.width)
            coords.x = this.width - 1;
        
        if (coords.y >= this.height)
            coords.y = this.height - 1;

        return coords;
    }
}

export interface CoordXY {
    x: number,
    y: number
}

export namespace CoordXY {
    export function clamp(compat: CoordXY, coords: CoordXY) {
        if (coords.x < 0) coords.x = 0;
        if (coords.y < 0) coords.y = 0;

        if (coords.x >= compat.x)
            coords.x = compat.x - 1;
        
        if (coords.y >= compat.y)
            coords.y = compat.y - 1;

        return coords;
    }
}

interface Change {
    pos: CoordXY
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

    constructor(public id: string, public source: CoordXY, public dest: CoordXY, weight: number) {
        this.weight = (weight != null) ? weight : Math.random(); // (a == null) == (a === null || a === undefined)
    }

    compute(neurons: NeuronBoard, changes: ChangeBuffer, power: number) {
        changes.add(this.dest.x, this.dest.y, neurons.get(this.source.x, this.source.y) * power * this.weight);
    }
}

export namespace Random {
    export function posOffset(maxDist: number) {
        return {
            x: Math.round(Math.random() * maxDist * 2 - maxDist),
            y: Math.round(Math.random() * maxDist * 2 - maxDist),
        }
    }

    export function id(size?: number): string {
        return Array({ length: size || 12 }, () => {
            let s = Math.floor(Math.random() * 256).toString(16);

            while (s.length < 2) s = '0' + s;

            return s;
        }).join('');
    }

    export function weight(): number {
        return Math.pow(Math.random() * 1.5 - 0.5, 1.5);
    }

    export function weightOffset(): number {
        return Math.pow(Math.random() * 1.5 - 0.75, 2.5);
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

    randomCoords(): CoordXY {
        return {
            x: Math.floor(Math.random() * (this.minWidth + 1)),
            y: Math.floor(Math.random() * (this.minHeight + 1)),
        };
    }

    makeDendrite(source: CoordXY, dest: CoordXY, weight?: number, id?: string) {
        if (weight == null) weight = Random.weight();
        if (id == null) id = Random.id();

        let dend = new Dendrite(id, source, dest, weight);
        this.dendrites.set(id, dend);

        return dend;
    }

    removeDendrite(id: string) {
        this.dendrites.delete(id);
    }

    clampCoords(coords: CoordXY) {
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
