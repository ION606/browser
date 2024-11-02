/**
 * @param { @param {Electron.BrowserWindow} window} window 
 */
export async function changeZoom(window, zoomIn = true, reset = false) {
    let zl = window.webContents.getZoomLevel();

    if (reset) zl = 0
    else if (zoomIn) zl++;
    else zl--;

    window.webContents.setZoomLevel(zl);
}