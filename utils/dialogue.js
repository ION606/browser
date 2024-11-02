import { dialog } from 'electron';

export async function askUserQuestion(window, title, question) {
    const response = await dialog.showMessageBox(window, {
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
        title,
        message: question,
    });
    
    return response.response === 0; // true if 'Yes' was clicked, false if 'No'
}