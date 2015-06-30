'use strict';
// Load system modules
var name = process.env.social_name;
var id = process.env.social_id;

// Load modules
var co = require( 'co' );

// Load my modules
var Social = require( '../social/'+name );

// Constant declaration

// Module variables declaration
var instance;
var log;

// Module functions declaration
function sendMessage( command, data ) {
  data = data || {};
  data.cmd = command;
  data.social = name;
  data.id = id;

  process.send( data );
}
function sendLog( level ) {
  return function() {
    sendMessage( 'log', {
      log: [].slice.call( arguments ),
      level: level,
    } );
  };
}
function error( err ) {
  sendLog( 'error' )( err.stack );
  sendMessage( 'error', { error: err.stack } );
}
function mirrorEvents() {
  instance.on( 'log.trace', sendLog( 'trace' ) );
  instance.on( 'log.info', sendLog( 'info' ) );
  instance.on( 'log.debug', sendLog( 'debug' ) );
  instance.on( 'log.warn', sendLog( 'warn' ) );
  instance.on( 'log.error', sendLog( 'error' ) );
  instance.on( 'log.fatal', sendLog( 'fatal' ) );

  instance.on( 'data', function( data ) {
    sendMessage( 'data', { data: data } );
  } );
  instance.on( 'status', function( status ) {
    sendMessage( 'status', {
      status: status,
      args: [].slice.call( arguments, 1 ),
    } );
  } );
}
function setup( config ) {
  instance = new Social( config );

  log( 'Listening to the data from the instance' );
  mirrorEvents();

  // Ok, the crawler is ready now
  sendMessage( 'ready' );
}
function stop() {
  process.exit( 0 );
}
// function run( runId, type, data, options, status ) {
function run( runId, type, options, status ) {

  co( function*() {
    if( !instance ) throw new Error( 'Cannot run before setup' );

    yield instance.run( runId, type, options, status );
    /*
    if( type==='tag' ) {
      yield instance.getByTag( runId, data, options, status );
    } else if( type==='tags' ) {
      yield instance.getByTags( runId, data, options, status );
    } else if( type==='user' ) {
      yield instance.getByUser( runId, data, options, status );
    } else if( type==='users' ) {
      yield instance.getByUsers( runId, data, options, status );
    } else if( type==='geo' ) {
      yield instance.getByGeoGrid( runId, data, options, status );
    } else {
      throw new Error( 'Unsupported operation "'+type+'"' );
    }
    */
  } )
  .catch( function( err ) {
    error( err );
  } )
  ;
}



// Module initialization (at first load)
log = sendLog( 'trace' );
log( 'Social: %s', name );
log( 'ID: %s', id );

// Module exports

// Entry point


// Set process info
process.title = 'Crawler ['+id+'] '+name;
process.name = name;

// Create the instance

process.on( 'message', function( msg ) {
  if( msg.cmd==='setup' ) {
    setup( msg.config );
  } else if( msg.cmd==='teardown' ) {
    stop();
  } else if( msg.cmd==='run' ) {
    run( msg.runId, msg.type, msg.options, msg.status );
  }
} );
process.on( 'uncaughtException', function( err ) {
  error( err );
  setTimeout( function() {
    process.exit( 1 );
  }, 100 );
} );

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78