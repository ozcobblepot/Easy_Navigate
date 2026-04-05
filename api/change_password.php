<?php
// api/change_password.php

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

$userId      = (int)($data['id']           ?? 0);
$oldPassword =       $data['old_password'] ?? '';
$newPassword =       $data['new_password'] ?? '';
$confirmPw   =       $data['confirm_pw']   ?? '';

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'User ID is required.']);
    exit;
}
if ($oldPassword === '' || $newPassword === '' || $confirmPw === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'All password fields are required.']);
    exit;
}
if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'New password must be at least 8 characters.']);
    exit;
}
if ($newPassword !== $confirmPw) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'New passwords do not match.']);
    exit;
}
if ($oldPassword === $newPassword) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'New password must be different from your current password.']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $pdo  = getDB();
    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'message' => 'User not found.']);
        exit;
    }

    if (!password_verify($oldPassword, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'message' => 'Current password is incorrect.']);
        exit;
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

    $upd = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
    $upd->execute([':hash' => $newHash, ':id' => $userId]);

    echo json_encode(['ok' => true, 'message' => 'Password changed successfully.']);

} catch (PDOException $e) {
    error_log('change_password.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Server error. Please try again.']);
}