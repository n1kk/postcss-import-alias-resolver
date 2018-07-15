const expect = require('chai').expect
const sinon = require('sinon')
const Resolver = require('./src/index')
const path = require('path')

let alias = {
  '@': path.resolve(__dirname, 'node_modules/chai/lib/chai/'),
  'chai': path.resolve(__dirname, 'node_modules/chai/'),
  '~': path.resolve(__dirname, './'),
  'mocha': path.resolve(__dirname, 'node_modules/mocha'),
}

let fullPath = (rel) => path.resolve(__dirname, rel)

describe('# Resolver', function() {
  
  let resolveFromTo = (opts) => {
    let resolver = Resolver(opts);
    let fromTo = async (from, to) => expect(await resolver(from, __dirname)).to.equal(fullPath(to))
    fromTo.fail = async (from, to) => expect(await resolver(from, __dirname)).not.to.equal(fullPath(to))
    fromTo.resolver = resolver
    return fromTo
  }
  
  describe('# alias', function() {
    
    it('should resolve passed aliases', async () => {
      let fromTo = resolveFromTo({
        alias: alias,
      })
      
      await fromTo('~@/interface/expect.js', 'node_modules/chai/lib/chai/interface/expect.js')
      await fromTo('~/src/index.js', 'src/index.js')
      await fromTo('~mocha/lib/mocha.js', 'node_modules/mocha/lib/mocha.js')
    });
  
    it('should resolve webpack aliases', async () => {
      let fromTo = resolveFromTo({
        webpackConfig: {resolve: {alias}},
      })
    
      await fromTo('~@/interface/expect.js', 'node_modules/chai/lib/chai/interface/expect.js')
      await fromTo('~/src/index.js', 'src/index.js')
      await fromTo('~mocha/lib/mocha.js', 'node_modules/mocha/lib/mocha.js')
    });
  
    describe('should merge aliases', function() {
   
      it('extend', async () => {
        let fromTo = resolveFromTo({
          alias,
          webpackConfig: {resolve: {alias: {
            '~': path.resolve(__dirname, './src'),
          }}},
          mergeAlias: 'extend',
        })
      
        await fromTo.fail('~/index.js', 'src/index.js')
        await fromTo('~/src/index.js', 'src/index.js')
    
      });
     
      it('replace', async () => {
        let fromTo = resolveFromTo({
          alias,
          webpackConfig: {resolve: {alias: {
            '~a': path.resolve(__dirname, './src'),
          }}},
          mergeAlias: 'replace',
        })
      
        await fromTo.fail('~a/index.js', 'src/index.js')
      });
  
    });
  
    it('should not prepend ~', async () => {
      let fromTo = resolveFromTo({
        webpackConfig: {resolve: {alias}},
        dontPrefix: true
      })
    
      await fromTo('@/interface/expect.js', 'node_modules/chai/lib/chai/interface/expect.js')
      await fromTo('~/src/index.js', 'src/index.js')
      await fromTo('mocha/lib/mocha.js', 'node_modules/mocha/lib/mocha.js')
    });
  });
  
  describe('# extensions', function() {
    
    it('should look for passed extensions', async () => {
      let fromTo = resolveFromTo({
        alias: alias,
        extensions: ['.js']
      })
      
      await fromTo('~@/interface/expect', 'node_modules/chai/lib/chai/interface/expect.js')
      await fromTo('~/src/index', 'src/index.js')
      await fromTo('~mocha/lib/mocha', 'node_modules/mocha/lib/mocha.js')
    });
  
    it('should look for webpack extensions', async () => {
      let fromTo = resolveFromTo({
        webpackConfig: {resolve: {
          alias: alias,
          extensions: ['.js']
        }},
        mergeExtensions: 'extend',
      })
    
      await fromTo('~@/interface/expect', 'node_modules/chai/lib/chai/interface/expect.js')
      await fromTo('~/src/index', 'src/index.js')
      await fromTo('~mocha/lib/mocha', 'node_modules/mocha/lib/mocha.js')
    });
  
    describe('should merge extensions', function() {
   
      it('extend', async () => {
        let fromTo = resolveFromTo({
          alias,
          extensions: ['.js'],
          webpackConfig: {resolve: {
            extensions: ['.sauce.js'],
          }},
          mergeExtensions: 'extend',
        })
      
        await fromTo('~chai/karma', 'node_modules/chai/karma.sauce.js')
      });
     
      it('replace', async () => {
        let fromTo = resolveFromTo({
          alias,
          extensions: ['.conf.js'],
          webpackConfig: {resolve: {
              extensions: ['.sauce.js'],
            }},
          mergeExtensions: 'replace',
        })
  
        await fromTo('~chai/karma', 'node_modules/chai/karma.conf.js')
      });
  
    });
  });
  
  describe('# modules', function() {
    
    it('should look in passed modules', async () => {
      let fromTo = resolveFromTo({
        alias: alias,
        extensions: ['.js'],
        modules: ['src']
      })
      
      await fromTo('~index', 'src/index.js')
    });
  
    it('should look in webpack modules', async () => {
      let fromTo = resolveFromTo({
        webpackConfig: {resolve: {
          alias: alias,
          extensions: ['.js'],
          modules: ['node_modules/fs-extra/']
        }},
      })
  
      await fromTo('~lib/index', 'node_modules/fs-extra/lib/index.js')
    });
  
    describe('should merge modules', function() {
   
      it('extend', async () => {
        let fromTo = resolveFromTo({
          alias,
          extensions: ['.js'],
          modules: ['src'],
          webpackConfig: {resolve: {
            modules: ['node_modules']
          }},
          mergeModules: 'extend',
        })
      
        await fromTo('~chai/index.js', 'node_modules/chai/index.js')
      });
     
      it('replace', async () => {
        let fromTo = resolveFromTo({
          alias,
          extensions: ['.js'],
          modules: ['src'],
          webpackConfig: {resolve: {
            modules: ['node_modules']
          }},
          mergeModules: 'replace',
        })
  
        await fromTo.fail('~fs-extra/lib/index.js', 'node_modules/fs-extra/lib/index.js')
        await fromTo('~index.js', 'src/index.js')
      });
  
    });
  });
  
  describe('# callbacks', function() {
    it('should call onResolve and use return value', async () => {
      let fromTo = resolveFromTo({
        alias: alias,
        extensions: ['.js'],
        modules: ['src'],
        onResolve(id, base, path) {
          expect(id).to.equal('~index')
          expect(base).to.equal(__dirname)
          expect(path).to.equal(fullPath('src/index.js'))
          return path + 'x'
        }
      })
  
      await fromTo.fail('~index', 'src/index.js')
    });
    
    it('should call onFail and use return value', async () => {
      let fromTo = resolveFromTo({
        alias: alias,
        extensions: ['.js'],
        modules: ['src'],
        onFail(id, base, path) {
          console.log({id, base})
          expect(id).to.equal('~inde')
          expect(base).to.equal(__dirname)
          return fullPath('src/index.js')
        }
      })
  
      await fromTo('~inde', 'src/index.js')
    });
  });
});
