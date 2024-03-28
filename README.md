# Proof-of-Location

Proof of Location is a decentralized geolocation service which can be used by a “payer”

to determine the location of a “prover” (Waldo in the paper) with the help of a pool of

“challengers“ who send the challenge traffic to the Waldo.

The paper detailing the protocol is online at [https://arxiv.org/abs/2403.13230](https://arxiv.org/abs/2403.13230).

## Running a challenger

We currently support Linux/Mac/Windows-WSL.

Edit the `config/pol/challenger.json` file
to change the `walletPublicKey` and the location claim. PoLThe `walletPublicKey` is where rewards go.

### To check if everything is working fine

```
./run-pol-challenger
```

### To run in production

```
./run-pol-challenger-in-tmux
```

## For developers

### Installing dependencies

```
dart/run/install-deps
```

### Building the PoL binaries
```
dart/run/build-pol
```

### Running the challenger code

```
dart/bin/pol/run-pol-challenger
```

To run in background

```
dart/bin/pol/run-pol-challenger-in-tmux
```

