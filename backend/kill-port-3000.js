import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function killPort3000() {
    try {
        // Find process using port 3000
        const { stdout } = await execAsync('netstat -ano | findstr :3000');
        
        if (!stdout.trim()) {
            console.log('ℹ️  No process found on port 3000');
            return;
        }

        // Extract PID from netstat output
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid)) {
                pids.add(pid);
            }
        }

        if (pids.size === 0) {
            console.log('ℹ️  No process ID found');
            return;
        }

        // Kill all processes
        for (const pid of pids) {
            try {
                await execAsync(`taskkill /PID ${pid} /F`);
                console.log(`✅ Killed process ${pid} on port 3000`);
            } catch (error) {
                console.log(`⚠️  Could not kill process ${pid}: ${error.message}`);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

killPort3000();

