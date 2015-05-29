'use strict';
// Load system modules
var util = require( 'util' );

// Load modules
var Promise = require( 'bluebird' );
var Twit = require( 'twit' );
var log = require( '@volox/simple-logger' );
var wrap = require( '@volox/social-post-wrapper' );

// Load my modules
var Social = require( './' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function Twitter( config ) {
  Social.call( this, config );

  log.trace( 'Creating Twitter with: ', this.keys );

  var api = new Twit( {
    consumer_key: this.keys.key, // jshint ignore: line
    consumer_secret: this.keys.secret, // jshint ignore: line
    access_token: this.keys.token, // jshint ignore: line
    access_token_secret: this.keys.tokenSecret, // jshint ignore: line
  } );

  this.api = Promise.promisifyAll( api );
}
util.inherits( Twitter, Social );
Twitter.prototype.toPost = function( tweet ) {
  return wrap( tweet, 'twitter' );
};
Twitter.prototype.get = function*( data, options ) {
  options = options || {};
  data.count = options.count || 100;
  var result = yield this.api.getAsync( 'search/tweets', data );

  var meta = result[ 0 ].metadata;
  var tweets = result[ 0 ].statuses;

  var posts = this.toPosts( tweets );
  this.send( posts );
};
Twitter.prototype.getByTag = function*( tag, options ) {
  log.debug( 'Get tweets by tag "%s"', tag );
  return yield this.getByTags( [ tag ], options );
};
Twitter.prototype.getByTags = function*( tags, options ) {
  log.debug( 'Get tweets by tags "%s"', tags );
  return yield this.get( {
    q: '#'+tags.join( ' OR #' ),
  }, options );
};
Twitter.prototype.getByUser = function*( user, options ) {
  log.debug( 'Get tweets of user "%s"', user );
  return yield this.getByUsers( [ user ], options );
};
Twitter.prototype.getByUsers = function*( users, options ) {
  log.debug( 'Get tweets of users "%s"', users );
  return yield this.get( {
    q: '@'+users.join( ' OR @' ),
  }, options );
};

// Module initialization (at first load)

// Module exports

module.exports = Twitter;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78