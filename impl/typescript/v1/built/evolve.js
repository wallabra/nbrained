"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gym = exports.Competitor = void 0;
const enviro_1 = require("./enviro");
const common_1 = require("./common");
const common_2 = require("./common");
const lodash_1 = __importDefault(require("lodash"));
class Competitor {
    constructor(gym, brain, mesh, callbacks) {
        this.gym = gym;
        this.mesh = mesh;
        this.callbacks = callbacks;
        if (common_2.CoordXY.is(brain))
            this.brain = new enviro_1.Brain(this.size = brain);
        else {
            this.brain = brain;
            this.size = brain.size;
        }
    }
    static empty(gym, size, entities, callbacks) {
        let brain = new enviro_1.Brain(size);
        let mesh = new common_1.DendriteMesh(size.x, size.y);
        let res = new Competitor(gym, brain, mesh, callbacks);
        if (entities != null && entities > 0)
            res.initEntities(entities, callbacks);
        return res;
    }
    initEntities(entities, entityCallbacks) {
        for (let i = 0; i < entities; i++) {
            this.brain.makeEntity(entityCallbacks || this.gym.callbacks);
        }
    }
    tick(power, fade) {
        if (!power)
            power = 1.0;
        this.brain.tick(this.mesh, power, fade);
    }
    mutate(times) {
        this.mesh.mutateRandom(times);
    }
    cloneInto(brain) {
        return new Competitor(this.gym, brain, this.mesh.clone(), this.callbacks);
    }
}
exports.Competitor = Competitor;
class Gym {
    constructor(init, callbacks, settings) {
        this.init = init;
        this.callbacks = callbacks;
        this.competitors = new Set();
        this.settings = lodash_1.default.defaultsDeep(settings, Gym.defaults);
    }
    configure(moreSettings) {
        lodash_1.default.assignIn(this.settings, moreSettings);
    }
    breed(a, b) {
        let newMesh = common_1.DendriteMesh.breed(a.mesh, b.mesh);
        let newBrain = new enviro_1.Brain(a.brain.size);
        return this.add(new Competitor(this, newBrain, newMesh, this.callbacks));
    }
    add(comp) {
        this.init(comp);
        this.competitors.add(comp);
        return comp;
    }
    make(size) {
        let comp = Competitor.empty(this, size);
        comp.mutate(this.settings.bootstrap);
        return this.add(comp);
    }
    *makeMany(many, size) {
        if (many > 0)
            for (let i = 0; i < many; i++)
                yield this.make(size);
    }
    _makeManyAsArray(many, size) {
        return Array.from(this.makeMany(many, size));
    }
    makeManyRandomFavorite(many, size) {
        let all = this._makeManyAsArray(many, size);
        return all[Math.floor(all.length * Math.random())];
    }
    makeManyFirstFavorite(many, size) {
        let all = this._makeManyAsArray(many, size);
        return all[0];
    }
    tick(power, fade) {
        if (!power)
            power = 1.0;
        this.competitors.forEach((comp) => {
            comp.tick(power, fade);
        });
    }
    epoch() {
        let leaderboard = Array.from(this.competitors);
        leaderboard.sort((a, b) => b.brain.score - a.brain.score);
        let n = leaderboard.length;
        let nBreeders = Math.round(n * this.settings.ratios.breeders);
        if (n < 2)
            nBreeders = 0;
        else if (n > 2 && nBreeders && nBreeders < 2)
            nBreeders = 2;
        let nNonBreed = n - nBreeders;
        let nMortality = Math.round(nNonBreed * this.settings.ratios.mortality);
        let nSick = Math.round(nBreeders * this.settings.ratios.sick);
        let nSavage = Math.round(nNonBreed * this.settings.ratios.savagery);
        let breeders = leaderboard.slice(0, nBreeders);
        let others = leaderboard.slice(nBreeders, nMortality > 0 ? -nMortality : undefined);
        let sick = lodash_1.default.shuffle(breeders).slice(0, nSick);
        let savage = lodash_1.default.shuffle(others).slice(0, nSavage);
        let newCompets = breeders.concat(others);
        let deadCompets = nMortality > 0 ? leaderboard.slice(nBreeders + nMortality) : [];
        if (nMortality > 0) {
            for (let i = 0; i < nMortality; i++) {
                if (breeders.length >= 2) {
                    let parents = lodash_1.default.shuffle(breeders);
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
        this.competitors.forEach((c) => {
            c.brain.resetScore();
        });
    }
}
exports.Gym = Gym;
(function (Gym) {
    Gym.defaults = {
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
    };
})(Gym = exports.Gym || (exports.Gym = {}));
//# sourceMappingURL=evolve.js.map