'use strict';
// Load system modules
var path = require( 'path' );
var util = require( 'util' );
var cluster = require( 'cluster' );

// Load modules
var _ = require( 'lodash' );
var Logger = require( '@volox/simple-logger' ).Logger;

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration
function Crawler( socialList, options ) {
  Logger.call( this, {
    objectMode: true,
  } );
  this.options = options || {};
  this.socialList = socialList || [];

  // Status var to keep track of the runs
  this.runId = 0;
  this.runIds = [];

  // Setup the cluster behaviour
  cluster.setupMaster( {
    exec: path.join( __dirname, 'crawler.js' ),
    // silent: true,
  } );

  // Configurable splitting function
  this.splitData = options.splitData || this.splitData;

  // Create an instance for each social
  this.trace( 'Creating the instances for each social' );
  this.workers = _.map( this.socialList, this.createWorker, this );

  // Wait for "this.workers.length" workers to be ready
  this.queuedWorkers = this.workers.length;
}
util.inherits( Crawler, Logger );
Crawler.prototype.getRunId = function() {
  this.runId += 1;
  return 'run_'+this.runId;
};
Crawler.prototype.getWorkerId = function( worker ) {
  return worker.social+'_'+worker.id;
};
Crawler.prototype.workerReady = function( id, social ) {
  if( !--this.queuedWorkers ) {
    this.emit( 'ready', social );
  }
};
Crawler.prototype.sendData = function( social, data ) {
  this.trace( 'Pushing [%s] %s', social, data.id );
  this.emit( 'data', social, data );
};
Crawler.prototype.sendStatus = function( social, status, args ) {
  if( status==='completed' ) {
    var runId = args[ 0 ];
    if( !--this.runIds[ runId ] ) {
      delete this.runIds[ runId ];
      this.emit( 'completed', runId );
    }
  } else {
    this.trace( 'Status update for "%s": %s', social, status );
    args.unshift( status );
    args.unshift( social );
    args.unshift( 'status' );
    this.emit.apply( this, args );
  }
};
Crawler.prototype.workerMessage = function( worker, msg ) {
  var command = msg.cmd;
  // var social = msg.social;
  // var id = worker.id;
  var socialId = this.getWorkerId( worker );

  if( command==='ready' ) {
    // Notify that a worker is ready
    this.workerReady( socialId );
  } else if( command==='data' ) {
    // Send the data
    this.sendData( socialId, msg.data );
  } else if( command==='status' ) {
    // Send the status
    this.sendStatus( socialId, msg.status, msg.args );
  } else if( command==='log' ) {
    // Mirror the logs sent from the Crawler
    msg.log[ 0 ] = '{'+socialId+'} '+msg.log[ 0 ]; // Prepend the social name
    this[ msg.level ].apply( this, msg.log );
  }
};
Crawler.prototype.workerOnline = function( worker ) {
  this.trace( 'Worker %s ready', worker.id );
};
Crawler.prototype.workerDisconnected = function( worker ) {
  this.trace( 'Worker %s disconnected', worker.id );
};
Crawler.prototype.workerExit = function( worker, code, signal ) {
  this.debug( 'Worker %s exited with code %d an signal: %s', worker.id, code, signal );
};
Crawler.prototype.workerError = function( worker, err ) {
  this.info( 'Worker %s errored:', worker.id, err );
};
Crawler.prototype.handleEvents = function( worker, config ) {
  // Set handlers to listen to worker events
  worker.on( 'online', _.bind( this.workerOnline, this, worker, config ) );
  worker.on( 'disconnected', _.bind( this.workerDisconnected, this, worker ) );
  worker.on( 'exit', _.bind( this.workerExit, this, worker ) );
  worker.on( 'error', _.bind( this.workerError, this, worker ) );
  worker.on( 'message', _.bind( this.workerMessage, this, worker ) );
};
Crawler.prototype.createWorker = function( config ) {
  this.trace( 'Forking a crawler for %s with config: ', config.provider, config );

  var env = {};
  /* eslint-disable camelcase */
  // Required
  env.social_name = config.provider;
  env.social_id = config.id;
  env.social_keys = JSON.stringify( config.keys );
  // Optional
  if( !_.isUndefined( config.bulk ) ) env.social_bulk = config.bulk;
  if( !_.isUndefined( config.paginate ) ) env.social_paginate = config.paginate;
  if( !_.isUndefined( config.breakOnLimit ) ) env.social_breakOnLimit = config.breakOnLimit;
  if( !_.isUndefined( config.MAX_PAGES ) ) env.social_MAX_PAGES = config.MAX_PAGES;
  /* eslint-enable camelcase */

  this.trace( 'Forking worker with env: %j', env );
  var worker = cluster.fork( env );

  // Set some worker properties
  worker.social = config.provider;

  // Set some properties back to the social
  config.workerId = worker.id;

  // Handle events
  this.handleEvents( worker, config );
  return worker;
};
Crawler.prototype.splitData = function( data, socials, socialId ) {
  this.trace( 'Splitting %d source data across %s socials for "%s"', data.length, socials.length, socialId );
  var workerData = data;

  // Count the number of SN
  var numSocialMap = {};
  _.each( socials, function( social ) {
    numSocialMap[ social.provider ] = numSocialMap[ social.provider ] || 0;
    numSocialMap[ social.provider ] += 1;
  } );
  this.trace( 'numSocialMap: %j', numSocialMap );

  // Split the data across the socials in case of Array
  if( _.isArray( workerData ) ) {
    var length = workerData.length;

    // Get info for the starting points of each social
    var socialInfo = {};
    _.each( numSocialMap, function( numSocials, social ) {
      socialInfo[ social ] = {
        start: 0,
        count: Math.floor( length/numSocials ),
      };
    } );
    this.trace( 'Social info: %j', socialInfo );

    // Get the data from
    var socialToDataMap = {};
    _.each( socials, function( social ) {
      var sId = social.provider+'_'+social.workerId;

      socialToDataMap[ sId ] = {
        start: socialInfo[ social.provider ].start,
        count: socialInfo[ social.provider ].count,
      };

      socialInfo[ social.provider ].start += socialInfo[ social.provider ].count;
    } );


    this.trace( 'Social data map: %j', socialToDataMap );

    var start = socialToDataMap[ socialId ].start;
    var count = socialToDataMap[ socialId ].count;
    workerData = workerData.slice( start, start+count );
  }

  return workerData;
};
Crawler.prototype.run = function( type, data, options, status ) {
  options = options || {};
  status = status || {};
  this.info( 'Starting the crawler for %d socials', this.workers.length );

  // Init runId tracking
  var runId = this.getRunId();
  this.runIds[ runId ] = this.workers.length; // Wait for all the workers to complete


  // Start each worker
  _.each( this.workers, function( worker ) {
    var socialId = this.getWorkerId( worker );
    var workerData = this.splitData( data, this.socialList, socialId );
    this.trace( 'Running "%s" with %d data from %d total', socialId, workerData.length, data.length );

    worker.send( {
      cmd: 'run',
      type: type,
      data: workerData,
      options: options,
      status: status[ socialId ],
      runId: runId, // Used to track the finished operation
    } );
  }, this );

  return runId;
};
Crawler.prototype.stop = function() {
  _.each( this.workers, function( worker ) {
    worker.send( { cmd: 'stop' } );
  } );
  // Empty the list of workers
  this.workers = [];
};

// Module initialization (at first load)


// Module exports
module.exports = Crawler;


//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78