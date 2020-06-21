import * as Common from './common';



type Data = { [key: string]: any };

export type FnBorn = (data: Data, brain: Common.DendriteSet) => boolean;
export type FnRand = (brain: Common.DendriteSet) => Data;

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

export function apply(gene: Gene, target: Common.DendriteSet): boolean {
    return GeneTypes.get(gene.type).born(gene.data, target);
}

export function random(brain: Common.DendriteSet, type?: string): Gene {
    if (!type) type = Array.from(GeneTypes.keys())[Math.floor(GeneTypes.size * Math.random())];

    let gtype = GeneTypes.get(type);
    let gdata = gtype.rand(brain);

    return {
        data: gdata,
        type: type
    };
}


//=== Gene Type Definitions ===//


makeType('weight',
    (data: Data, brain: Common.DendriteSet) => {
        if (!brain.dendrites.has(data.which))
            return false;
        
        brain.dendrites.get(data.which).weight += data.offset;
        return true;
    },

    (brain: Common.DendriteSet) => {
        let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];

        return {
            which: dend,
            weight: Common.Random.weightOffset()
        };
    }
);

makeType('new',
    (data: Data, brain: Common.DendriteSet) => {
        if (brain.dendrites.has(data.id))
            return false;
        
        brain.makeDendrite(data.source, data.dest, data.weight, data.id);
        return true;
    },

    (brain: Common.DendriteSet) => {
        let id = Common.Random.id(20);

        return {
            id: id,
            source: brain.randomCoords(),
            dest: brain.randomCoords(),
            weight: Common.Random.weight()
        };
    }
);

makeType('delete',
    (data: Data, brain: Common.DendriteSet) => {
        if (!brain.dendrites.has(data.id))
            return false;
        
        brain.removeDendrite(data.which);
        return true;
    },

    (brain: Common.DendriteSet) => {
        let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];

        return {
            which: dend
        };
    }
);


makeType('split',
    (data: Data, brain: Common.DendriteSet) => {
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

    (brain: Common.DendriteSet) => {
        let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];

        return {
            id: dend,
            middle: brain.randomCoords(),
            pivot: Common.Random.weightOffset()
        };
    }
);

makeType('shift',
    (data: Data, brain: Common.DendriteSet) => {
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

    (brain: Common.DendriteSet) => {
        let dend = Array.from(brain.dendrites.keys())[Math.floor(brain.dendrites.size * Math.random())];

        return {
            id: dend,
            offset: Common.Random.posOffset(3),
            only: ['source', 'dest', null][Math.floor(3 * Math.random())]
        };
    }
);