#! /usr/bin/env node
'use strict';

var cli = require( '../lib/cli' );

process.title = 'Crawler';
cli.argv( process.argv.slice( 2 ) );
//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78