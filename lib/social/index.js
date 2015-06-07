'use strict';
// Load system modules
var util = require( 'util' );
var Readable = require( 'stream' ).Readable;

// Load modules
var _ = require( 'lodash' );
var log = require( '@volox/simple-logger' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration
function Social( config, opts ) {
  opts = opts || {};
  opts.objectMode = true;
  Readable.call( this, opts );

  if( !config.keys )
    throw new Error( 'You must provide keys to use a social network' );

  this.name = config.provider;
  this.keys = config.keys;
  // this.startDate = config.startDate;
  // this.endDate = config.endDate;
  this.exclude = config.exclude;
  if( !_.isArray( this.exclude ) ) {
    this.exclude = [ this.exclude ];
  }
  this.tags = config.tags;
  if( !_.isArray( this.tags ) ) {
    this.tags = [ this.tags ];
  }
  this.users = config.users;
  if( !_.isArray( this.users ) ) {
    this.users = [ this.users ];
  }
  this.geojson = config.geojson;
  if( !_.isArray( this.geojson ) ) {
    this.geojson = [ this.geojson ];
  }
  this.id = config.id;
}
util.inherits( Social, Readable );
Social.prototype.toPost = function() { throw new Error( 'Implement me!' ); };
Social.prototype.toPosts = function( list ) {
  return _.map( list, this.toPost, this );
};
Social.prototype.getByTag = function*( /* tag, options */ ) { throw new Error( 'Implement me!' ); };
Social.prototype.getByTags = function*( /* tags, options */ ) { throw new Error( 'Implement me!' ); };
Social.prototype.getByUser = function*( /* user, options */ ) { throw new Error( 'Implement me!' ); };
Social.prototype.getByUsers = function*( /* users, options */ ) { throw new Error( 'Implement me!' ); };
Social.prototype._read = function() {};
Social.prototype.send = function( data ) {
  if( _.isArray( data ) ) {
    _.each( data, this.push, this );
  } else {
    this.push( data );
  }
};
Social.prototype.start = function*( options ) {
  log.debug( '%s started', this.name );

  if( this.tags ) {
    yield this.getByTags( this.tags, options );
  } else if ( this.users ) {
    yield this.getByUsers( this.users, options );
  /*
  } else if ( this.geojson ) {
    // TODO implement
    yield this.getByTags( this.users, options );
  */
  }
  log.trace( '%s cycle ended', this.name );
};
// Module initialization (at first load)

// Module exports

module.exports = Social;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78