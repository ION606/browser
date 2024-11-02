// read input from stdin (from main process) and process it
process.stdin.on('data', async (data) => {
    try {
        // parse the request data (assumed to be in JSON format)
        const requestData = JSON.parse(data.toString());

        // create a new Request object using the parsed request data
        const request = new Request(requestData.url, {
            method: requestData.method || 'GET',
            headers: requestData.headers || {},
            body: requestData.body ? JSON.stringify(requestData.body) : undefined,
            params: requestData.params,
            query: requestData.query
        })

        // perform the fetch using Node.js native Fetch API
        const response = await fetch(request);

        // read the response as an array buffer
        const buffer = await response.arrayBuffer();

        // create response object
        const responseObject = {
            success: true,
            headers: Object.fromEntries(Array.from(response.headers)),
            mimeType: response.headers.get('Content-Type') || 'application/octet-stream',
            data: Buffer.from(buffer).toString('base64'), // encode as base64 for transmission
        }

        // write the response to stdout
        logger.info(JSON.stringify(responseObject));
    } catch (error) {
        // handle and report any errors
        const errorResponse = { success: false, error: error.message }
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
});
