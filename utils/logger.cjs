const { createLogger, transports, format } = require('winston');

const logger = createLogger({
    level: 'info', // default log level
    format: format.combine(
        format.timestamp(), // include a timestamp
        format.printf((info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(), // make the console output colorful
                format.simple() // simple log format for console
            ),
        }),
        new transports.File({
            filename: 'logs/mainprocerror.log',
            level: 'error', // log only errors to this file
        }),
        new transports.File({
            filename: 'logs/combined.log', // log all levels to this file
        }),
    ],
});

module.exports = { logger };
