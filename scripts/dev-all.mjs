import { spawn } from "node:child_process";

const child = spawn("cmd.exe", ["/d", "/s", "/c", "npm.cmd run dev"], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: false,
  windowsHide: true,
});

child.stdout.on("data", (chunk) => process.stdout.write(`[应用服务] ${chunk}`));
child.stderr.on("data", (chunk) => process.stderr.write(`[应用服务] ${chunk}`));

child.on("exit", (code, signal) => {
  if (code === 0 || signal) return;
  console.error(`应用服务已退出，退出码：${code}`);
});

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

function stop() {
  child.kill();
  process.exit(0);
}
