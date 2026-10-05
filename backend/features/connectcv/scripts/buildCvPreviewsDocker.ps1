param([string]$Container = 'connectcv-backend')
$ErrorActionPreference = 'Stop'
# Run from the host: the backend container has no frontend/public bind mount.
$taskPreviewRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../frontend/public/cv-design-previews'))
$taskPreviewVersion = (docker exec $Container node -e "console.log(require('./src/services/topcvSourceRenderer').sourceVersion())").Trim()
if ($LASTEXITCODE -ne 0 -or $taskPreviewVersion -notmatch '^topcv-[a-f0-9]{12}$') { throw 'Cannot read the native preview version' }
docker exec $Container node scripts/buildCvDesignPreviews.cjs
if ($LASTEXITCODE -ne 0) { throw 'Original preview generation failed' }
New-Item -ItemType Directory -Path $taskPreviewRoot -Force | Out-Null
docker cp "${Container}:/frontend/public/cv-design-previews/$taskPreviewVersion" $taskPreviewRoot
if ($LASTEXITCODE -ne 0) { throw 'Cannot deploy previews to the frontend' }
$taskPreviewCount = @(Get-ChildItem -LiteralPath (Join-Path $taskPreviewRoot $taskPreviewVersion) -Filter '*.png' -Recurse).Count
if ($taskPreviewCount -ne 148) { throw "Expected 148 native previews, found $taskPreviewCount" }
Write-Output "Deployed $taskPreviewCount original previews: $taskPreviewVersion"
