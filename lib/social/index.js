'use strict';
// Load system modules
var util = require( 'util' );

// Load modules
var _ = require( 'lodash' );
var moment = require( 'moment' );
var Logger = require( '@volox/simple-logger' ).Logger;

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration
function Social( config, opts ) {
  opts = opts || {};
  opts.objectMode = true;
  Logger.call( this, opts );

  if( !config.keys ) throw new Error( 'You must provide keys to use a social network' );

  // Save properties
  this.name = config.provider;
  this.keys = config.keys;
  this.id = config.id;
  this.bulk = config.bulk;
  this.paginate = config.paginate;
  this.radius = config.radius;
  this.breakOnLimit = config.breakOnLimit;
  this.MAX_PAGES = config.MAX_PAGES;

  // Save data configuration
  this.tags = config.tags;
  this.exclude = config.exclude;
  this.users = config.users;
  this.geojson = config.geojson;
}
util.inherits( Social, Logger );
Social.prototype.getByTag = function*( /* runId, tag, options, status */ ) { throw new Error( 'Implement me!' ); };
Social.prototype.getByTags = function*( /* runId, tags, options, status */ ) { throw new Error( 'Implement me!' ); };
Social.prototype.getByUser = function*( /* runId, user, options, status */ ) { throw new Error( 'Implement me!' ); };
Social.prototype.getByUsers = function*( /* runId, users, options, status */ ) { throw new Error( 'Implement me!' ); };
Social.prototype.getByGeoGrid = function*( /* runId, gridData, options, status */ ) { throw new Error( 'Implement me!' ); };
Social.prototype.getCreationDate = function() { throw new Error( 'Implement me!' ); };
Social.prototype.status = function() {
  var args = _.toArray( arguments );
  args.unshift( 'status' );
  this.emit.apply( this, args );
  // this.emit( 'status', args.slice() );
};
Social.prototype.send = function( data ) {
  if( _.isArray( data ) && data.length>0 ) {
    // this.trace( 'Sending %d data', data.length );
    _.each( data, this.send, this );
  } else {
    // this.trace( 'Sending single data' );
    this.emit( 'data', data );
  }
};
Social.prototype.isBefore = function( post, since ) {
  var date = this.getCreationDate( post );
  if( since ) {
    return moment( date ).isBefore( since );
  }
  return false;
};
Social.prototype.run = function*( runId, type, options, status ) {
  if( type==='tags' || type==='tag' ) {
    yield this.getByTags( runId, this.tags, options, status );
  } else if( type==='user' || type==='users' ) {
    yield this.getByUsers( runId, this.users, options, status );
  } else if( type==='geo' ) {
    yield this.getByGeoGrid( runId, this.geojson, options, status );
  } else {
    throw new Error( 'Unsupported operation "'+type+'"' );
  }
};
// Module initialization (at first load)

// Module exports

module.exports = Social;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78