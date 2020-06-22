import * as Common from './common';



type Data = { [key: string]: any };

export type FnBorn = (data: Data, brain: Common.DendriteMesh) => boolean;
export type FnRand = (brain: Common.DendriteMesh) => Data | null;

export interface Type {
    typename: string,
    born: FnBorn,
    rand: FnRand,
}

export interface Gene {
    data: Data;
    type: string;
}

export const GeneTypes: Map<string, Type> = new Map();

export function makeType(name: string, born: FnBorn, rand: FnRand): Type {
    let res = {
        typename: name,
        born: born,
        rand: rand
    };

    GeneTypes.set(name, res);
    return res;
}

export function apply(gene: Gene, target: Common.DendriteMesh): boolean {
    return GeneTypes.get(gene.type).born(gene.data, target);
}

function assert(bool: boolean, desc: string) {
    if (!bool)
        throw new Error("Assertion failed: " + desc);
}

export function random(brain: Common.DendriteMesh, type?: string): Gene {
    let gdata = null;
    let gtype = null;

    let origTries; let tries = origTries = 50;
    let newType = type;

    while (gdata == null) {
        if (tries-- <= 0) {
            throw new Error(`Random gene generation failed ${origTries} times! Aborting.`);
        }

        if (!type) newType = Array.from(GeneTypes.keys())[Math.floor(GeneTypes.size * Math.random())];

        gtype = GeneTypes.get(newType);
        gdata = gtype.rand(brain);
    }

    assert(gtype != null, 'gtype != null');

    return {
        data: gdata,
        type: newType
    };
}


//=== Gene Type Definitions ===//


makeType('weight',
    (data: Data, brain: Common.DendriteMesh) => {
        if (!brain.dendrites.has(data.which))
            return false;
        
        brain.dendrites.get(data.which).weight += data.offset;
        return true;
    },

    (brain: Common.DendriteMesh) => {
        let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];
        if (!dend) return null;

        return {
            which: dend,
            weight: Common.Random.weightOffset()
        };
    }
);

makeType('new',
    (data: Data, brain: Common.DendriteMesh) => {
        if (brain.dendrites.has(data.id))
            return false;
        
        brain.makeDendrite(data.source, data.dest, data.weight, data.id);
        return true;
    },

    (brain: Common.DendriteMesh) => {
        let id;

        while (!id || brain.dendrites.has(id)) id = Common.Random.id(20);

        return {
            id: id,
            source: brain.randomCoords(),
            dest: brain.randomCoords(),
            weight: Common.Random.weight()
        };
    }
);

makeType('delete',
    (data: Data, brain: Common.DendriteMesh) => {
        if (!brain.dendrites.has(data.which))
            return false;
        
        brain.removeDendrite(data.which);
        return true;
    },

    (brain: Common.DendriteMesh) => {
        let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];
        if (!dend) return null;

        return {
            which: dend
        };
    }
);


makeType('split',
    (data: Data, brain: Common.DendriteMesh) => {
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
    },

    (brain: Common.DendriteMesh) => {
        let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];
        if (!dend) return null;

        return {
            id: dend,
            middle: brain.randomCoords(),
            pivot: Common.Random.weightOffset()
        };
    }
);

makeType('shift',
    (data: Data, brain: Common.DendriteMesh) => {
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
    },

    (brain: Common.DendriteMesh) => {
        let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];
        if (!dend) return null;

        return {
            id: dend,
            offset: Common.Random.posOffset(3),
            only: ['source', 'dest', null][Math.floor(3 * Math.random())]
        };
    }
);