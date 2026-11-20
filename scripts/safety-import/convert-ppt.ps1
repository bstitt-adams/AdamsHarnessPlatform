# Batch driver: converts each needs-conversion manifest entry to .pptx by
# spawning convert-one.ps1 in its own process with a hard timeout. Writes the
# manifest after every file so the batch is resume-safe.
# Run: powershell -ExecutionPolicy Bypass -File scripts/safety-import/convert-ppt.ps1
$manifestPath = "scripts/safety-import/data/manifest.json"
$convertedDir = "scripts/safety-import/data/converted"
New-Item -ItemType Directory -Force -Path $convertedDir | Out-Null
$converter = Join-Path $PSScriptRoot "convert-one.ps1"
$timeoutSec = 180

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$todo = @($manifest.entries | Where-Object { $_.status -eq "needs-conversion" })
Write-Host "Converting $($todo.Count) legacy .ppt files (timeout ${timeoutSec}s each)..."

function Save-Manifest($m) { $m | ConvertTo-Json -Depth 8 | Set-Content $manifestPath -Encoding UTF8 }
function Set-Prop($obj, $name, $value) {
    if ($obj.PSObject.Properties[$name]) { $obj.$name = $value }
    else { $obj | Add-Member -NotePropertyName $name -NotePropertyValue $value }
}

foreach ($entry in $todo) {
    $base = [IO.Path]::GetFileNameWithoutExtension($entry.sourcePath) -replace '[^\w\- ]', ''
    $dst = Join-Path (Resolve-Path $convertedDir).Path ($base + ".pptx")

    if (Test-Path $dst) {
        # Already converted in a prior run — just link it.
        Set-Prop $entry "importPath" $dst
        Set-Prop $entry "status" "pending"
        Set-Prop $entry "format" "pptx"
        Write-Host "  REUSE $($entry.title)"
        Save-Manifest $manifest
        continue
    }

    $proc = Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File","`"$converter`"","-Src","`"$($entry.sourcePath)`"","-Dst","`"$dst`"" -PassThru -WindowStyle Hidden
    try {
        Wait-Process -Id $proc.Id -Timeout $timeoutSec -ErrorAction Stop
        if ((Test-Path $dst) -and ((Get-Item $dst).Length -gt 0)) {
            Set-Prop $entry "importPath" $dst
            Set-Prop $entry "status" "pending"
            Set-Prop $entry "format" "pptx"
            Write-Host "  OK   $($entry.title)"
        } else {
            throw "converter exited without producing output"
        }
    } catch {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        Get-Process POWERPNT -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Remove-Item $dst -Force -ErrorAction SilentlyContinue
        Set-Prop $entry "status" "skipped"
        Set-Prop $entry "error" "ppt conversion failed/timed out"
        Write-Host "  FAIL $($entry.title) (timeout or crash)"
    }
    Save-Manifest $manifest
}
Write-Host "Done. Manifest updated."
