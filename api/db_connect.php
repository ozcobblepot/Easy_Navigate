<?php

define('DB_HOST',    '127.0.0.1');
define('DB_PORT',    '3306');
define('DB_NAME',    'easy_navigate');
define('DB_USER',    'root');
define('DB_PASS',    '');
define('DB_CHARSET', 'utf8mb4');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = 'mysql:host=' . DB_HOST
         . ';port='      . DB_PORT
         . ';dbname='    . DB_NAME
         . ';charset='   . DB_CHARSET;

    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    return $pdo;
}

// Alias so any file still calling getPdo() works too
function getPdo(): PDO {
    return getDB();
}

// Test when opened directly in browser
if (basename($_SERVER['SCRIPT_FILENAME']) === 'db_connect.php') {
    try {
        $pdo = getDB();
        echo json_encode(['ok' => true, 'message' => 'Connected to DB successfully!']);
    } catch (Exception $e) {
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
}