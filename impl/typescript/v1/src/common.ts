import * as Genetics from './genetics';



export class NeuronBoard {
    protected neurons: number[];
    public area: number;

    constructor(public width: number, public height: number) {
        let area = this.area = width * height;
        this.neurons = [];
    }

    index(x: number, y: number) {
        return y * this.width + x;
    }

    set(x: number, y: number, val: number) {
        let i = this.index(x, y);

        this.neurons[i] = val;

        if (this.neurons[i] < 0)
            this.neurons[i] = 0;
    }

    get(x: number, y: number) {
        let i = this.index(x, y);

        if (!this.neurons[i]) return this.neurons[i] = 0;

        return this.neurons[i];
    }

    amplifyAll(much: number) {
        this.neurons.forEach((v, i) => {
            if (v) this.neurons[i] *= much;
        })
    }

    add(x: number, y: number, val: number) {
        let i = this.index(x, y);

        if (!this.neurons[i])
            this.neurons[i] = val;

        else
            this.neurons[i] = this.neurons[i] + val;

        if (this.neurons[i] < 0)
            this.neurons[i] = 0;
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

    matrixLines(chars: string = '_,. \'^+') {
        let targMax = chars.length - 1;

        if (this.neurons.length === 0) return []; // uninitialized... dangerous!

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
            ch = this.changes.set(key, { pos: { x: x, y: y }, val: val }).get(key);
    }

    commit(to: NeuronBoard) {
        this.changes.forEach((ch) => {
            if (ch.val) {
                to.add(ch.pos.x, ch.pos.y, ch.val);
            }
        })
    }
}

export class Dendrite {
    public weight: number;

    constructor(public id: string, public source: CoordXY, public dest: CoordXY, weight: number) {
        this.weight = weight;
        if (this.weight == null) this.weight = Random.weight();
    }

    compute(neurons: NeuronBoard, changes: ChangeBuffer, power: number) {
        let val = neurons.get(this.source.x, this.source.y);

        if (!isNaN(val) && val > 0)
            changes.add(this.dest.x, this.dest.y, val * power * this.weight);
    }

    clone(): Dendrite {
        return new Dendrite(this.id, this.source, this.dest, this.weight)
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
        return Array.from({ length: size || 12 }, () => {
            let s = Math.floor(Math.random() * 256).toString(16);

            while (s.length < 2) s = '0' + s;

            return s;
        }).join('');
    }

    export function weight(): number {
        return Math.random() * 1.5 - 0.5;
    }

    export function weightOffset(): number {
        return Math.random() * 1.5 - 0.75;
    }
}

export class DendriteMesh {
    public dendrites: Map<string, Dendrite> = new Map();
    public origin?: DendriteMesh.Origin = null;

    constructor(public minWidth: number, public minHeight: number) {
        // property initializing constructor
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

    mutate(genes: Genetics.Gene[]): DendriteMesh {
        let res = this.derive();

        genes.forEach((gene, ind) => {
            if (!Genetics.apply(gene, res))
                throw new Error(`Dendrite mesh incompatible with <${gene.type}> gene in index #${ind} of list passed to DendriteSet.mutate`);
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
            throw new Error(`Neuron board passed too small for this dendrite mesh, in at least one dimension; expected at least ${this.minWidth}x${this.minHeight}, got ${neurons.width}x${neurons.height}`);

        let changes = new ChangeBuffer();

        this.dendrites.forEach((dend) => {
            dend.compute(neurons, changes, power);
        });

        changes.commit(neurons);
    }
}

export namespace DendriteMesh {
    export interface Origin {
        from: DendriteMesh,
        genes: Genetics.Gene[]
    }
}
