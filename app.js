var request = require('request');
var cheerio = require('cheerio');

var stories = [];

var consideredOld = 8;
var notEnoughPointsPerHour = 6;

scrape();

setInterval(scrape, 63000);

function scrape(){
	request({encoding: 'utf8', url:'https://news.ycombinator.com/'}, function (error, response, body) {
		if (error || response.statusCode != 200) return console.log('error getting data from server');
		$ = cheerio.load(body);
		var tempIDs = [];
		$('tr .athing').each(function(index, elem) {
			var title = $(elem).find('td .title').find('a').text();
			var link = $(elem).find('td .title').find('a').attr('href');
			var id = $(elem).next('tr').find('.score').attr('id');
			if (id) id = id.replace('score_', '');
			var points = $(elem).next('tr').find('.score').text();
			if (points) points = points.replace(' points', '').replace(' point', '');
			var flagged = $(elem).find('td .title').find('deadmark').text();
			
			var age = $(elem).next('tr').find('.subtext').find('a');
			age.each(function(indexInner, subtextElem) {
				var subtextElemText = $(subtextElem).text();
				if (subtextElemText && subtextElemText.indexOf('hours ago') != -1) age = parseInt(subtextElemText.replace(' hours ago', ''));
				if (subtextElemText && subtextElemText.indexOf('hour ago') != -1) age = 1;
				if (subtextElemText && subtextElemText.indexOf('day ago') != -1) age = 24;
				if (subtextElemText && subtextElemText.indexOf('days ago') != -1) age = 48;
				if (!age) age = 0;
			});
			
			if (id && points) {
				tempIDs.push(id);
				
				var match = false;
				for (var i = 0; i < stories.length; i++) {
					if (stories[i].id == id) {
						match = true;
						stories[i].points = points;
					}
				}
				if (!match) {
					stories.push({
						id: id,
						title: title,
						link: link,
						points: points,
						start: new Date(),
						age: age,
						flagged: flagged,
					});
				}
			} else if (flagged) {
				console.log('Flagged', id, title, link, flagged);
			}
		});
		for (var i = 0; i < stories.length; i++) {
			var match = false;
			for (var j = 0; j < tempIDs.length; j++) {
				if (tempIDs[j] == stories[i].id) match = true;
			}
			if (!match) {
				//determine if hidden here:
				var hoursOld = Math.max((Math.abs(new Date() - stories[i].start) / 60000) / 60, stories[i].age);
				var hidden = true;
				if (hoursOld > consideredOld) hidden = false; //too old to be hidden
				if (isNaN(hoursOld)) hidden = false;
				if (stories[i].points / hoursOld < notEnoughPointsPerHour) hidden = false; //not getting enough points to stay around
				if (hidden){
					console.log('Hidden: ', stories[i].id, stories[i].title, stories[i].flagged, stories[i].points, hoursOld, stories[i].points / hoursOld);
				}
				stories.splice(i, 1);
				i--;
			}
		}
	});
}