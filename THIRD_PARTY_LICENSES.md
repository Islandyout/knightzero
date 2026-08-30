# Third-party software

## Stockfish / Stockfish.js

KnightZero distributes the Stockfish 18 lite single-threaded WebAssembly build from the `stockfish` npm package.

Stockfish.js is licensed under the GNU General Public License version 3 (GPLv3). Source and license information are available from the upstream project:

- https://github.com/nmrugg/stockfish.js
- https://github.com/official-stockfish/Stockfish

KnightZero's build copies `stockfish-18-lite-single.js` and `stockfish-18-lite-single.wasm` from the installed npm package into the public PWA assets without modifying the engine binary.
