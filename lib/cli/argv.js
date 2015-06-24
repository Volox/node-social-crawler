'use strict';
// Load system modules
var util = require( 'util' );
var path = require( 'path' );

// Load modules
var chalk = require( 'chalk' );
var _ = require( 'lodash' );
var parse = require( '@volox/cli-argument-parser' );

// Load my modules
var help = require( './help' );
var Crawler = require( '../crawler/manager' );



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
  if( !_.isArray( socials ) ) {
    socials = [ socials ];
  }

  var socialList = socials.map( function( social, index ) {
    var out = {
      provider: social,
    };

    // Identifier
    var id = argv.id;
    if( _.isArray( id[ index ] ) ) {
      id = id[ index ];
    }
    out.id = id;

    // Keys
    var keys = argv.keys;
    if( _.isArray( keys ) ) {
      keys = keys[ index ];
    }
    out.keys = keys;

    // Tags
    if( argv.tags ) {
      var tags = argv.tags;
      if( _.isArray( tags ) ) tags = tags[ index ];
      out.tags = tags;
    }

    // Exceluded Tags
    if( argv.exclude ) {
      var exclude = argv.exclude;
      if( _.isArray( exclude ) ) exclude = exclude[ index ];
      out.exclude = exclude;
    }

    // Users
    if( argv.users ) {
      var users = argv.users;
      if( _.isArray( users ) ) users = users[ index ];
      out.users = users;
    }

    // GeoJSON files
    if( argv.geo ) {
      var geoFile = argv.geo;
      if( _.isArray( geoFile ) ) {
        geoFile = geoFile[ index ];
      }
      try {
        var gridPath = path.join( process.cwd()+'/', geoFile );
        console.log( 'Path: %s', gridPath );
        out.geojson = require( gridPath );
      } catch( err ) {
        console.error( 'Grid not available\n%s', err.stack );
      }

    }

    return out;
    /*
    {
      // id: id,
      // provider: social,
      // keys: keys,
      // tags: tags,
      // exclude: exclude,
      // users: users,
      // geojson: geo,
    };
    */
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

  if( !_.isUndefined( argv.version ) ) {
    return help.printVersion();
  }

  if( !_.isUndefined( argv.help ) ) {
    return help.printHelp();
  }

  // Default error level for logs
  argv.level = argv.level || 'error';


  var socialList = createConfiguration( argv );
  var crawler = new Crawler( socialList );
  // Enable listening to logs
  var level = levels[ argv.level ][ 0 ];
  _.each( levels, function( value, name ) {
    // Check if the level is correct
    if( level<=value[ 0 ] ) {
      crawler.on( 'log.'+name, log( name ) );
    }
  } );


  var runId;
  crawler.once( 'completed', function( id ) {
    console.log( 'Run Id %s(%s) completed', id, runId );
    console.log( 'Exiting in 1 second');
    setTimeout( function() {
      process.exit( 0 );
    }, 1000 );
  } );
  crawler.on( 'error', function( socailId, err ) {
    console.error( err );
  } );
  crawler.on( 'data', function( socialId, data ) {
    console.log( 'Got data [%s]: %s', socialId, data.id );
  } );

  // Wait for the crawler to be ready
  crawler.once( 'ready', function() {
    runId = crawler.run( 'tag', argv.tags );
  } );
}

// Module exports
module.exports = startCrawler;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78