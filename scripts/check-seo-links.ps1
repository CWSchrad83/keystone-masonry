$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$files = Get-ChildItem -Path $root -Filter *.html -File
$violations = @()

foreach ($file in $files) {
  $matches = Select-String -Path $file.FullName -Pattern 'href="index\.html(?:#.*?)?"' -AllMatches
  foreach ($match in $matches) {
    $violations += [PSCustomObject]@{
      Path = $file.FullName
      Line = $match.LineNumber
      Text = $match.Line.Trim()
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host "Found internal links pointing to index.html:"
  $violations | ForEach-Object {
    Write-Host ("{0}:{1}: {2}" -f $_.Path, $_.Line, $_.Text)
  }
  exit 1
}

Write-Host "PASS: No internal links point to index.html."
