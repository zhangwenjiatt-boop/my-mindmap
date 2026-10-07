Write-Host ">>> Step 1: Open login page..."
agent-browser open "http://localhost:8080/#/login"
Start-Sleep -Seconds 1

Write-Host ">>> Step 2: Snapshot login page..."
agent-browser snapshot -i

Write-Host ">>> Step 3: Fill credentials and login..."
agent-browser fill '@e7' "testuser"
agent-browser fill '@e8' "123456"
agent-browser click '@e5'

Start-Sleep -Seconds 3

Write-Host ">>> Step 4: Screenshot workspace..."
agent-browser screenshot "workspace_logged_in.png"

Write-Host ">>> Step 5: Snapshot workspace..."
agent-browser snapshot -i

Write-Host ">>> Done step 5."
