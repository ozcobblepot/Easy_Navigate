<?php
// api/get_profile.php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed.']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON body.']);
    exit;
}

$userId = (int)($data['id'] ?? 0);
if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'User ID is required.']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $pdo  = getDB();
    $stmt = $pdo->prepare(
        'SELECT id, first_name, last_name, email,
                phone, dob, address, nationality, passport,
                created_at
         FROM users WHERE id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'message' => 'User not found.']);
        exit;
    }

    echo json_encode(['ok' => true, 'user' => $user]);

} catch (PDOException $e) {
    error_log('get_profile.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Server error.']);
}