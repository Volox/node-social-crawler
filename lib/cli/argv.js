'use strict';
// Load system modules
var util = require( 'util' );


// Load modules
// var minimist = require( 'minimist' );
var chalk = require( 'chalk' );
var _ = require( 'lodash' );
var parse = require( '@volox/cli-argument-parser' );
var logger = require( '@volox/simple-logger' );

// Load my modules
var help = require( './help' );
var Crawler = require( '../crawler/' );



// Constant declaration
var levels = {
  fatal: [ 60, chalk.bgRed.black ],
  error: [ 50, chalk.bgBlack.red ],
  warn: [ 40, chalk.bgBlack.yellow ],
  info: [ 30, chalk.bgBlack.cyan ],
  debug: [ 20, chalk.bgBlack.green ],
  trace: [ 10, chalk.bgBlack.gray ],
};

// Module variables declaration


// Module functions declaration
function log( level ) {
  var timeStyle = chalk.bgBlack.magenta;
  var levelStyle = levels[ level ][ 1 ];

  return function() {
    var timestamp = ( new Date() ).toISOString();
    var args = Array.prototype.slice.call( arguments );

    console.log(
      '%s [%s] - %s',
      timeStyle( timestamp ),
      levelStyle( level ),
      util.format.apply( util, args )
    );
  };
}
function createConfiguration( argv ) {
  var socials = argv.s;
  if( !_.isArray( socials ) )
    socials = [ socials ];

  var socialList = socials.map( function( social, index ) {
    // Identifier
    var id = argv.id;
    if( argv.id && _.isArray( argv.id[ index ] ) )
      id = argv.id[ index ];

    // Keys
    var keys = argv.keys;
    if( argv.keys && _.isArray( argv.keys[ index ] ) )
      keys = argv.keys[ index ];

    // Tags
    var tags = argv.tags;
    if( argv.tags && _.isArray( argv.tags[ index ] ) )
      tags = argv.tags[ index ];

    // Exceluded Tags
    var exclude = argv.exclude;
    if( argv.exclude && _.isArray( argv.exclude[ index ] ) )
      exclude = argv.exclude[ index ];

    // Users
    var users = argv.users;
    if( argv.users && _.isArray( argv.users[ index ] ) )
      users = argv.users[ index ];

    // GeoJSON files
    var geo = argv.geo;
    if( argv.geo && _.isArray( argv.geo[ index ] ) )
      geo = argv.geo[ index ];

    return {
      id: id,
      provider: social,
      keys: keys,
      tags: tags,
      exclude: exclude,
      users: users,
      geojson: geo,
    };
  } );



  return socialList;
}

function startCrawler( args ) {
  var argv = parse( args, {
    mappings: {
      l: [ 'lvl', 'level' ],

      // Generic
      v: 'version',
      h: 'help',

      // Social
      i: [ 'id', 'identity' ],
      k: [ 'key', 'keys' ],
      t: [ 'tag', 'tags' ],
      e: [ 'exclude' ],
      u: [ 'user', 'users' ],
      g: [ 'geo', 'geo-json', 'geojson' ],
    }
  } );

  if( !_.isUndefined( argv.version ) )
    return help.printVersion();

  if( !_.isUndefined( argv.help ) )
    return help.printHelp();


  // Enable listening to logs
  var level = levels[ argv.level ][ 0 ];
  _.each( levels, function( value, name ) {
    // Check if the level is correct
    if( level<=value[ 0 ] ) {
      logger.on( 'log.'+name, log( name ) );
    }
  } );


  var socialList = createConfiguration( argv );
  var crawler = new Crawler( socialList );

  crawler.start();
}

// Module exports
module.exports = startCrawler;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78