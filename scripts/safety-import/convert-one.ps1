# Converts a single .ppt to .pptx. Invoked per-file by convert-ppt.ps1 so a
# hung presentation can be killed without losing the whole batch.
param([Parameter(Mandatory=$true)][string]$Src, [Parameter(Mandatory=$true)][string]$Dst)
$tmp = Join-Path $env:TEMP ("pptconv-" + [Guid]::NewGuid().ToString("N") + ".ppt")
Copy-Item $Src $tmp -Force
Unblock-File $tmp -ErrorAction SilentlyContinue
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $ppt.DisplayAlerts = 1   # ppAlertsNone
} catch {}
$pres = $ppt.Presentations.Open($tmp, $true, $false, $true)
$pres.SaveAs($Dst, 24)      # ppSaveAsOpenXMLPresentation
$pres.Close()
$ppt.Quit()
Remove-Item $tmp -Force -ErrorAction SilentlyContinue
