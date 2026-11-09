@echo off
chcp 65001 >nul
title Ambiente de testes - Sistema Mega
echo Iniciando o ambiente de testes em http://localhost:8765/ ...
echo Deixe esta janela aberta enquanto usa. Para encerrar, feche-a.
start "" "http://localhost:8765/"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$root=(Get-Location).Path; $l=New-Object System.Net.HttpListener; $l.Prefixes.Add('http://localhost:8765/'); $l.Start();" ^
 "$m=@{'.html'='text/html; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.png'='image/png';'.jpg'='image/jpeg';'.ttf'='font/ttf';'.json'='application/json'};" ^
 "while($l.IsListening){$c=$l.GetContext();$p=[Uri]::UnescapeDataString($c.Request.Url.AbsolutePath);if($p -eq '/'){$p='/index.html'};$f=Join-Path $root ($p.TrimStart('/').Replace('/','\'));" ^
 "if((Test-Path $f -PathType Leaf) -and $f.StartsWith($root)){$b=[IO.File]::ReadAllBytes($f);$e=[IO.Path]::GetExtension($f).ToLower();if($m.ContainsKey($e)){$c.Response.ContentType=$m[$e]};$c.Response.OutputStream.Write($b,0,$b.Length)}else{$c.Response.StatusCode=404};$c.Response.Close()}"
