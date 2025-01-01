let currentRound = 1;
const TOTAL_ROUNDS = 5;
let scores = [];
let usedImageIds = new Set();
let map;
let guessMarker = null;
let polyline = null;
let currentImageData = null;
let actualMarker = null;
let imageOverlay = null;
let hasGuessedThisRound = false;
let historicalGuesses = [];
let historicalActuals = [];
let historicalPolylines = [];
let countdownInterval;
let remainingTime = 30000; // 30 seconds
let totalScore = 0;
let totalTime = 0
let roundTimes = [];

const roundColors = [
	'#FF0000', // Red
	'#00FF00', // Green
	'#0000FF', // Blue
	'#FF00FF', // Magenta
	'#FFA500'  // Orange
];

 function showCredits() {
	document.getElementById('credits-popup').style.display = 'flex';
}


function closeCreditsPopup() {
	document.getElementById('credits-popup').style.display = 'none';
}

function initializeMap() {
	map = L.map('map', {
		crs: L.CRS.Simple,
		minZoom: -3,
		maxZoom: 4,
		smoothWheelZoom: true, 
		smoothSensitivity: 10,
		maxBoundsViscosity: 1.0
	});

	map.addHandler('smoothWheelZoom', L.Map.SmoothWheelZoom);

	map.on('mousemove', function(e) {
		const x = Math.round(e.latlng.lng);
		const z = Math.round(e.latlng.lat);
		document.getElementById('coordinate-display').innerText = `X: ${x + (1491 + 45)}, Z: ${-z + (9047 - 88)}`;
	});

	map.on('click', function(e) {
		if (hasGuessedThisRound) return;
		
		if (guessMarker) {
			map.removeLayer(guessMarker);
		}
		if (polyline) {
			map.removeLayer(polyline);
		}
		
		guessMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
		
		const guessButton = document.getElementById('guess-button');
		guessButton.classList.remove('disabled');
		guessButton.disabled = false;
	});

	map.on('zoom', function() {
		const zoomLevel = map.getZoom();
		const imageLayer = document.querySelector('#map');
		if (imageLayer) {
			if (zoomLevel > 0) {
				imageLayer.classList.add('nearest-neighbor');
			} else {
				imageLayer.classList.remove('nearest-neighbor');
			}
		}
	});

	const img = new Image();
	img.onload = function() {
		const width = img.width;
		const height = img.height;
		
		const bounds = [
			[-height/2, -width/2],
			[height/2, width/2]
		];
		
		if (imageOverlay) {
			map.removeLayer(imageOverlay);
		}
		
		imageOverlay = L.imageOverlay('/map.png', bounds).addTo(map);
		map.setView([0, 0], 0);
		map.fitBounds(bounds);
	};
	img.src = '/map.png';

	return map;
}

function updateGameStats() {
	const totalScore = scores.reduce((sum, score) => sum + score, 0);
	document.getElementById('game-stats').innerText = 
		`Round: ${currentRound}/${TOTAL_ROUNDS} | Total Score: ${totalScore}`;
}

function showFinalScore() {
	resetMap();
	const totalScore = scores.reduce((sum, score) => sum + score, 0);
	const totalTime = roundTimes.reduce((sum, time) => sum + time, 0);

	const seconds = Math.floor(totalTime / 1000);
	const milliseconds = (totalTime % 1000).toString().padStart(3, '0');
	
	const totalMix = totalScore / (totalTime / 1000);
	
	let scoreBreakdown = scores.map((score, index) => {
		const roundTimeSeconds = Math.floor(roundTimes[index] / 1000);
		const roundTimeMilliseconds = (roundTimes[index] % 1000).toString().padStart(3, '0');
		return `Round ${index + 1}: ${score} points (${roundTimeSeconds}.${roundTimeMilliseconds} seconds)`;
	}).join('\n');

	document.getElementById('final-score-text').innerHTML = 
		`Total Score: ${totalScore} points<br>
		Total Time: ${seconds}.${milliseconds} seconds<br>
		Total Tally: ${Math.round(totalMix*100)/100}<br><br>
		${scoreBreakdown.replace(/\n/g, '<br>')}`;

	document.getElementById('final-score-overlay').style.display = 'flex';
}
/*
function resetScoreSubmition() {
	const playerNameInput = document.getElementById('player-name');
	const submitButton = document.getElementById('submit-score-button');
	const playerName = playerNameInput.value.trim();
	
	playerNameInput.disabled = false;
	submitButton.classList.remove('disabled');
	submitButton.textContent = 'Submit Score';

}

function submitFinalScore() {
	const playerNameInput = document.getElementById('player-name');
	const submitButton = document.getElementById('submit-score-button');
	const playerName = playerNameInput.value.trim();

	if (!playerName) {
		alert('Please enter your name!');
		return;
	}

	if (playerName.length < 2 || playerName.length > 20) {
		alert('Name must be between 2 and 20 characters.');
		return;
	}

	if (!/^[a-zA-Z0-9\s_-]+$/.test(playerName)) {
		alert('Name can only contain letters, numbers, spaces, underscores, and hyphens.');
		return;
	}

	if (submitButton.classList.contains('disabled')) {
		alert('Your score has already been submitted!');
		return;
	}

	const totalScore = scores.reduce((sum, score) => sum + score, 0);
	const totalTime = roundTimes.reduce((sum, time) => sum + time, 0);

	updateLeaderboard(playerName, totalScore, totalTime);

	playerNameInput.disabled = true;
	submitButton.classList.add('disabled');
	submitButton.textContent = 'Submitted';
}
*/
function startNewGame() {
	//resetScoreSubmition();
	startCountdown();
	currentRound = 1;
	totalTime = 0;
	roundTimes = [];
	hasGuessedThisRound = false;
	scores = [];
	usedImageIds.clear();

	historicalGuesses = [];
	historicalActuals = [];
	historicalPolylines = [];
	
	document.getElementById('final-score-overlay').style.display = 'none';
	
	const nextRoundButton = document.getElementById('next-round-button');
	nextRoundButton.replaceWith(nextRoundButton.cloneNode(true));
	document.getElementById('next-round-button').onclick = nextRound;
	
	resetMap();
	loadRandomImage();
	updateGameStats();
}

function resetMap() {
	if (guessMarker) map.removeLayer(guessMarker);
	if (polyline) map.removeLayer(polyline);
	if (actualMarker) map.removeLayer(actualMarker);
	
	guessMarker = null;
	polyline = null;
	actualMarker = null;

	historicalGuesses.forEach((marker, index) => {
		if (map.hasLayer(marker)) map.removeLayer(marker);
	});

	historicalActuals.forEach((marker, index) => {
		if (map.hasLayer(marker)) map.removeLayer(marker);
	});

	historicalPolylines.forEach((line, index) => {
		if (map.hasLayer(line)) map.removeLayer(line);
	});

	
	const guessButton = document.getElementById('guess-button');
	guessButton.classList.add('disabled');
	guessButton.disabled = true;
	
	document.getElementById('next-round-button').style.display = 'none';
	document.getElementById('result-display').innerText = '';
}

async function loadRandomImage() {
	try {
		const response = await fetch('base.json');
		const data = await response.json();
		
		let availableIds = Array.from({length: 91}, (_, i) => i + 1)
			.filter(id => !usedImageIds.has(id));
		
		if (availableIds.length === 0) {
			availableIds = Array.from({length: 91}, (_, i) => i + 1);
			usedImageIds.clear();
		}
		
		const randomId = availableIds[Math.floor(Math.random() * availableIds.length)];
		usedImageIds.add(randomId);
		
		currentImageData = data.find(item => item.id === randomId);
		
		if (currentImageData) {
			const imageElement = document.getElementById('randomImage');
			imageElement.src = currentImageData.path;
		}
	} catch (error) {
		console.error('Error loading image:', error);
	}
}

function guessHandler() {
	stopCountdown();

	if (!guessMarker || !currentImageData || hasGuessedThisRound) return;

	hasGuessedThisRound = true;

	const guessCoords = guessMarker.getLatLng();

	const guessX = Math.round(guessCoords.lng + (1491 + 45));
	const guessZ = Math.round(-guessCoords.lat + (9047 - 88));

	const targetX = currentImageData.coords.x;
	const targetZ = currentImageData.coords.y;

	const dx = guessX - targetX;
	const dz = guessZ - targetZ;
	const distance = Math.sqrt(dx * dx + dz * dz);

	let score;
	if (distance <= 10) {
		score = 100;
	} else {
		score = Math.max(0, Math.floor(100 - distance));
	}

	scores.push(score);

	document.getElementById('result-display').innerText =
		`Score: ${score}\nDistance: ${Math.round(distance)} blocks`;

	const mapTargetX = targetX - (1491 + 45);
	const mapTargetZ = -(targetZ - (9047 - 88));

	if (actualMarker) map.removeLayer(actualMarker);
	actualMarker = L.marker([mapTargetZ, mapTargetX], {
		icon: L.divIcon({
			className: 'actual-location-marker',
			html: '📍',
			iconSize: [20, 20],
			iconAnchor: [10, 20]
		})
	}).addTo(map);

	if (polyline) map.removeLayer(polyline);
	polyline = L.polyline([
		[guessCoords.lat, guessCoords.lng],
		[mapTargetZ, mapTargetX]
	], { color: 'red', weight: 2 }).addTo(map);

	const bounds = L.latLngBounds(
		[guessCoords, [mapTargetZ, mapTargetX]]
	);
	map.fitBounds(bounds, {
		padding: [50, 50] // Add some padding to the bounds
	});

	const guessButton = document.getElementById('guess-button');
	guessButton.classList.add('disabled');
	guessButton.disabled = true;

	updateGameStats();

	const nextRoundButton = document.getElementById('next-round-button');
	if (currentRound < TOTAL_ROUNDS) {
		nextRoundButton.style.display = 'block';
		nextRoundButton.textContent = 'Next Round';
	} else {
		nextRoundButton.style.display = 'block';
		nextRoundButton.textContent = 'Finish Game';
		nextRoundButton.onclick = showFinalScore;
	}
}


function nextRound() {
	startCountdown();
	currentRound++;
	hasGuessedThisRound = false;
	resetMap();
	loadRandomImage();
	updateGameStats();
}

document.getElementById('start-game-button').addEventListener('click', function() {
	startCountdown();
	document.getElementById('start-menu').style.display = 'none';
});

const randomImageElement = document.getElementById('randomImage');
const imagePopup = document.getElementById('image-popup');
const popupImageElement = document.getElementById('popup-image');
const popupCloseButton = document.getElementById('image-popup-close');

randomImageElement.addEventListener('click', function() {
	popupImageElement.src = randomImageElement.src;
	imagePopup.style.display = 'flex';
});

popupCloseButton.addEventListener('click', function() {
	imagePopup.style.display = 'none';
});

function startCountdown() {
	remainingTime = 30000;
	updateCountdownDisplay();

	if (countdownInterval) {
		clearInterval(countdownInterval);
	}

	const startTime = Date.now();
	countdownInterval = setInterval(() => {
		const elapsedTime = Date.now() - startTime;
		remainingTime = Math.max(0, 30000 - elapsedTime);

		updateCountdownDisplay();

		if (remainingTime <= 0) {
			clearInterval(countdownInterval);
			onCountdownEnd();
		}
	}, 10);
}

function stopCountdown() {
	totalTime += (30000 - remainingTime);
	
	if (roundTimes) {
		roundTimes.push(30000 - remainingTime);
	}

	if (countdownInterval) {
		clearInterval(countdownInterval);
	}
}

function updateCountdownDisplay() {
	const seconds = Math.floor(remainingTime / 1000);
	const milliseconds = (remainingTime % 1000).toString().padStart(3, '0');
	document.getElementById('countdown-timer').innerText = `Time Left: ${seconds}.${milliseconds}`;
}

function onCountdownEnd() {
	if (guessMarker) {
		map.removeLayer(guessMarker);
	}
	guessMarker = L.marker([0, 0]).addTo(map);
	guessHandler();
}

function setRandomBackground() {
    const totalBackgrounds = 19;
    const randomNumber = Math.floor(Math.random() * totalBackgrounds) + 1;
    const backgroundImage = `assets/background${randomNumber}.jpg`;
    
    const backgroundContainer = document.querySelector('.background-container img');
    if (backgroundContainer) {
        backgroundContainer.src = backgroundImage;
    }
}

window.onload = async function() {
	map = initializeMap();
	
	setRandomBackground();
	
	document.getElementById('start-menu').style.display = 'flex';
	
	const img = new Image();
	img.onload = function() {
		const width = img.width;
		const height = img.height;
		
		const bounds = [
			[-height/2, -width/2],
			[height/2, width/2]
		];
		
		const imageOverlay = L.imageOverlay('https://bouncingelf10.github.io/SIMPS-SMP-Geoguessr/map.png', bounds).addTo(map);
		map.setView([0, 0], 0);
		map.fitBounds(bounds);
	};
	img.src = 'https://bouncingelf10.github.io/SIMPS-SMP-Geoguessr/map.png';
	
	document.getElementById('guess-button').addEventListener('click', guessHandler);
	document.getElementById('next-round-button').addEventListener('click', nextRound);
	
	document.addEventListener('keydown', function(event) {
		if (event.code === 'Space') {
			const guessButton = document.getElementById('guess-button');
			if (!guessButton.disabled) {
				event.preventDefault();
				guessButton.click();
			}
		} else if (event.code === 'Enter') {
			const nextRoundButton = document.getElementById('next-round-button');
			if (nextRoundButton.style.display === 'block') {
				event.preventDefault();
				nextRoundButton.click();
			}
		}
	});

	await loadRandomImage();
	updateGameStats();
	updateCountdownDisplay();
};
/*
async function fetchLeaderboard() {
	try {
		const response = await fetch('leaderboard.json');
		return await response.json();
	} catch (error) {
		console.error('Error fetching leaderboard:', error);
		return [];
	}
}

async function updateLeaderboard(playerName, score, time) {
	try {
		const leaderboard = await fetchLeaderboard();
		
		const mix = score / (time / 1000);
		const date = new Date().toISOString();

		const newEntry = {
			name: playerName,
			score,
			time: `${Math.floor(time / 1000)}.${time % 1000} seconds`,
			mix: parseFloat(mix.toFixed(2)),
			date
		};
		
		if (leaderboard.length >= 1000) {
			const worstEntry = leaderboard.reduce((min, entry) => 
				parseFloat(entry.mix) < parseFloat(min.mix) ? entry : min
			);
			
			if (newEntry.mix <= parseFloat(worstEntry.mix)) {
				alert('Sorry! Your score isn\'t high enough to make it onto the leaderboard.');
				return false;
			}
			
			const worstIndex = leaderboard.findIndex(entry => 
				entry.mix === worstEntry.mix && entry.date === worstEntry.date
			);
			if (worstIndex !== -1) {
				leaderboard.splice(worstIndex, 1);
			}
		}

		leaderboard.push(newEntry);

		leaderboard.sort((a, b) => parseFloat(b.mix) - parseFloat(a.mix));
		
		const response = await fetch('http://localhost:8000/leaderboard.json', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(leaderboard),
		});

		if (!response.ok) {
			throw new Error('Failed to update leaderboard');
		}
		console.log('Leaderboard updated successfully');
		return true;
	} catch (error) {
		console.error('Error updating leaderboard:', error);
		return false;
	}
}

async function showLeaderboard() {
	try {
		const leaderboard = await fetchLeaderboard();
		console.log("Fetched leaderboard:", leaderboard);

		const sortedEntries = sortLeaderboardData(leaderboard, currentSortColumn, sortAscending)
			.slice(0, 10);
		
		console.log("Sorted entries:", sortedEntries);
			
		const leaderboardContent = document.getElementById('leaderboard-content');
		leaderboardContent.innerHTML = sortedEntries
			.map(entry => `
				<tr>
					<td>${entry.name}</td>
					<td>${entry.score}</td>
					<td>${entry.time}</td>
					<td>${entry.mix}</td>
					<td>${new Date(entry.date).toLocaleDateString()}</td>
				</tr>
			`)
			.join('');
			
		const leaderboardPopup = document.getElementById('leaderboard-popup');
		leaderboardPopup.style.display = 'flex';
		
	} catch (error) {
		console.error('Error showing leaderboard:', error);
	}
}

function sortLeaderboardData(leaderboard, column, ascending) {
	return [...leaderboard].sort((a, b) => {
		if (column === 'name') {
			return ascending
				? a.name.localeCompare(b.name)
				: b.name.localeCompare(a.name);
		} else if (column === 'date') {
			return ascending
				? new Date(a.date) - new Date(b.date)
				: new Date(b.date) - new Date(a.date);
		} else if (column === 'time') {
			const timeA = parseFloat(a.time.split(' ')[0]);
			const timeB = parseFloat(b.time.split(' ')[0]);
			return ascending ? timeA - timeB : timeB - timeA;
		} else {
			return ascending 
				? parseFloat(a[column]) - parseFloat(b[column])
				: parseFloat(b[column]) - parseFloat(a[column]);
		}
	});
}


let currentSortColumn = 'mix'; 
let sortAscending = false;

function sortLeaderboard(column) {
	fetchLeaderboard().then(leaderboard => {
		if (currentSortColumn === column) {
			sortAscending = !sortAscending;
		} else {
			currentSortColumn = column;
			sortAscending = true;
		}

		const sortedLeaderboard = leaderboard.sort((a, b) => {
			if (column === 'name') {
				return sortAscending
					? a.name.localeCompare(b.name)
					: b.name.localeCompare(a.name);
			} else if (column === 'date') {
				return sortAscending
					? new Date(a.date) - new Date(b.date)
					: new Date(b.date) - new Date(a.date);
			} else if (column === 'time') {
				const timeA = parseFloat(a.time.split(' ')[0]); 
				const timeB = parseFloat(b.time.split(' ')[0]);
				return sortAscending ? timeA - timeB : timeB - timeA;
			} else {
				return sortAscending ? a[column] - b[column] : b[column] - a[column];
			}
		});

		const top10 = sortedLeaderboard.slice(0, 10);

		const leaderboardContent = document.getElementById('leaderboard-content');
		leaderboardContent.innerHTML = top10
			.map(entry => `
				<tr>
					<td>${entry.name}</td>
					<td>${entry.score}</td>
					<td>${entry.time}</td>
					<td>${entry.mix}</td>
					<td>${new Date(entry.date).toLocaleDateString()}</td>
				</tr>
			`)
			.join('');

		updateSortIndicators(column, sortAscending);
	});
}

function updateSortIndicators(column, ascending) {
	['name', 'score', 'time', 'mix', 'date'].forEach(col => {
		document.getElementById(`sort-indicator-${col}`).textContent = '';
	});

	const indicator = ascending ? '▲' : '▼';
	document.getElementById(`sort-indicator-${column}`).textContent = indicator;
}



function closeLeaderboard() {
	document.getElementById('leaderboard-popup').style.display = 'none';
}
*/