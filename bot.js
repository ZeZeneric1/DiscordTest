const express = require('express');
const roblox = require('roblox-js');
const mongodb = require('mongodb').MongoClient;

var config = require('./config.json');

var data;

function update (userId) {
	return new Promise((resolve, reject) => {
		roblox.getRankInGroup(config.group, userId).then((rankId) => {
			let nextRank;
			let nextValor;
			
			if (!rankId) reject();
			
			for (let item in config.point) {
				let rank = parseInt(item);
				
				if (rankId < rank) {
					if (!nextRank) {
						nextRank = rank;
						nextValor = config.point[item];
					} else if (nextRank > rank) {
						nextRank = rank;
						nextValor = config.point[item];
					}
				}
			}
			
			getPoints(userId).then((profile) => {
				if (profile.points > nextValor) {
					roblox.setRank(config.group, userId, nextValor).then(() => {
						return resolve();
					}).catch(() => {
						return reject();
					});
				}
				resolve();
			}).catch(() => {
				reject();
			});
		});
	});
}

function createNew (userId, newPoints) {
	return new Promise((resolve, reject) => {
		data.insertOne({
			'_id': userId.toString(),
			'points': newPoints
		}, (err, res) => {
			if (err) return reject();
			resolve();
		})
	});
}

function givePoints (userId, amount) {
	return new Promise((resolve, reject) => {
		let userId = req.params.userId;
		let amount = parseInt(amount);
		
		if (!userId) return reject();
		if (isNaN(amount)) return reject();
		
		getPoints(userId).then((profile) => {
			if (!profile) {
				createNew(userId, amount);
				resolve();
			} else {
				data.updateOne({'_id': userId}, {$inc: amount}, (err, res) => {
					if (err) return reject();
					resolve();
				});
			}
		}).catch(() => {
			reject();
		});
		
		return update();
	});
}

function getPoints (userId) {
	return new Promise((resolve, reject) => {
		if (!userId) return reject();
		
		data.findOne({'_id': userId}, (err, res) => {
			if (err) return reject();
			resolve(res);
		});
	});
}

function handleGive (req, res) {
	let userId = req.params.userId;
	let amount = req.params.amount;
	let key = req.params.key;
	
	if (key !== config.key) return res.send({'denied': true});
	if (!userId) return res.send({'denied': true});
	if (!amount) return res.send({'denied': true});
	
	givePoints(userId, amount).then(() => {
		res.send({'denied': false});
	}).catch(() => {
		res.send({'denied': true});
	});
}

function handleGet (req, res) {
	let userId = req.params.userId;
	
	if (!userId) return res.send({'denied': true});
	
	getPoints(userId).then((profile) => {
		res.send({'denied': false, 'profile': profile});
	}).catch(() => {
		res.send({'denied': true});
	});
}

function init () {
	mongodb.connect(config.data.url, (err, database) => {
		data = database.db(config.data.name).collection(config.data.collection);
		
		app.get('/points/give/:userId/:amount/:key', handleGive);
		app.get('/points/get/:userId', handleGet);
		
		app.listen(process.env.PORT || 8080);
	});
}

roblox.login(config.username, config.password).then(init);