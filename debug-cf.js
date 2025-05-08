const { exec, spawn } = require('child_process');
const appName = process.argv[2];

if (!appName) {
    console.error('Please provide an app name as argument');
    process.exit(1);
}

console.log(`Debugging ${appName}...`);

// Function to execute the debug commands
async function enableDebug() {
    // Split the command into separate steps for better control
    const sshCommand = [
        `cf ssh ${appName} -T -c "`,
        `echo 'Searching for process...' &&`,
        `PID=\\$(ps aux | grep 'node /home/vcap/app/node_modules/.bin/cds-serve' | grep -v grep | awk '{print \\$2}') &&`,
        `if [ ! -z \\"\\$PID\\" ]; then`,
        `  echo 'Found process: '\\$PID &&`,
        `  kill -usr1 \\$PID &&`,
        `  echo 'Sent debug signal to process';`,
        `else`,
        `  echo 'Process not found';`,
        `fi"`
    ].join(' ');

    console.log('Executing SSH command...');

    // Execute the initial SSH command
    exec(sshCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error executing SSH command:', error);
            return;
        }
        
        console.log('SSH Output:', stdout);
        if (stderr) console.error('SSH Errors:', stderr);

        // Start port forwarding
        console.log('Starting port forwarding on 9229...');
        const tunnel = spawn('cf', ['ssh', '-N', '-L', '9229:127.0.0.1:9229', appName], {
            stdio: 'inherit' // This will show all output directly
        });

        tunnel.on('error', (error) => {
            console.error('Tunnel error:', error);
        });

        // Handle CTRL+C to clean up
        process.on('SIGINT', () => {
            console.log('\nClosing debug session...');
            tunnel.kill();
            process.exit();
        });
    });
}

enableDebug(); 