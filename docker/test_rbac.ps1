$ErrorActionPreference = 'Stop'

$authBase = 'http://localhost:8081'
$patientBase = 'http://localhost:8082'
$doctorBase = 'http://localhost:8083'
$pw = 'pass1234'

function Wait-Http($url, $timeoutSeconds = 90) {
    $start = Get-Date
    while (((Get-Date) - $start).TotalSeconds -lt $timeoutSeconds) {
        try {
            $code = & curl.exe -s -o NUL -w "%{http_code}" $url
            if ($code -ne '000') { return $code }
        } catch {
            # ignore
        }
        Start-Sleep -Seconds 2
    }
    throw "Timed out waiting for $url"
}

function New-RandomUser($prefix) {
    $suffix = (Get-Random -Minimum 1000 -Maximum 9999)
    $u = "${prefix}${suffix}"  # >= 3 chars
    $e = "${u}@example.com"
    return @{ username = $u; email = $e }
}

function Register-IfNeeded($username, $email, $role) {
    $reg = @{
        username    = $username
        email       = $email
        password    = $pw
        firstName   = 'Test'
        lastName    = 'User'
        phoneNumber = '0000000000'
        role        = $role
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Method Post -Uri "$authBase/api/auth/register" -ContentType 'application/json' -Body $reg | Out-Null
    } catch {
        # Expected if user already exists or validation fails.
        # If validation fails, login will fail too and we will stop below.
    }
}

function Login-Token($usernameOrEmail) {
    $log = @{ usernameOrEmail = $usernameOrEmail; password = $pw } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post -Uri "$authBase/api/auth/login" -ContentType 'application/json' -Body $log
    return $resp.accessToken
}

Write-Host "Waiting for services to be reachable..."
Wait-Http "$authBase/actuator/health" | Out-Null
Wait-Http "$patientBase/actuator/health" | Out-Null
Wait-Http "$doctorBase/actuator/health" | Out-Null

$p = New-RandomUser 'pat'
$d = New-RandomUser 'doc'
$a = New-RandomUser 'adm'

Register-IfNeeded $p.username $p.email 'PATIENT'
Register-IfNeeded $d.username $d.email 'DOCTOR'
Register-IfNeeded $a.username $a.email 'ADMIN'

$pToken = Login-Token $p.username
$dToken = Login-Token $d.username
$aToken = Login-Token $a.username

if ([string]::IsNullOrWhiteSpace($pToken) -or [string]::IsNullOrWhiteSpace($dToken) -or [string]::IsNullOrWhiteSpace($aToken)) {
    throw 'One or more login tokens were empty. Registration/login failed.'
}

function Get-Code($url, $token) {
    if ([string]::IsNullOrWhiteSpace($token)) {
        return (& curl.exe -s -o NUL -w "%{http_code}" $url)
    }
    return (& curl.exe -s -o NUL -w "%{http_code}" -H "Authorization: Bearer $token" $url)
}

$c1 = "$patientBase/api/admin/patients/count"
$c2 = "$doctorBase/api/doctors/pending"

Write-Host "patient-service admin count | no=$(Get-Code $c1 $null) (exp 401) patient=$(Get-Code $c1 $pToken) (exp 403) doctor=$(Get-Code $c1 $dToken) (exp 403) admin=$(Get-Code $c1 $aToken) (exp 200)"
Write-Host "doctor-service pending       | no=$(Get-Code $c2 $null) (exp 401) patient=$(Get-Code $c2 $pToken) (exp 403) doctor=$(Get-Code $c2 $dToken) (exp 403) admin=$(Get-Code $c2 $aToken) (exp 200)"
