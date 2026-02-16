# Add sample songs to Firebase via Admin API

$BaseUrl = "https://data-fetch-production.up.railway.app"

Write-Host "Adding sample songs to database..." -ForegroundColor Green

# Song 1: Sarvam (Tamil)
$song1 = @{
    title = "Sarvam"
    movie = "Maya"
    artist = "Anirudh Ravichander"
    album = "Maya"
    language = "Tamil"
    moods = @("energetic", "happy")
    tags = @("dance", "party", "upbeat")
    thumbnail = "https://i.ytimg.com/vi/placeholder/default.jpg"
    duration = "3:45"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/admin/songs" -Method Post -Body $song1 -ContentType "application/json"
Write-Host "✓ Added: Sarvam" -ForegroundColor Cyan

# Song 2: Maya Maya (Tamil)
$song2 = @{
    title = "Maya Maya"
    movie = "Guru"
    artist = "A.R. Rahman"
    album = "Guru"
    language = "Tamil"
    moods = @("romantic", "calm")
    tags = @("melody", "love")
    thumbnail = "https://i.ytimg.com/vi/placeholder/default.jpg"
    duration = "4:20"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/admin/songs" -Method Post -Body $song2 -ContentType "application/json"
Write-Host "✓ Added: Maya Maya" -ForegroundColor Cyan

# Song 3: Tum Hi Ho (Hindi)
$song3 = @{
    title = "Tum Hi Ho"
    movie = "Aashiqui 2"
    artist = "Arijit Singh"
    album = "Aashiqui 2"
    language = "Hindi"
    moods = @("romantic", "sad")
    tags = @("love", "ballad", "emotional")
    thumbnail = "https://i.ytimg.com/vi/placeholder/default.jpg"
    duration = "4:22"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/admin/songs" -Method Post -Body $song3 -ContentType "application/json"
Write-Host "✓ Added: Tum Hi Ho" -ForegroundColor Cyan

# Song 4: Shape of You (English)
$song4 = @{
    title = "Shape of You"
    movie = "None"
    artist = "Ed Sheeran"
    album = "Divide"
    language = "English"
    moods = @("happy", "energetic")
    tags = @("pop", "dance")
    thumbnail = "https://i.ytimg.com/vi/placeholder/default.jpg"
    duration = "3:53"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/admin/songs" -Method Post -Body $song4 -ContentType "application/json"
Write-Host "✓ Added: Shape of You" -ForegroundColor Cyan

Write-Host "`nChecking song count..." -ForegroundColor Green
$count = Invoke-RestMethod -Uri "$BaseUrl/admin/songs/count" -Method Get
Write-Host "Total songs in database: $($count.count)" -ForegroundColor Yellow
