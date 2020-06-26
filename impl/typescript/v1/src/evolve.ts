import { Brain, Entity } from './enviro';
import { DendriteMesh, Dendrite } from './common';
import { CoordXY } from './common';
import _ from 'lodash';



export class Competitor {
    public size: CoordXY;
    public brain: Brain;

    constructor(public gym: Gym, brain: Brain | CoordXY, public mesh: DendriteMesh, private callbacks?: Entity.Callbacks) {
        if (CoordXY.is(brain))
            this.brain = new Brain(this.size = brain);

        else {
            this.brain = brain;
            this.size = brain.size;
        }
    }

    static empty(gym: Gym, size: CoordXY, entities?: number, callbacks?: Entity.Callbacks): Competitor {
        let brain = new Brain(size);
        let mesh = new DendriteMesh(size.x, size.y);

        let res = new Competitor(gym, brain, mesh, callbacks);
        if (entities != null && entities > 0) res.initEntities(entities, callbacks);

        return res;
    }

    initEntities(entities?: number, entityCallbacks?: Entity.Callbacks) {
        for (let i = 0; i < entities; i++) {
            this.brain.makeEntity(entityCallbacks || this.gym.callbacks);
        }
    }
    
    tick(power?: number, fade?: number) {
        if (!power) power = 1.0;

        this.brain.tick(this.mesh, power, fade);
    }

    mutate(times: number) {
        this.mesh.mutateRandom(times);
    }

    cloneInto(brain: Brain) {
        return new Competitor(this.gym, brain, this.mesh.clone(), this.callbacks);
    }
}


export class Gym {
    public competitors: Set<Competitor> = new Set();
   
    public settings: Gym.Settings;

    constructor(protected init?: (compet: Competitor) => void, public callbacks?: Entity.Callbacks, settings?: Gym.Settings) {
        this.settings = _.defaultsDeep(settings, Gym.defaults);
    }

    configure(moreSettings: Partial<Gym.Settings>) {
        _.assignIn(this.settings, moreSettings);
    }

    breed(a: Competitor, b: Competitor): Competitor {
        let newMesh = DendriteMesh.breed(a.mesh, b.mesh);
        let newBrain = new Brain(a.brain.size);

        return this.add(new Competitor(this, newBrain, newMesh, this.callbacks));
    }

    add(comp: Competitor): Competitor {
        this.init(comp);

        this.competitors.add(comp);
        return comp;
    }

    make(size: CoordXY): Competitor {
        let comp = Competitor.empty(this, size);
        comp.mutate(this.settings.bootstrap);

        return this.add(comp);
    }

    *makeMany(many: number, size: CoordXY): IterableIterator<Competitor> {
        if (many > 0) for (let i = 0; i < many; i++)
            yield this.make(size);
    }

    _makeManyAsArray(many: number, size: CoordXY) {
        return Array.from(this.makeMany(many, size));
    }

    makeManyRandomFavorite(many: number, size: CoordXY): Competitor {
        let all = this._makeManyAsArray(many, size);

        return all[Math.floor(all.length * Math.random())];
    }

    makeManyFirstFavorite(many: number, size: CoordXY): Competitor {
        let all = this._makeManyAsArray(many, size);

        return all[0];
    }

    tick(power?: number, fade?: number) {
        if (!power) power = 1.0;

        this.competitors.forEach((comp: Competitor) => {
            comp.tick(power, fade);
        })
    }

    epoch() {
        let leaderboard: Competitor[] = Array.from(this.competitors);
        leaderboard.sort((a: Competitor, b: Competitor) => b.brain.score - a.brain.score);

        let n = leaderboard.length;
        let nBreeders = Math.round(n * this.settings.ratios.breeders);

        if (n < 2) nBreeders = 0;
        else if (n > 2 && nBreeders && nBreeders < 2) nBreeders = 2;

        let nNonBreed = n - nBreeders;
        let nMortality = Math.round(nNonBreed * this.settings.ratios.mortality);

        let nSick = Math.round(nBreeders * this.settings.ratios.sick);
        let nSavage = Math.round(nNonBreed * this.settings.ratios.savagery);

        let breeders = leaderboard.slice(0, nBreeders);
        let others = leaderboard.slice(nBreeders, nMortality > 0 ? -nMortality : undefined);

        let sick: Competitor[] = _.shuffle(breeders).slice(0, nSick);
        let savage = _.shuffle(others).slice(0, nSavage);

        let newCompets = breeders.concat(others);
        let deadCompets = nMortality > 0 ? leaderboard.slice(nBreeders + nMortality) : [];

        if (nMortality > 0) {
            for (let i = 0; i < nMortality; i++) {
                if (breeders.length >= 2) {
                    let parents = _.shuffle(breeders);
                    newCompets.push(this.breed(parents[0], parents[1]));
                }
            }
        }

        sick.forEach((s) => {
            s.mutate(this.settings.mutateAmount.breeders);
        });
        
        savage.forEach((s) => {
            s.mutate(this.settings.mutateAmount.others);
        });

        newCompets.forEach((c) => {
            this.competitors.add(c);
        });

        deadCompets.forEach((c) => {
            this.competitors.delete(c);
        });

        this.competitors.forEach((c: Competitor) => {
            c.brain.resetScore();
        });
    }
}

export namespace Gym {
    export const defaults: Settings = {
        bootstrap: 10,

        ratios: {
            breeders: 0.2,
            mortality: 0.5,
            sick: 0.3,
            savagery: 0.5
        },

        mutateAmount: {
            breeders: 1,
            others: 3
        }
    }

    export interface Settings {
        bootstrap: number;                          // initial mutation amount for each created competitorr
        ratios: Settings.AllProportions;            // populational proportions per epoch
        mutateAmount: Settings.MutateProportions;   // mutation amount per epoch
    }

    export namespace Settings {
        export interface AllProportions {
            breeders: number;   // top of the leaderboard
            mortality: number;  // bottom of the leaderboard, those who don't make it (proportion excluding breeders)
            sick: number;       // breeders who mutate
            savagery: number;   // surviving non-breeders who mutate
        }

        export interface MutateProportions {
            breeders: number;   // mutation rate in breeders
            others: number;     // mutation rate in non-breeders
        }
    }
}
