const fs = require("fs");
const { execSync } = require("child_process");

// Load the JSON file
const scripts = JSON.parse(fs.readFileSync("scripts/scripts.json", "utf8"));

// Get the script name and network from command line arguments
const [scriptName, network] = process.argv.slice(2);

if (!scripts.scripts[scriptName]) {
  console.error(`Script "${scriptName}" not found.`);
  process.exit(1);
}

// Construct the command
const command = `${scripts.scripts[scriptName]} ${network}`;

try {
  // Execute the command
  execSync(command, { stdio: "inherit" });
} catch (error) {
  console.error(`Error executing command: ${error.message}`);
}
