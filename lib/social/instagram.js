'use strict';
// Load system modules
var util = require( 'util' );

// Load modules
var instagram = require( 'instagram-node' ).instagram;
var moment = require( 'moment' );
var Promise = require( 'bluebird' );
var _ = require( 'lodash' );

// Load my modules
var Social = require( './' );

// Constant declaration
var WINDOW = 1000*60*60; // 1 Hour

// Module variables declaration

// Module functions declaration
function Instagram( config ) {
  Social.call( this, config );

  this.trace( 'Creating Instagram with: ', this.keys );
  var api = instagram( {
    agent: this.agent,
  } );
  api.use( {
    client_id: this.keys.clientId, // eslint-disable-line camelcase
    client_secret: this.keys.clientSecret, // eslint-disable-line camelcase
  } );

  this.api = Promise.promisifyAll( api );
}
util.inherits( Instagram, Social );
Instagram.prototype.get = function*( endpoint, param, options ) {
  options = options || {};

  var paginate = true;
  if( _.isBoolean( this.paginate ) ) paginate = this.paginate;
  if( _.isBoolean( options.paginate ) ) paginate = options.paginate;

  var breakOnLimit = false;
  if( _.isBoolean( this.breakOnLimit ) ) breakOnLimit = this.breakOnLimit;
  if( _.isBoolean( options.breakOnLimit ) ) breakOnLimit = options.breakOnLimit;

  var MAX_PAGES = this.MAX_PAGES || options.MAX_PAGES || 50;
  var numPages = 1;
  var numMedias = 0;

  // Add additional parameters
  var data = {};
  data.count = options.count || 100;
  data.distance = options.distance;

  // Create the function to call
  var apiFnToCall;
  endpoint = endpoint.toLowerCase();
  if( endpoint==='tag' ) {
    apiFnToCall = this.api.tag_media_recentAsync; // eslint-disable-line camelcase
  } else if( endpoint==='user' ) {
    apiFnToCall = this.api.user_media_recentAsync; // eslint-disable-line camelcase
  } else if( endpoint==='geo' ) {
    apiFnToCall = this.api.media_searchAsync; // eslint-disable-line camelcase
  }

  if( !_.isFunction( apiFnToCall ) ) throw new Error( 'Unsupported endpoint' );


  // Bind the function so it can be called "apiFnToCall()"
  var boundApiFnToCall = _.bind( apiFnToCall, this.api, param, data );
  if( endpoint==='geo' ) {
    boundApiFnToCall = _.bind( apiFnToCall, this.api, param.lat, param.lon, data );
  }


  while( numPages<MAX_PAGES ) {
    var result = null;
    try {
      result = yield boundApiFnToCall();
    } catch( requestError ) {
      if( !breakOnLimit && requestError.code===429 ) { // Rate limit exceeded
        this.warn( 'Rate limit exceeded, waiting 1 hour' );
        yield Promise.delay( WINDOW );
        continue;
      }
      this.error( 'Request error', requestError.stack );
      break;
    }
    if( !_.isArray( result ) || !result[ 0 ] ) {
      continue; // Retry
    }
    var medias = result[ 0 ] || [];

    this.debug( 'Got %d medias from page %d', medias.length, numPages );
    if( medias && medias.length===0 ) {
      this.trace( 'No more medias' );
      break; // Exit in case of no more medias
    }

    // Convert and send posts
    numMedias += medias.length;
    // var posts = this.toPosts( medias );
    this.send( medias );

    // Do not check for pagination
    this.trace( 'Performing paginated query? %s', typeof paginate, paginate );
    if( !paginate ) break;


    // Check last post
    var last = medias[ medias.length - 1 ];
    if( this.isBefore( last, options.since ) ) {
      this.debug( 'No more medias before the since date' );
      break; // Do not check for more Posts
    }

    // Check for a new page
    try {
      this.trace( 'Check for a new page' );
      var pagination = result[ 1 ];
      if( pagination && _.isFunction( pagination.next ) ) {
        boundApiFnToCall = Promise.promisify( pagination.next );
        numPages += 1;
        this.status( 'page', numPages );
      }
    } catch( pageError ) {
      this.warn( 'Cannot find more pages', pageError );
      break;
    }
  }

  this.debug( 'Retrieved %d medias over %d pages for the query', numMedias, numPages );
  this.status( 'done', 'request' );
};
Instagram.prototype.getByTag = function*( runId, tag, options ) {
  this.debug( 'Get media by tag "%s"', tag );
  return yield this.getByTags( runId, [ tag ], options );
};
Instagram.prototype.getByTags = function*( runId, tags, options ) {
  this.debug( 'Get media by tags "%s"', tags );

  var array = _.map( tags, function( tag ) {
    return this.get( 'tag', tag, options );
  }, this );
  yield array;
  this.status( 'completed', runId );
};
Instagram.prototype.getByUser = function*( runId, user, options ) {
  this.debug( 'Get media of user "%s"', user );
  return yield this.getByUsers( runId, [ user ], options );
};
Instagram.prototype.getByUsers = function*( runId, users, options ) {
  this.debug( 'Get media of users "%s"', users );

  var array = _.map( users, function( user ) {
    return this.get( 'user', ''+user, options ); // Force string conversion
  }, this );
  yield array;

  this.status( 'completed', runId );
};
Instagram.prototype.getByGeoGrid = function*( runId, gridPoints, options, status ) {
  this.debug( 'Get tweets from %d grid points', gridPoints.length );
  options = options || {};
  var bulk = this.bulk || options.bulk || 100;
  var start = status || 0;
  var distance = this.radius || options.radius || 0.2;
  distance = distance/1000; // In km

  function map( idx, offset ) {
    var point = gridPoints[ idx+offset ];
    if( _.isArray( point ) ) {
      var latitude = point[ 1 ];
      var longitude = point[ 0 ];

      return this.get( 'geo', {
        lat: latitude,
        lon: longitude
      }, options );
    } else {
      return null;
    }
  }

  this.trace( 'Starting from %d, with step %d and radius in km: %d', start, bulk, distance );
  for( var i=start; i<gridPoints.length; i+=bulk ) {
    var array = _.times( bulk, _.partial( map, i ), this );
    yield array;
    this.status( 'done', 'grid', {
      start: i,
      end: i+bulk,
    } );
  }
  this.debug( 'Completed all the grid' );
  this.status( 'completed', runId );
};
Instagram.prototype.getCreationDate = function( media ) {
  return moment.unix( media.created_time ).toDate();
};
// Module initialization (at first load)

// Module exports

module.exports = Instagram;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78