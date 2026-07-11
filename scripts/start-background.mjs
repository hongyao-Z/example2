import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pidFile = path.join(root, ".dev-pids.json");

function openLog(name) {
  return {
    out: fs.openSync(path.join(root, `.${name}.out.log`), "a"),
    err: fs.openSync(path.join(root, `.${name}.err.log`), "a"),
  };
}

function start(name, args) {
  const logs = openLog(name);
  const child = spawn(process.execPath, args, {
    cwd: root,
    detached: true,
    stdio: ["ignore", logs.out, logs.err],
    windowsHide: true,
    shell: false,
  });
  child.unref();
  return child.pid;
}

const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");

const pids = {
  server: start("server", [tsxCli, "watch", "server/src/index.ts"]),
  web: start("web", [viteCli, "--host", "127.0.0.1"]),
};

fs.writeFileSync(pidFile, `${JSON.stringify(pids, null, 2)}\n`, "utf8");
console.log(`后台服务已启动：${JSON.stringify(pids)}`);
