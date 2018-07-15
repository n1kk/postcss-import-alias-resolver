A tool to easily create custom alias resolver for [postcss-import](https://github.com/postcss/postcss-import). 

There are already modules that do this, but I encountered a situation when I couldn't make my setup to resolve everything correctly, either aliases or modules or direct link were not resolving. So I made my own configurable resolver.

- [Install](#install)
- [Update Log](#update-log)
- [Usage](#usage)
- [API](#api)

## Install
```bash
npm i postcss-import-alias-resolver
```

## Update Log
- `0.1.1` added resolution via package.json main field
- `0.1.0` initial working sample

## Usage
Webpack example
```javascript
const resolver = require('postcss-import-alias-resolver');
const postcssLoader = {
  loader: 'postcss-loader',
  options: {
    plugins: {
      'postcss-import': {
        resolve: resolver(options)
      }
    }
  }
}
```

You can define aliases, extensions and modules directories to look in. You can also pass webpack config and it will take those settings from `config.resolve` object. By default aliases are prefixed with '~' so `'@': 'src/assets'` will become `'~@': 'src/assets'`, this is done for compatibility with some environments and IDEs and can be disabled.


Options example

```javascript
resolver({
  alias: {
    '@': path.resolve(__dirname, 'assets'),
    'comps': path.resolve(__dirname, 'src/components'),
    'static': path.resolve(__dirname, '/public'),
  },
  extensions: ['.css'],
  modules: ['assets/libs', 'node_modules'],
  
  dontPrefix: false, // do not enforce '~' prefix to aliases
  
  webpackConfig: require('./webpack.conf.js'),
  mergeAlias: 'extend',
  mergeModules: 'extend',
  mergeExtensions: 'replace',
  
  onResolve(id, base, resolvedPath) {
    console.log(`id ${id} resolved to ${resolvedPath}`)
    // if you want to override then return new path
    if (override === true)
      return 'some/new/path'
  },
  onFail(id, base) {
    console.log(`failed to resolve id ${id} from ${base}`)
    // if you want to override then return new path
    if (override === true)
      return 'some/new/path'     
  },
})
```

Structure example

```
/Users/user/dev/project
├── webpack.conf.js
├── node_modules
│   └── bulma
│       └── package.json
│           └── "main": "./lib/index.css"
├── public
│   └── file.css
├── assets
│   └── some.css
│   └── libs
│       └── bootstrap
│           └── index.css
└── src
    └── components
        ├── base.css
        └── theme.css
```

Resolve example with above config and structure

```css
@import "~static/file.css";
/* /Users/user/dev/project/public//file.css */

@import "~@/some.css";
/* /Users/user/dev/project/assets/some.css */

@import "~bootstrap";
/* /Users/user/dev/project/assets/libs/bootstrap/index.css */

@import "~bulma";
/* /Users/user/dev/project/node_modules/bulma/lib/index.css */

@import "~comps/theme";
/* /Users/user/dev/project/src/components/theme.css */
```

## API

#### `resolver(options)`
Creates a resolver with set options
Options object accepts:
- `alias`: an object with key/value pairs as alias/path:
  ```javascript
  let alias = {
    '@': path.resolve(__dirname, 'assets'),
    'src': path.resolve(__dirname, 'src'),
    'static': path.resolve(__dirname, '/public'),
  }
  ```
- `extensions`: list of extensions to try when looking for a file, if not passed and no webpack config then defaults to `['.css']`
- `modules`: list of directories to look into when aliases didn't match, if not passed and no webpack config then defaults to `['node_modules']`
- `moduleFields`: list of fields to look in package.json, default `['main']`
- `webpackConfig`: an object with webpack configuration that contains `resolve` field
- `mergeAlias`: merge strategy for aliases `'extend'` or `'replace'`, defaults to `'extend'`
- `mergeModules`: merge strategy for modules `'extend'` or `'replace'`, defaults to `'extend'`
- `mergeExtensions`: merge strategy for extensions `'extend'` or `'replace'`, defaults to `'replace'`
- `dontPrefix`: bool, if true then `~` prefix wont be enforced on aliases and it will look for exact match
- `logging`: `'none'` `'fail'` `'match'` `'all'` 
- `onResolve`: function that will be called on each successful resolve, receives `id, base, resolvedPath`, if it returns a string then it will replace resolved path.
- `onFail`: function that will be called on each failed resolve, receives `id, base`, if it returns a string then it will replace resolved path.
