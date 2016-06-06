#! /usr/bin/env node
'use strict';

const Database = require('./database.js');
const db = new Database(process.argv.splice(2));