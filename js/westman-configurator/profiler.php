<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$data = [
    'ip_client' => $_SERVER['REMOTE_ADDR'] ?? null,
    'ip_forwarded' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null,
    'ip_real' => $_SERVER['HTTP_X_REAL_IP'] ?? null,
    'port' => $_SERVER['REMOTE_PORT'] ?? null,
    'host' => isset($_SERVER['REMOTE_ADDR']) ? gethostbyaddr($_SERVER['REMOTE_ADDR']) : null,
    'user_agent_raw' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    'accept_lang' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? null,
    'accept_enc' => $_SERVER['HTTP_ACCEPT_ENCODING'] ?? null,
    'method' => $_SERVER['REQUEST_METHOD'] ?? null,
    'protocol' => $_SERVER['SERVER_PROTOCOL'] ?? null,
    'https' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? true : false,
];

echo json_encode($data);
?>