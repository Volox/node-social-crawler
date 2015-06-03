'use strict';
// Load system modules
// var Writable = require( 'stream' ).Writable;
var Transform = require( 'stream' ).Transform;
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
  Transform.call( this, {
    objectMode: true,
  } );
  // config = config || {};
  this.socialList = socialList || [];

  // Create the Write stream
  // this.output = this.createOutputStream( config.output );

  // Create the instances
  log.trace( 'Creating the instaces for each social' );
  log.trace( socialList );
  this.socialInstances = socialList.map( function( config ) {
    var name = config.provider;
    var Social = require( '../social/'+name );

    log.trace( 'Creating the instace for %s', name );
    return new Social( config );
  } );
}
util.inherits( Crawler, Transform );
Crawler.prototype._transform = function( data, enc, callback ) {
  log.trace( 'Pushing data' );
  callback( null, data );
};
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
Crawler.prototype.start = function() {
  log.trace( 'Listening to the data from the socials' );

  _.each( this.socialInstances, function( instance ) {
    instance.pipe( this );
  }, this );
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

  co( function*() {
    while( true ) {
      // Start oall the instances in parallel
      yield this.socialInstances.map( function( social ) {
        return social.start();
      } );

      log.trace( 'Cycle ended, restarting' );
      yield Promise.delay( 5000 );
    }
  }.bind( this ) )
  .catch( function( err ) {
    log.error( err );
    log.error( err.stack );
  } );


};

// Module initialization (at first load)

// Module exports
module.exports = Crawler;


//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78