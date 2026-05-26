import { spawn } from "node:child_process"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, "..")
const varlockCli = path.join(projectRoot, "node_modules", "varlock", "bin", "cli.js")
const commandArgs = process.argv.slice(2)

if (commandArgs.length === 0) {
    console.error("No command provided to run with Varlock.")
    process.exitCode = 1
} else if (process.env.__VARLOCK_RUN === "1") {
    await run(commandArgs[0], commandArgs.slice(1))
} else {
    await run(process.execPath, [
        varlockCli,
        "run",
        "--no-inject-graph",
        "--",
        process.execPath,
        __filename,
        ...commandArgs,
    ])
}

function run(command, args) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            cwd: projectRoot,
            env: process.env,
            stdio: "inherit",
        })

        child.on("exit", (code, signal) => {
            if (signal) {
                process.kill(process.pid, signal)
                return
            }

            process.exitCode = code ?? 1
            resolve()
        })

        child.on("error", (error) => {
            console.error(error)
            process.exitCode = 1
            resolve()
        })
    })
}
