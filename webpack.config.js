const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: 'development',
    entry: './index.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    experiments: {
        outputModule: true,
    },
    resolve: {
        extensions: ['.js'],
    },
    devServer: {
        static: {
            directory: path.join(__dirname, './')
        },
        port: 8080,
        open: true
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                './index.html'
            ]
        }),
    ]
};