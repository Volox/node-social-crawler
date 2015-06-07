'use strict';
// Load system modules
// var Writable = require( 'stream' ).Writable;
var Readable = require( 'stream' ).Readable;
var util = require( 'util' );

// Load modules
var co = require( 'co' );
var monk = require( 'monk' );
var Promise = require( 'bluebird' );
var _ = require( 'lodash' );
// var JSONStream = require( 'JSONStream' );
var stringify = require( 'stringify-stream' );
var log = require( '@volox/simple-logger' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration
function Crawler( socialList ) {
  Readable.call( this, {
    objectMode: true,
  } );
  // config = config || {};
  this.socialList = socialList || [];

  // Create the Write stream
  // this.output = this.createOutputStream( config.output );

  // Create the instances
  log.trace( 'Creating the instaces for each social' );
  log.trace( socialList );
  this.socialInstances = _.map( socialList, function( config ) {
    var name = config.provider;
    var Social = require( '../social/'+name );

    log.trace( 'Creating the instace for %s', name );
    var instance = new Social( config );

    log.trace( 'Listening to the data from the instance' );
    instance.on( 'data', this.pushData.bind( this )  );

    return instance;
  }, this );
}
util.inherits( Crawler, Readable );
Crawler.prototype.pushData = function( data ) {
  this.push( data );
};
Crawler.prototype._read = function() {};
/*
Crawler.prototype.createOutputStream = function( outConfig ) {
  outConfig = outConfig || {};
  outConfig.type = outConfig.type || 'out';

  log.debug( 'Creating an output stream for "%s"', outConfig.type );

  if( outConfig.type==='database' ) {
    // Create the connection to the DB

    // Create a writable stream to write to.
    var w = new Writable( {
      objectMode: true,
    } );
    w._write = _.bind( this.saveToDB, this );
    return w;

  } else {
    return process.stdout;
  }
};
Crawler.prototype.saveToDB = function( data, enc, cb ) {
  return co( function*() {
    log.trace( 'Saving post', typeof data );
  }.bind( this ) )
  .then( function() {
    return cb();
  } )
  .catch( function( err ) {
    return cb( err );
  } )
  ;
};
*/
Crawler.prototype.start = function( end, start ) {

  /*
  _.each( this.socialInstances, function( instance ) {
    if( this.output===process.stdout ) {
      instance.pipe( stringify() ).pipe( this.output );
    } else {
      instance.pipe( this.output );
    }
  } , this );
  */


  log.info( 'Starting the crawler' );

  return co( function*() {
    // while( true ) {
    // }
    try {
      // Start all the instances in parallel
      yield this.socialInstances.map( function( social ) {
        return social.start( {
          end: end,
          start: start,
        } );
      } );

    } catch( err ) {
      // log.error( err );
      log.error( err.stack );
    }

    // log.trace( 'Cycle ended, restarting' );
    // yield Promise.delay( cycleDelay );
  }.bind( this ) )
  .catch( function( err ) {
    log.fatal( err.stack );
  } );
};

// Module initialization (at first load)

// Module exports
module.exports = Crawler;
module.exports.log = log;


//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78