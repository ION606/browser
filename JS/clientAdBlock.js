// save the original window.open function
const originalWindowOpen = window.open;

// override the window.open function
window.open = function (url, target, features) {
    console.log('A new window is attempting to open:');
    console.log('URL:', url);
    console.log('Target:', target);
    console.log('Features:', features);

    window.electronAPI.checkperms(window.location.hostname);

    // call the original window.open function if you want the popup to proceed
    return originalWindowOpen.call(window, url, target, features);
};