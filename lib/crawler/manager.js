'use strict';
// Load system modules
var util = require( 'util' );

// Load modules
var co = require( 'co' );
var _ = require( 'lodash' );
var Logger = require( '@volox/simple-logger' ).Logger;

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration
function Manager( socialList, options ) {
  Logger.call( this, {
    objectMode: true,
  } );
  options = options || {};
  this.socialList = socialList || [];

  // Status var to keep track of the runs
  this.runId = 0;
  this.runIds = {};

  // Configurable splitting function
  this.splitData = options.splitData || this.splitData;

  // Create an instance for each social
  this.trace( 'Creating the instances for each social' );
  this.instances = _.map( this.socialList, this.createInstance, this );

  setImmediate( function() {
    this.emit( 'ready', this.getInstanceIds() );
  }.bind( this ) );
}
util.inherits( Manager, Logger );
Manager.prototype.getRunId = function() {
  this.runId += 1;
  return 'run_'+this.runId;
};
Manager.prototype.getInstanceIds = function() {
  return this.instances.map( this.getInstanceId );
};
Manager.prototype.getInstanceId = function( instance ) {
  return instance.name+'_'+instance.id;
};
Manager.prototype.sendData = function( social, data ) {
  this.trace( 'Pushing [%s] %s', social, data.id );
  this.emit( 'data', social, data );
};
Manager.prototype.sendStatus = function( social, status, info, args ) {
  if( status==='completed' ) {
    var runId = info;
    this.debug( '"%s" completed run "%s", %d to complete', social, runId, this.runIds[ runId ] );
    this.trace( { runIds: this.runIds }, 'Run Ids before' );

    if( !--this.runIds[ runId ] ) {
      delete this.runIds[ runId ];
      this.trace( { runIds: this.runIds }, 'Run Ids after' );
      this.emit( 'completed', runId );
    }
  } else {
    this.trace( 'Status update for "%s": %s - %s', social, status, info, args );
    this.emit( 'status', social, status, info, args );
  }
};
Manager.prototype.instanceError = function( instance, err ) {
  this.info( 'Instance %s errored:', instance, err );
};
function log( instance, level ) {
  return function() {
    var sId = this.getInstanceId( instance );
    var args = _.toArray( arguments );
    if( typeof args[ 0 ] === 'string' ) {
      args.unshift( { instanceID: sId } );
    } else {
      args[ 0 ].instanceID = sId;
    }
    this[ level ].apply( this, args );
  };
}
Manager.prototype.handleLogs = function( instance ) {
  instance.on( 'log.trace', log( instance, 'trace' ).bind( this ) );
  instance.on( 'log.debug', log( instance, 'debug' ).bind( this ) );
  instance.on( 'log.info', log( instance, 'info' ).bind( this ) );
  instance.on( 'log.warn', log( instance, 'warn' ).bind( this ) );
  instance.on( 'log.error', log( instance, 'error' ).bind( this ) );
  instance.on( 'log.fatal', log( instance, 'fatal' ).bind( this ) );
};
Manager.prototype.handleEvents = function( instance ) {
  var id = this.getInstanceId( instance );
  // Set handlers to listen to instance events
  instance.on( 'error', _.bind( this.instanceError, this, id ) );
  instance.on( 'data', _.bind( this.sendData, this, id ) );
  instance.on( 'status', _.bind( this.sendStatus, this, id ) );
};
Manager.prototype.createInstance = function( config, i ) {
  var name = config.provider;
  var Social = require( '../social/'+name );
  var instance = new Social( config );

  instance.id = i;

  // Handle instance events
  this.handleEvents( instance );
  this.handleLogs( instance );

  return instance;
};
Manager.prototype.run = function( type, options, status ) {
  options = options || {};
  status = status || {};
  this.info( 'Starting the crawler for %d socials', this.instances.length );

  // Init runId tracking
  var runId = this.getRunId();
  this.runIds[ runId ] = this.instances.length; // Wait for all the instances to complete
  this.trace( { runIds: this.runIds }, 'Run ID %s, waiting for %d socials', runId, this.runIds[ runId ] );

  // Start each instance
  var mgr = this;
  co( function*() {
    var arr = [];
    for( var i=0; i<mgr.instances.length; i++ ) {
      arr.push( mgr.instances[i].run( runId, type, options, status[ i ] ) );
    }
    mgr.debug( 'Start %d parallel runs', mgr.instances.length );
    yield arr; // Start all the instances in parallel
    mgr.debug( 'Done %d parallel runs', mgr.instances.length );
  } )
  .catch( function( err ) {
    mgr.error( err, 'Run error' );
  } );

  return runId;
};

// Module initialization (at first load)


// Module exports
module.exports = Manager;


//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78