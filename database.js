'use strict';

const jsonfile = require('jsonfile');
const shell = require('shelljs');
const inquirer = require('inquirer');
const extend = require('extend');

/**
 * Database constructor
 * @param {object} proc The process object
 */
function Database(args) {
	this.defaults = require('./config.json');
	this.args = args;

	// Launch 'ask' task if
	// no arguments
	if (this.args.length === 0 || this.args[0] === 'export' || this.args[0] === 'import') {
		const method = this.args.length ? this.args[0] : undefined;
		this.ask(method);
		return this;
	}

	// Update the config when the first arg is `config`
	if (this.args.length && this.args[0] === 'config') {
		const key = this.args[1];
		const value = this.args[2];
		this.config(key, value);
	}

	return this;
}



/**
 * Prompt the user for info
 * @return {undefined}
 */
Database.prototype.ask = function(method) {
	let _ = this;

	if (typeof method !== 'undefined') _.defaults.type = method;

	// Set the questions
	let prompts = [
		{
			name: 'type',
			message: 'Which operation would you like to perform?',
			type: 'list',
			required: true,
			default: _.defaults.type,
			choices: [
				{
					name: 'Export a database',
					value: 'export'
				},
				{
					name: 'Import a database',
					value: 'import'
				}
			],
			when: (data) => {
				return typeof method === 'undefined';
			}
		},
		{
			name: 'user',
			message: 'Username:',
			required: true,
			default: _.defaults.user,
			when: (data) => {
				return _.defaults.askForUser;
			}
		},
		{
			name: 'password',
			message: 'Password:',
			default : _.defaults.password,
			when: (data) => {
				return _.defaults.askForPassword
			}
		},
		{
			name: 'host',
			message: 'Host:',
			default : _.defaults.host
		},
		{
			name: 'database',
			required: true,
			message: 'Database name:',
			default: (data) => {
				return data.user;
			},
			validate: (value) => {
				return value.length ? true : 'Please, specify a database name';
			}
		},
		{
			name: 'path',
			message: 'Where is the file you want to import?',
			required: true,
			validate: (value) => {
				// If no value or if extension is not .sql
				if (!value || value.substr(-4) !== '.sql') return 'Please, specify an SQL file to import';
				// Finally, test if file exist
				const testFile = shell.exec(`ls ${value}`, { silent: true });
				if (testFile.stderr) return 'Please, verify that the filename you entered is correct or select an existing file';
				return true;
			},
			when: (data) => {
				return data.type === 'import' || method === 'import';
			},
		},
		{
			name: 'path',
			message: 'Where should the file be saved?',
			default: '~/Desktop/',
			validate: (value) => {
				// Test if folder exists
				const testDir = shell.exec(`cd ${value}`, { silent: true });
				return testDir.stderr ? 'Please, enter a valid folder path' : true;
			},
			when: (data) => {
				return data.type === 'export' || method === 'export';
			}
		}
	];

	// Start asking
	inquirer.prompt(prompts)
		.then((results) => {

			// Merge results with defaults
			results = extend(true, {}, _.defaults, results);

			// Are we importing stuff ?
			const isImport = results.type === 'import';

			// Add a filename for export
			let path = results.path;
			if (!isImport) {
				path = path.substr(-1) === '/' ? path : path + '/';
				path += results.database + '_' + getDate() + '.sql';
			}

			// Did we ask for the user ?
			// We take the default user if the
			// question has been skipped
			let user = results.user;

			// Same for the password,
			// is it in the results ?
			let password = results.password;
			let host = results.host;


			let args = [
				isImport ? 'mysql' : 'mysqldump',
				`-u ${user}`,
				password ? `-p${password}` : '',
				`-h ${host}`,
				isImport ? '' : '--single-transaction',
				results.database,
				isImport ? '<' : '>',
				path
			].join(' ');



			inquirer.prompt([{
				name: 'confirm',
				type: 'confirm',
				message: `The following command will be executed:
---------
${args}
---------
Do you confirm?`
			}]).then(function(results) {
				if (results.confirm) {
					shell.exec(`${args}`);
				} else {
					console.log('Abort.');
				}
			});
		});

	function getDate() {
		let date = new Date();
		let Y = date.getFullYear();
		let m = addLeadingZero(date.getMonth() + 1);
		let d = addLeadingZero(date.getDate());
		let H = addLeadingZero(date.getHours());
		let i = addLeadingZero(date.getMinutes());
		let s = addLeadingZero(date.getSeconds());
		return `${Y}${m}${d}-${H}${i}${s}`;
	}

	function addLeadingZero(integer) {
		return integer.toString().length === 1 ? `0${integer}` : integer;
	}
};



/**
 * Set the config for the prompts
 * @param  {string} key   The config to update
 * @param  {string|boolean} value The new value
 */
Database.prototype.config = function(key, value) {
	// Set correct booleans
	if (value === false || value === 'false') {
		this.defaults[key] = false;
	}
	else if (value === true || value === 'true') {
		this.defaults[key] = true;
	} else {
		this.defaults[key] = value;
	}

	jsonfile.writeFile('config.json', this.defaults, { spaces: 2 }, (err) => {
		if (err) {
			console.log(err);
		} else {
			console.log(`The default configuration for "${key}" is now set to "${value}"`);
		}
	});
};

// // Help
// Database.prototype.help = function() {
// 	return 'coucou help';
// };


module.exports = Database;