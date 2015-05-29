'use strict';
// Load system modules
var Writable = require( 'stream' ).Writable;

// Load modules
var co = require( 'co' );
var monk = require( 'monk' );
var _ = require( 'lodash' );
var log = require( '@volox/simple-logger' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration
function Crawler( socialList, config ) {
  config = config || {};
  this.socialList = socialList || [];

  // Create the Write stream
  this.output = this.createOutputStream( config.output );

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
Crawler.prototype.createOutputStream = function( outConfig ) {
  outConfig = outConfig || {};
  outConfig.type = outConfig.type || 'database';

  if( outConfig.type==='database' ) {
    // Create the connection to the DB

    // Create a writable stream to write to.
    var w = new Writable( {
      objectMode: true,
    } );
    w._write = _.bind( this.saveToDB, this );
    return w;

  } else {
    return process.out;
  }
};
Crawler.prototype.saveToDB = function( data, enc, cb ) {
  log.trace( 'Saving data[%s]', typeof data );
  co( function*() {

  }.bind( this ) )
  .then( function() {
  return cb();
  } )
  .catch( function( err ) {
  return cb( err );
  } )
  ;
};
Crawler.prototype.start = function() {
  log.trace( 'Listening to the data from the socials' );

  _.each( this.socialInstances, function( instance ) {
    instance.pipe( this.output );
  } , this );


  log.info( 'Starting the crawler' );
  return co( function*() {
    while( true ) {
      yield this.socialInstances.map( function( social ) {
        return social.start();
      } );
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