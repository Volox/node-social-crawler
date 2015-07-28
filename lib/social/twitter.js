'use strict';
// Load system modules
var util = require( 'util' );
var querystring = require( 'querystring' );

// Load modules
var Promise = require( 'bluebird' );
var Twit = require( 'twit' );
var moment = require( 'moment' );
var _ = require( 'lodash' );

// Load my modules
var Social = require( './' );

// Constant declaration
var DATE_FORMAT = 'dd MMM DD HH:mm:ss ZZ YYYY';
var WINDOW = 1000*60*15; // 15 Minutes

// Module variables declaration

// Module functions declaration
function Twitter( config ) {
  Social.call( this, config );

  this.trace( 'Creating Twitter with: ', this.keys );
  var options = {
    consumer_key: this.keys.key, // eslint-disable-line camelcase
    consumer_secret: this.keys.secret, // eslint-disable-line camelcase
  };

  if( !this.keys.appOnly ) {
    options.access_token = this.keys.token; // eslint-disable-line camelcase
    options.access_token_secret = this.keys.tokenSecret; // eslint-disable-line camelcase
  } else {
    options.app_only_auth = true; // eslint-disable-line camelcase
  }

  this.options = options;
  var api = new Twit( options );

  this.api = Promise.promisifyAll( api );
}
util.inherits( Twitter, Social );
Twitter.prototype.get = function*( data, options ) {
  options = options || {};

  var paginate = true;
  if( _.isBoolean( this.paginate ) ) paginate = this.paginate;
  if( _.isBoolean( options.paginate ) ) paginate = options.paginate;

  var breakOnLimit = false;
  if( _.isBoolean( this.breakOnLimit ) ) breakOnLimit = this.breakOnLimit;
  if( _.isBoolean( options.breakOnLimit ) ) breakOnLimit = options.breakOnLimit;

  var MAX_PAGES = this.MAX_PAGES || options.MAX_PAGES || Infinity;
  var numPages = 1;
  var numTweets = 0;


  // Add additional parameters
  data.include_entities = true; // eslint-disable-line camelcase
  data.result_type = 'recent'; // eslint-disable-line camelcase
  data.count = options.count || 100;
  if( options.twitterSinceID ) {
    data.since_id = options.twitterSinceID; // eslint-disable-line camelcase
  }

  // Default query string
  // data.q = data.q || '';

  if( options.since ) {
    data.since = moment( options.since ).format( 'YYYY-MM-DD' );
  }

  if( options.until ) {
    data.until = moment( options.until ).format( 'YYYY-MM-DD' );
  }

  while( numPages<MAX_PAGES ) {
    var result = null;
    try {
      this.trace( 'Query page %d with data: ', numPages, data );
      result = yield this.api.getAsync( 'search/tweets', data );
      this.trace( 'Query for page %d done', numPages );
    } catch( requestError ) {
      if( !breakOnLimit && requestError.code===88 ) { // Rate limit exceeded
        this.warn( 'Rate limit exceeded, waiting 15 minutes' );
        yield Promise.delay( WINDOW );
        continue;
      } else if( requestError.code===404 ) {
        this.warn( 'Twitter token error, recreate API' );
        this.api.setAuth( options ); // Re-set the the api keys
        continue;
      }
      this.error( 'Request error', requestError.cause );
    }

    if( !_.isArray( result ) || !result[ 0 ] ) {
      continue; // Retry
    }
    var tweets = result[ 0 ].statuses || [];


    this.trace( 'Got %d tweets from page %d', tweets.length, numPages );
    if( tweets.length===0 ) {
      this.trace( 'No more medias' );
      break; // Exit in case of no more medias
    }

    // Convert and send posts
    numTweets += tweets.length;
    // var posts = this.toPosts( tweets );
    this.send( tweets );


    // Do not check for pagination
    this.trace( 'Performing paginated query? %s', typeof paginate, paginate );
    if( !paginate ) break;


    // Check last post
    var last = tweets[ tweets.length - 1 ];
    if( this.isBefore( last, options.since ) ) {
      this.debug( 'No more tweets before the since date' );
      break; // Do not check for more Posts
    }


    // Check for a new page
    try {
      var meta = result[ 0 ].search_metadata; // eslint-disable-line camelcase
      this.trace( { metadata: meta }, 'Check for a new page' );
      var next = meta.next_results; // eslint-disable-line camelcase
      if( !next ) {
        throw new Error( 'Last page reached' );
      }
      var maxId = querystring.parse( next.slice(1) ).max_id; // eslint-disable-line camelcase
      data.max_id = maxId;  // eslint-disable-line camelcase
      numPages += 1;
      this.status( 'page', numPages );
    } catch( pageError ) {
      this.info( 'Cannot find more pages', pageError );
      break;
    }
  }

  this.debug( 'Retrieved %d tweets over %d pages for the query', numTweets, numPages );
  this.status( 'done', 'request' );
};
Twitter.prototype.getByTag = function*( runId, tag, options ) {
  this.debug( 'Get tweets by tag "%s"', tag );
  return yield this.getByTags( runId, [ tag ], options );
};
Twitter.prototype.getByTags = function*( runId, tags, options ) {
  if( !_.isArray( tags ) ) tags = [ tags ];
  this.debug( 'Get tweets by tags "%s"', tags );
  yield this.get( {
    q: '#'+tags.join( ' OR #' ),
  }, options );
  this.status( 'completed', runId );
};
Twitter.prototype.getByUser = function*( runId, user, options ) {
  this.debug( 'Get tweets of user "%s"', user );
  return yield this.getByUsers( runId, [ user ], options );
};
Twitter.prototype.getByUsers = function*( runId, users, options ) {
  if( !_.isArray( users ) ) users = [ users ];
  this.debug( 'Get tweets of users "%s"', users );
  yield this.get( {
    q: '@'+users.join( ' OR @' ),
  }, options );
  this.status( 'completed', runId );
};
Twitter.prototype.getByGeoGrid = function*( runId, gridPoints, options, status ) {
  this.debug( 'Get tweets from %d grid points', gridPoints.length );
  options = options || {};
  var bulk = this.bulk || options.bulk || 100;
  var start = status || 0;
  var radius = this.radius || options.radius || 200;
  radius = radius/1000; // In km

  function map( idx, offset ) {
    var point = gridPoints[ idx+offset ];
    if( _.isArray( point ) ) {
      var latitude = point[ 1 ];
      var longitude = point[ 0 ];

      return this.get( {
        geocode: latitude+','+longitude+','+radius+'km',
      }, options );
    } else {
      return null;
    }
  }

  this.trace( 'Starting from %d, with step %d and radius in km: %d', start, bulk, radius );
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
Twitter.prototype.getCreationDate = function( tweet ) {
  return moment( tweet.created_at, DATE_FORMAT, 'en' ).toDate();
};

// Module initialization (at first load)

// Module exports

module.exports = Twitter;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78