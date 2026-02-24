import path from "node:path";
import { fileURLToPath } from "node:url";
import HtmlWebpackPlugin from "html-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    mode: "development",
    entry: "./src/index.ts",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
    devtool: "inline-source-map",
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.html",
            minify: "auto"
        })],
    devServer: {
        client: {
            overlay: false,
        },
        server: {
            type: "https",
        }
    }
    // TODO: figure out externals
};
