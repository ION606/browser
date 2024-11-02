async function waitForVideo() {
	return new Promise(resolve => {
		const i = setInterval(() => {
			if (document.querySelector('video')) {
				clearInterval(i);
				resolve(true);
			}
		}, 500)
	});
}


async function revertQuality() {
	setQuality(document?.body?.dataset?.oldel || 'auto');
	delete document?.body?.dataset?.oldel;
}


async function setQuality(quality = 'lowest') {
	const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

	await waitForVideo();
	console.info(`changing quality to ${quality}`);

	const qualityMenuMain = [document.querySelector('.ytp-settings-menu'), document.querySelector('.ytp-panel-menu')],
		settingsButton = document.querySelector('.ytp-settings-button');

	qualityMenuMain.map(el => el.style.opacity = '0');
	settingsButton.click();
	await sleep(500);

	const qualityMenu = document.querySelector('.ytp-panel-menu').lastElementChild;
	qualityMenu.click();
	await sleep(500);

	const qualityOptions = [...document.querySelector('.ytp-panel.ytp-quality-menu').querySelectorAll('.ytp-menuitem')];
	let selection;

	if (quality === 'lowest') selection = qualityOptions.findLast(el => (!el.textContent.toLowerCase().includes('auto')));
	else selection = qualityOptions.find((el) => el.textContent.toLowerCase().includes(quality));

	const currentQuality = qualityOptions.find(el => el.ariaChecked);
	if (currentQuality) document.body.dataset.oldel = currentQuality.textContent.toLowerCase();

	if (!selection) {
		let qualityTexts = qualityOptions.map((el) => el.textContent).join('\n');
		console.info('"' + quality + '" not found. Options are: \n\nHighest\n' + qualityTexts + '\n' + 'setting to auto');
		settingsButton.click(); // click the menu button to close it
		selection = qualityOptions.findLast(el => (el.textContent.toLowerCase().includes('auto')));
	}

	selection.click();
	qualityMenuMain.map(el => el.style.opacity = '1');
}


function optimize() {
	sessionStorage.setItem('ran-optimize', 1);
	console.info('quality tuning script loaded!');
	// setQuality('Highest');
}

if (document.readyState === 'complete' && !sessionStorage.getItem('ran-optimize')) optimize();

