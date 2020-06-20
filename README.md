# nbrained

In real-time simulation, there is little time for the expenses of the
overly interconnected nature of standard multi-layered neural networks
that most modern AI projects tend to use.

For this reason, we had to look back at the past, where CPU time was
far more valuable and precious. In the humble times of Windows 98,
there was one example that stood above others with regards to AI:
[Creatures](https://creatures.wiki/Brain).

It is with that - that I like to call 'deceitful simplicity' - in mind
that <kbd>nbrained</kbd> was born.

## Operation

It is a very simple proof-of-concept. A Brain consists of three items:

* a large rectangular 2D array of numeric values ("neurons");
* a large list of links between the values in the array above ("dendrites");
* a list of coordinates (X, Y, width and height) for rectangular regions of the neuron array that serve as input or output ("lobes").

It also has a change map, which we are about to see.

A 'tick' here can correspond to either an unit of a broader simulation's
time, or several such units (for example, more desirable for most games,
except perhaps kung fu. To be fair, Lo Wang is more god than man, and
even a real-time AI would have no )

### 

Each Brain is supposed to be simulated continuously, i.e. over time. That
makes it easier to integrate it with games and other simulation software
for the which this property is of praticular interest. It does, however, use
a bit more CPU time when not paused, even if it is not doing any much of a thing.

Every tick, values are fed into the input lobes, and read from
the output lobes, by the subsystems that peruse said interaction
with the brain, and/or the output values that may arise from
said interaction.

Then, the list of Dendrites of a Brain is iterated on. Each Dendrite has
"from" coordinates, "to" coordinates, and a weight.
Those operations pull the value from the brain's neuron list, at the "from"
coordinates; then, after multiplying it by that weight, it adds it to
the value in the **change map**, at the "to" coordinate (setting it to
said value if the change map does not contain those coordinates yet).

The change map is a hash map that temporarily holds changes, to avoid overwriting
the neuron buffer in place in a way that can affect dendrites whose computation is
still pending.

After all dendrites do their thing, all values in the change map are finally added to
the neuron array at their respective coordinates, and the change map is emptied.

## Learning

The learning is a dynamic and rather stochastic process. It is a genetic evolution
algorithm.

### Genes

Every brain has a list of genes, which describe how it was built. Each
gene is an operation, that either

 * slightly changes a dendrite's weight (also the most common mutation),
 * adds a new dendrite (with initial coordinates and weights, which are random at mutation),
 * deletes an existing dendrite (random at mutation), 
 * splits a dendrite (by choosing a 'middle coordinate', which is random at mutation, and replacing said dendrite by two, so that the middle is M, and A->B becomes A->M and M->B), or
 * shifts a dendrite's coordinates by an offset relative to its previous position (either 'from', 'to', or both).

Note that genes only affect the arrangement of dendrites.

A brain's mutation is simply a clone with an extra gene to the end of said list.
Thus, in a way, the gene list is like an evolutionary log.

### Unsupervised Training

The learning algorithm simply makes several (usually dozens of) clones of a 'model
brain' (with no dendrites), putting them in a set. Its gene list is empty.

Every "epoch" (which is a unit of training time that typically either spans a fixed
amount of ticks, or ends with an event, like the victory or defeat condition of a
simulation), poorly performing brains are removed from the training set; their slots
are replaced by "breeds" of the more successful brain (which are built by applying
randomly alternating genes of both, whilst keeping the model brain's configuration,
including lobes). Then, every brain has a moderate chance of mutation, which, brief reminder,
is basically having a random new gene added. It shall not be small, as most mutations
are slight weight 'adjustments'.

After a few epochs, the fittest brain is selected, and returned. All others are
deallocated/forgotten/killed-in-action. You better start digging the graves already!

## Decoupling

It is also being considered to separate the neurons from the dendrites. Fret not,
we aren't putting brain matter into a blender! But sometimes it is useful to be able
to evolve the same set of dendrites, but have each entity operate its own separate
array of neurons, to be able to handle different scenarios than its otherwise equally
'intelligent' brethren.
