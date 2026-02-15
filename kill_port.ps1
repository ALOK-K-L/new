$port = 5000
$tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($tcp) {
    echo "Found processes using port $port"
    foreach ($conn in $tcp) {
        $pid_val = $conn.OwningProcess
        echo "Killing PID: $pid_val"
        Stop-Process -Id $pid_val -Force -ErrorAction SilentlyContinue
    }
} else {
    echo "No process found on port $port"
}
