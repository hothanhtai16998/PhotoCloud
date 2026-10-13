Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$VideoPath = "C:\Users\Fenn\AppData\Local\Packages\Microsoft.ScreenSketch_8wekyb3d8bbwe\TempState\Recordings\20261013-0220-33.0492419.mp4"
$OutDir = "C:\Users\Fenn\Desktop\PhotoCloud\video_frames"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$player = New-Object System.Windows.Media.MediaPlayer
$opened = $false
$failed = $null
$player.add_MediaOpened({ $script:opened = $true })
$player.add_MediaFailed({ param($sender, $args) $script:failed = $args.ErrorException })
$player.Open([Uri]::new($VideoPath))

$deadline = [DateTime]::Now.AddSeconds(10)
while (-not $opened -and -not $failed -and [DateTime]::Now -lt $deadline) {
  [Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [Windows.Threading.DispatcherPriority]::Background)
  Start-Sleep -Milliseconds 50
}
if ($failed) { throw $failed }
if (-not $opened) { throw "Timed out opening media." }

$player.ScrubbingEnabled = $true
$width = [Math]::Max(1, $player.NaturalVideoWidth)
$height = [Math]::Max(1, $player.NaturalVideoHeight)
$duration = $player.NaturalDuration.TimeSpan.TotalSeconds
Write-Output (@{ duration = $duration; width = $width; height = $height } | ConvertTo-Json -Compress)

for ($t = 0.0; $t -le $duration + 0.001; $t += 0.25) {
  $seconds = [Math]::Min($t, $duration)
  $player.Position = [TimeSpan]::FromSeconds($seconds)
  Start-Sleep -Milliseconds 180
  [Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [Windows.Threading.DispatcherPriority]::Background)

  $drawing = New-Object System.Windows.Media.DrawingVisual
  $context = $drawing.RenderOpen()
  $rect = New-Object System.Windows.Rect(0, 0, $width, $height)
  $context.DrawVideo($player, $rect)
  $context.Close()

  $bitmap = New-Object System.Windows.Media.Imaging.RenderTargetBitmap($width, $height, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
  $bitmap.Render($drawing)
  $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
  $name = "wpf_{0:D4}_{1:N2}s.png" -f [int]([Math]::Round($seconds * 100)), $seconds
  $file = Join-Path $OutDir $name
  $stream = [System.IO.File]::Open($file, [System.IO.FileMode]::Create)
  try { $encoder.Save($stream) } finally { $stream.Close() }
  Write-Output $file
}

$player.Close()
