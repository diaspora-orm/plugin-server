import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import camelCase from 'lodash.camelcase'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json';
import builtins from 'rollup-plugin-node-builtins';

const pkg = require('./package.json')

const libraryName = 'diaspora-server'

export default {
  input: `src/${libraryName}.ts`,
  output: [
    { file: pkg.main, name: camelCase(libraryName), format: 'umd' },
    { file: pkg.module, format: 'es' },
  ],
  sourcemap: true,
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external(id) {
    return /^[\w-@]+$/.test(id);
  },
  watch: {
    include: 'src/**',
  },
  plugins: [
    // Compile TypeScript files
    typescript(),
    // Allow JSON files
    json(),
    // Allow nodejs methods
    builtins(),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    // commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve({
      // pass custom options to the resolve plugin
      customResolveOptions: {
        moduleDirectory: 'node_modules'
      }
    }),
    
    // Resolve source maps to the original source
    sourceMaps(),
  ],
}
