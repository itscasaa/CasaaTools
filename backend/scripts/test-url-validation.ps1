# PowerShell script to test CasaaTools URL Validation and Security rules

$baseUrl = "http://localhost:5000/api/clone"

# Helper to run a test case
function Test-CloneUrl {
    param(
        [string]$testName,
        [Object]$body,
        [int]$expectedStatus
    )
    
    Write-Host "`n--- Test: $testName ---"
    
    $jsonBody = $body | ConvertTo-Json
    $statusCode = 0
    $responseContent = ""
    
    try {
        # Using Invoke-WebRequest with -UseBasicParsing to capture status code on failure
        $res = Invoke-WebRequest -Uri $baseUrl -Method Post -Body $jsonBody -ContentType "application/json" -ErrorAction Stop -UseBasicParsing
        $statusCode = [int]$res.StatusCode
        $responseContent = $res.Content
    } catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseContent = $reader.ReadToEnd()
    }
    
    Write-Host "Status Code: $statusCode (Expected: $expectedStatus)"
    Write-Host "Response: $responseContent"
    
    if ($statusCode -eq $expectedStatus) {
        Write-Host "RESULT: PASS" -ForegroundColor Green
    } else {
        Write-Host "RESULT: FAIL" -ForegroundColor Red
    }
}

Write-Host "Starting URL validation tests..." -ForegroundColor Cyan

# 1. Valid URLs (expect 201)
Test-CloneUrl "Valid HTTPS URL" @{ url = "https://example.com" } 201
Test-CloneUrl "Valid HTTP URL" @{ url = "http://example.com" } 201
Test-CloneUrl "Valid domain on Vercel" @{ url = "https://sugi-tools.vercel.app" } 201

# 2. Missing/Empty inputs (expect 400)
Test-CloneUrl "Missing URL" @{} 400
Test-CloneUrl "Null URL" @{ url = $null } 400
Test-CloneUrl "Empty URL" @{ url = "" } 400
Test-CloneUrl "Whitespace URL" @{ url = "   " } 400
Test-CloneUrl "Invalid type (array)" @{ url = @("https://example.com") } 400

# 3. Invalid format/protocol (expect 400)
Test-CloneUrl "Not a URL" @{ url = "not-a-url" } 400
Test-CloneUrl "FTP Protocol" @{ url = "ftp://example.com" } 400
Test-CloneUrl "File Protocol" @{ url = "file:///etc/passwd" } 400
Test-CloneUrl "Javascript Protocol" @{ url = "javascript:alert(1)" } 400
Test-CloneUrl "Data Protocol" @{ url = "data:text/html,hello" } 400

# 4. Localhost and localdomain (expect 403)
Test-CloneUrl "Localhost" @{ url = "http://localhost:3000" } 403
Test-CloneUrl "Localhost.localdomain" @{ url = "http://localhost.localdomain" } 403
Test-CloneUrl "Subdomain localhost" @{ url = "http://test.localhost" } 403

# 5. IPv4 Private/Internal IPs (expect 403)
Test-CloneUrl "IPv4 Loopback (127.0.0.1)" @{ url = "http://127.0.0.1" } 403
Test-CloneUrl "IPv4 Any interface (0.0.0.0)" @{ url = "http://0.0.0.0" } 403
Test-CloneUrl "IPv4 Private Class A (10.0.0.1)" @{ url = "http://10.0.0.1" } 403
Test-CloneUrl "IPv4 Private Class B (172.16.0.1)" @{ url = "http://172.16.0.1" } 403
Test-CloneUrl "IPv4 Private Class C (192.168.1.1)" @{ url = "http://192.168.1.1" } 403
Test-CloneUrl "IPv4 Link-local (169.254.1.1)" @{ url = "http://169.254.1.1" } 403

# 6. IPv6 Loopback/Local (expect 403)
Test-CloneUrl "IPv6 Loopback ([::1])" @{ url = "http://[::1]" } 403
Test-CloneUrl "IPv6 Unspecified ([::])" @{ url = "http://[::]" } 403

# 7. Cloud Metadata (expect 403)
Test-CloneUrl "Cloud Metadata IP" @{ url = "http://169.254.169.254" } 403
Test-CloneUrl "Cloud Metadata Google internal hostname" @{ url = "http://metadata.google.internal" } 403
